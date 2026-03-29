/**
 * GeminiLiveSession — WebSocket client for Google Gemini 3.1 Flash Live API.
 *
 * Manages a single real-time voice session: connection lifecycle, audio
 * streaming, function calling, transcription, and usage tracking.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type {
  GeminiLiveConfig,
  GeminiSessionConfig,
  GeminiServerMessage,
  GeminiSessionEvents,
  SessionUsageMetrics,
} from './types.js';
import { pcmDurationMs } from './audio-converter.js';

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const DEFAULT_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export class GeminiLiveSession extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig;
  private sessionConfig: GeminiSessionConfig;
  private model: string;
  private connected = false;
  private usage: SessionUsageMetrics;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: GeminiLiveConfig, sessionConfig: GeminiSessionConfig) {
    super();
    this.config = config;
    this.sessionConfig = sessionConfig;
    this.model = config.model ?? DEFAULT_MODEL;
    this.usage = {
      audioInputMs: 0,
      audioOutputMs: 0,
      textInputTokens: 0,
      textOutputTokens: 0,
      startedAt: new Date(),
    };
  }

  // ─── Connection ─────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const baseUrl = this.config.baseWsUrl ?? DEFAULT_WS_URL;
    const wsUrl = `${baseUrl}?key=${this.config.apiKey}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('Gemini Live session connection timed out'));
        this.ws?.close();
      }, 10_000);

      this.ws.on('open', () => {
        // Build setup message with correct Gemini Live API structure:
        // systemInstruction, tools go at setup level; audio/speech config under generationConfig
        const setup: Record<string, unknown> = {
          model: `models/${this.model}`,
          generationConfig: {
            responseModalities: this.sessionConfig.responseModalities,
            ...(this.sessionConfig.speechConfig && { speechConfig: this.sessionConfig.speechConfig }),
            ...(this.sessionConfig.realtimeInputConfig && { realtimeInputConfig: this.sessionConfig.realtimeInputConfig }),
          },
        };

        if (this.sessionConfig.systemInstruction) {
          setup.systemInstruction = this.sessionConfig.systemInstruction;
        }
        if (this.sessionConfig.tools) {
          setup.tools = this.sessionConfig.tools;
        }

        const payload = JSON.stringify({ setup });
        console.log('[GeminiSession] Sending setup:', payload.substring(0, 500));
        this.ws!.send(payload);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const raw = data.toString();
          const message = JSON.parse(raw) as GeminiServerMessage;
          // Log non-audio messages for debugging
          if (!('serverContent' in message) || !message.serverContent?.modelTurn?.parts?.some((p: Record<string, unknown>) => p.inlineData)) {
            console.log('[GeminiSession] Received:', raw.substring(0, 300));
          }
          this.handleMessage(message, () => {
            clearTimeout(timeout);
            this.connected = true;
            this.startPingInterval();
            resolve();
          });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          (this as EventEmitter).emit('error', error);
        }
      });

      this.ws.on('error', (err: Error) => {
        clearTimeout(timeout);
        (this as EventEmitter).emit('error', err);
        if (!this.connected) reject(err);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(timeout);
        this.connected = false;
        this.stopPingInterval();
        this.usage.endedAt = new Date();
        (this as EventEmitter).emit('close', code, reason.toString());
        if (!this.connected) reject(new Error(`WebSocket closed: ${code}`));
      });
    });
  }

  // ─── Sending ────────────────────────────────────────────────────────────

  /**
   * Send raw PCM 16kHz audio to Gemini.
   */
  sendAudio(pcm16kBuffer: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        audio: {
          data: pcm16kBuffer.toString('base64'),
          mimeType: 'audio/pcm;rate=16000' as const,
        },
      },
    };
    this.ws.send(JSON.stringify(message));

    // Track input audio duration
    this.usage.audioInputMs += pcmDurationMs(pcm16kBuffer, 16000);
  }

  /**
   * Send text input to Gemini (e.g. for injecting context mid-session).
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        text,
      },
    };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send function call results back to Gemini.
   */
  sendToolResponse(responses: Array<{ id: string; name: string; response: Record<string, unknown> }>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      toolResponse: {
        functionResponses: responses,
      },
    };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Gracefully close the session.
   */
  close(): void {
    this.stopPingInterval();
    this.usage.endedAt = new Date();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Session ended');
    }
    this.connected = false;
  }

  /**
   * Get accumulated usage metrics for cost calculation.
   */
  getUsage(): SessionUsageMetrics {
    return { ...this.usage };
  }

  /**
   * Check if the session is currently connected.
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Message Handling ───────────────────────────────────────────────────

  private handleMessage(message: GeminiServerMessage, onSetupComplete: () => void): void {
    // Setup complete
    if ('setupComplete' in message) {
      onSetupComplete();
      (this as EventEmitter).emit('setupComplete');
      return;
    }

    // Error
    if ('error' in message) {
      (this as EventEmitter).emit('error', new Error(
        `Gemini API error (${message.error.code}): ${message.error.message}`,
      ));
      return;
    }

    // Tool calls
    if ('toolCall' in message) {
      (this as EventEmitter).emit('toolCall', message.toolCall.functionCalls);
      return;
    }

    // Server content (audio, transcripts, turn status)
    if ('serverContent' in message) {
      const content = message.serverContent;

      // Audio data from model
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data) {
            const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
            this.usage.audioOutputMs += pcmDurationMs(audioBuffer, 24000);
            (this as EventEmitter).emit('audio', audioBuffer);
          }
        }
      }

      // Input transcription
      if (content.inputTranscription?.text) {
        (this as EventEmitter).emit('inputTranscript', content.inputTranscription.text);
      }

      // Output transcription
      if (content.outputTranscription?.text) {
        (this as EventEmitter).emit('outputTranscript', content.outputTranscription.text);
      }

      // Turn complete
      if (content.turnComplete) {
        (this as EventEmitter).emit('turnComplete');
      }

      // Interrupted (barge-in)
      if (content.interrupted) {
        (this as EventEmitter).emit('interrupted');
      }
    }
  }

  // ─── Keep-Alive ─────────────────────────────────────────────────────────

  private startPingInterval(): void {
    // Send ping every 15 seconds to keep the WebSocket alive
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 15_000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
