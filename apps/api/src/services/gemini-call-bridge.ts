/**
 * GeminiCallBridge — Bridges Twilio Media Streams to Gemini Live API.
 *
 * For each PSTN call, this class manages two WebSocket connections:
 * 1. Twilio Media Stream → our server (mulaw 8kHz)
 * 2. Our server → Gemini Live API (PCM 16kHz in, 24kHz out)
 *
 * Audio pipeline:
 *   Twilio mulaw 8kHz → mulawToLinear16() → Gemini Live
 *   Gemini Live PCM 24kHz → linear16ToMulaw() → Twilio
 *
 * Tool calls are handled inline via executeToolCall().
 */

import type WebSocket from 'ws';
import {
  GeminiLiveSession,
  mulawToLinear16,
  linear16ToMulaw,
  buildGeminiToolsConfig,
  type GeminiLiveConfig,
  type GeminiSessionConfig,
  type SessionUsageMetrics,
} from '@hararai/integrations';
import { db, aiCallLogs, notifications } from '@hararai/db';
import { executeToolCall } from './call-tool-handler.js';
import { resolveContact } from './contact-resolution-service.js';
import { activityService } from './activity-service.js';
import { walletService } from './wallet-service.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BridgeParams {
  twilioWs: WebSocket;
  orgId: string;
  agentId: string;
  callSid: string;
  callerPhone: string;
  systemPrompt: string;
  voiceName?: string;
  streamSid?: string;
}

interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  streamSid?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: { encoding: string; sampleRate: number; channels: number };
    customParameters: Record<string, string>;
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64-encoded mulaw audio
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SESSION_WARNING_MS = 13 * 60 * 1000; // 13 minutes
const SESSION_CUTOFF_MS = 14.5 * 60 * 1000; // 14:30
const SESSION_HARD_LIMIT_MS = 16 * 60 * 1000; // 16 minutes (safety net)
const DEFAULT_AI_CALL_RATE = 0.15; // $/min charged to tenant

// ─── Active Bridges Tracking ────────────────────────────────────────────────

const activeBridges = new Map<string, GeminiCallBridge>();

export function getActiveBridgeCount(): number {
  return activeBridges.size;
}

// ─── Bridge Class ───────────────────────────────────────────────────────────

export class GeminiCallBridge {
  private twilioWs: WebSocket;
  private geminiSession: GeminiLiveSession;
  private orgId: string;
  private agentId: string;
  private callSid: string;
  private callerPhone: string;
  private streamSid: string | null = null;

  private inputTranscript: string[] = [];
  private outputTranscript: string[] = [];
  private startedAt = new Date();
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private cutoffTimer: ReturnType<typeof setTimeout> | null = null;
  private hardLimitTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(params: BridgeParams) {
    this.twilioWs = params.twilioWs;
    this.orgId = params.orgId;
    this.agentId = params.agentId;
    this.callSid = params.callSid;
    this.callerPhone = params.callerPhone;
    this.streamSid = params.streamSid ?? null;

    // Build Gemini session config
    const geminiConfig: GeminiLiveConfig = {
      apiKey: config.GOOGLE_AI_API_KEY,
      model: config.GEMINI_LIVE_MODEL,
    };

    const sessionConfig: GeminiSessionConfig = {
      responseModalities: ['AUDIO'],
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      tools: buildGeminiToolsConfig(),
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: params.voiceName ?? config.GEMINI_DEFAULT_VOICE,
          },
        },
      },
    };

    this.geminiSession = new GeminiLiveSession(geminiConfig, sessionConfig);
  }

  /**
   * Start the bridge: connect to Gemini, wire up Twilio ↔ Gemini audio.
   */
  async start(): Promise<void> {
    activeBridges.set(this.callSid, this);

    try {
      // Connect to Gemini Live API
      await this.geminiSession.connect();
      logger.info('[GeminiBridge] Connected to Gemini Live', {
        orgId: this.orgId,
        callSid: this.callSid,
      });

      // Wire up event handlers
      this.setupGeminiHandlers();
      this.setupTwilioHandlers();
      this.setupTimers();

      // Send initial text to prompt Gemini to start speaking its greeting
      this.geminiSession.sendText('A new caller has connected. Please greet them now.');
    } catch (err) {
      logger.error('[GeminiBridge] Failed to start bridge', {
        orgId: this.orgId,
        callSid: this.callSid,
        error: err instanceof Error ? err.message : String(err),
      });
      this.cleanup();
      throw err;
    }
  }

  // ─── Gemini Event Handlers ────────────────────────────────────────────

  private setupGeminiHandlers(): void {
    // Audio from Gemini → convert → send to Twilio
    this.geminiSession.on('audio', (pcm24kBuffer: Buffer) => {
      if (this.closed || !this.streamSid) return;

      try {
        const mulawBuffer = linear16ToMulaw(pcm24kBuffer);
        const message = JSON.stringify({
          event: 'media',
          streamSid: this.streamSid,
          media: {
            payload: mulawBuffer.toString('base64'),
          },
        });
        this.twilioWs.send(message);
      } catch (err) {
        logger.error('[GeminiBridge] Audio conversion error (Gemini→Twilio)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    // Tool calls from Gemini → execute → return result
    this.geminiSession.on('toolCall', async (calls) => {
      const responses = [];
      for (const call of calls) {
        try {
          const result = await executeToolCall(
            { orgId: this.orgId, callerPhone: this.callerPhone, agentId: this.agentId },
            call.name,
            call.args,
          );
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: result.result },
          });
        } catch (err) {
          logger.error('[GeminiBridge] Tool call failed', {
            tool: call.name,
            error: err instanceof Error ? err.message : String(err),
          });
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: "I'm sorry, I encountered an issue. Let me transfer you to a team member." },
          });
        }
      }
      this.geminiSession.sendToolResponse(responses);
    });

    // Transcription
    this.geminiSession.on('inputTranscript', (text) => {
      this.inputTranscript.push(text);
    });

    this.geminiSession.on('outputTranscript', (text) => {
      this.outputTranscript.push(text);
    });

    // Error handling
    this.geminiSession.on('error', (err) => {
      logger.error('[GeminiBridge] Gemini session error', {
        orgId: this.orgId,
        callSid: this.callSid,
        error: err.message,
      });
    });

    // Session closed
    this.geminiSession.on('close', (code, reason) => {
      logger.info('[GeminiBridge] Gemini session closed', {
        callSid: this.callSid,
        closeCode: code,
        closeReason: reason,
      });
      this.endCall();
    });
  }

  // ─── Twilio Event Handlers ────────────────────────────────────────────

  private setupTwilioHandlers(): void {
    this.twilioWs.on('message', (data: Buffer | string) => {
      if (this.closed) return;

      try {
        const message = JSON.parse(data.toString()) as TwilioMediaMessage;

        switch (message.event) {
          case 'start':
            this.streamSid = message.start?.streamSid ?? null;
            logger.info('[GeminiBridge] Twilio stream started', {
              streamSid: this.streamSid,
              callSid: this.callSid,
            });
            break;

          case 'media':
            if (message.media?.payload) {
              // Decode base64 mulaw → convert to PCM 16kHz → send to Gemini
              const mulawBuffer = Buffer.from(message.media.payload, 'base64');
              const pcm16kBuffer = mulawToLinear16(mulawBuffer);
              this.geminiSession.sendAudio(pcm16kBuffer);
            }
            break;

          case 'stop':
            logger.info('[GeminiBridge] Twilio stream stopped', {
              callSid: this.callSid,
            });
            this.endCall();
            break;
        }
      } catch (err) {
        logger.error('[GeminiBridge] Twilio message parse error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    this.twilioWs.on('close', () => {
      logger.info('[GeminiBridge] Twilio WebSocket closed', {
        callSid: this.callSid,
      });
      this.endCall();
    });

    this.twilioWs.on('error', (err) => {
      logger.error('[GeminiBridge] Twilio WebSocket error', {
        callSid: this.callSid,
        error: err.message,
      });
    });
  }

  // ─── Session Timers ───────────────────────────────────────────────────

  private setupTimers(): void {
    // 13-minute warning
    this.warningTimer = setTimeout(() => {
      logger.info('[GeminiBridge] Session approaching limit, sending wrap-up', {
        callSid: this.callSid,
      });
      this.geminiSession.sendText(
        'You have approximately 2 minutes remaining in this call. Please begin wrapping up the conversation naturally.',
      );
    }, SESSION_WARNING_MS);

    // 14:30 auto-transfer
    this.cutoffTimer = setTimeout(async () => {
      logger.info('[GeminiBridge] Session cutoff, auto-transferring', {
        callSid: this.callSid,
      });
      try {
        await executeToolCall(
          { orgId: this.orgId, callerPhone: this.callerPhone, agentId: this.agentId },
          'transfer_to_human',
          { reason: 'complex_issue', summary: 'Session time limit reached. Transferring to human.' },
        );
      } catch {
        // Best effort
      }
      this.endCall();
    }, SESSION_CUTOFF_MS);

    // 16-minute hard kill (safety net)
    this.hardLimitTimer = setTimeout(() => {
      logger.warn('[GeminiBridge] Hard session limit reached, force closing', {
        callSid: this.callSid,
      });
      this.endCall();
    }, SESSION_HARD_LIMIT_MS);
  }

  // ─── Call End & Cleanup ───────────────────────────────────────────────

  private async endCall(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    // Clear timers
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.cutoffTimer) clearTimeout(this.cutoffTimer);
    if (this.hardLimitTimer) clearTimeout(this.hardLimitTimer);

    // Close connections
    this.geminiSession.close();

    const usage = this.geminiSession.getUsage();
    const durationSeconds = Math.ceil((Date.now() - this.startedAt.getTime()) / 1000);

    // Build combined transcript
    const transcript = this.buildTranscript();
    const summary = this.outputTranscript.slice(0, 3).join(' ').slice(0, 500) || 'AI phone call';

    // Determine outcome from transcript
    const outcome = this.determineOutcome(transcript);

    // Resolve contact
    let contactId: string | null = null;
    if (this.callerPhone) {
      try {
        const contact = await resolveContact(this.orgId, this.callerPhone, 'phone');
        contactId = contact.id;
      } catch (err) {
        logger.error('[GeminiBridge] Failed to resolve contact', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Log the call
    try {
      await db.insert(aiCallLogs).values({
        orgId: this.orgId,
        agentId: this.agentId,
        contactId,
        twilioCallSid: this.callSid,
        direction: 'inbound',
        durationSeconds,
        transcript,
        summary,
        sentiment: null,
        outcome,
        provider: 'gemini',
        audioDurationInMs: Math.round(usage.audioInputMs),
        audioDurationOutMs: Math.round(usage.audioOutputMs),
        textTokensIn: usage.textInputTokens,
        textTokensOut: usage.textOutputTokens,
        actualCost: String(this.calculateActualCost(usage)),
      });
    } catch (err) {
      logger.error('[GeminiBridge] Failed to log call', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Debit wallet (fire-and-forget)
    try {
      const callCost = (durationSeconds / 60) * DEFAULT_AI_CALL_RATE;
      if (callCost > 0) {
        await walletService.debit(this.orgId, {
          amount: callCost,
          category: 'ai_call',
          description: `AI call (${Math.ceil(durationSeconds / 60)} min) [Gemini]`,
          relatedResourceId: this.callSid,
        });
      }
    } catch (err) {
      logger.warn('[GeminiBridge] Failed to debit wallet', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Log activity
    if (contactId) {
      activityService.logActivity(this.orgId, {
        contactId,
        type: 'ai_interaction',
        title: `AI phone call (${Math.ceil(durationSeconds / 60)} min)`,
        description: summary,
        metadata: { callSid: this.callSid, outcome, provider: 'gemini' },
      }).catch(err => {
        logger.error('[GeminiBridge] Failed to log activity', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    // Lead scoring (background)
    if (contactId) {
      import('./lead-scoring-service.js').then(({ leadScoringService }) => {
        leadScoringService.scoreContactInBackground(this.orgId, contactId);
      }).catch(() => {});
    }

    // Notification
    db.insert(notifications).values({
      orgId: this.orgId,
      title: outcome === 'booked'
        ? 'AI booked an appointment from call'
        : `AI handled inbound call (${outcome})`,
      description: `${summary}. Duration: ${Math.ceil(durationSeconds / 60)} min.`,
      type: 'call',
      metadata: { callSid: this.callSid, outcome, contactId, provider: 'gemini' },
    }).catch(() => {});

    this.cleanup();
  }

  private cleanup(): void {
    activeBridges.delete(this.callSid);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private buildTranscript(): string {
    const lines: string[] = [];
    const maxLen = Math.max(this.inputTranscript.length, this.outputTranscript.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < this.inputTranscript.length && this.inputTranscript[i]) {
        lines.push(`Customer: ${this.inputTranscript[i]}`);
      }
      if (i < this.outputTranscript.length && this.outputTranscript[i]) {
        lines.push(`Agent: ${this.outputTranscript[i]}`);
      }
    }
    return lines.join('\n');
  }

  private determineOutcome(transcript: string): 'booked' | 'qualified' | 'escalated' | 'spam' | 'voicemail' {
    const lower = transcript.toLowerCase();
    if (lower.includes('appointment booked') || lower.includes('booked successfully')) return 'booked';
    if (lower.includes('transfer') || lower.includes('team member')) return 'escalated';
    return 'qualified';
  }

  private calculateActualCost(usage: SessionUsageMetrics): number {
    const audioInCost = (usage.audioInputMs / 60000) * 0.005;
    const audioOutCost = (usage.audioOutputMs / 60000) * 0.018;
    const textInCost = (usage.textInputTokens / 1_000_000) * 0.75;
    const textOutCost = (usage.textOutputTokens / 1_000_000) * 4.50;
    return audioInCost + audioOutCost + textInCost + textOutCost;
  }
}
