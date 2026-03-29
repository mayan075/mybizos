/**
 * Twilio Media Stream WebSocket handler.
 *
 * When a PSTN call comes in and gets routed to the Gemini flow,
 * Twilio opens a WebSocket to /ws/media-stream. This handler:
 * 1. Extracts call metadata from the initial 'start' event
 * 2. Resolves the org from the called phone number
 * 3. Loads the AI agent config
 * 4. Creates a GeminiCallBridge to handle the call
 */

import type WebSocket from 'ws';
import type { IncomingMessage } from 'http';
import { eq, and } from 'drizzle-orm';
import { db, aiAgents } from '@hararai/db';
import { GeminiCallBridge } from './gemini-call-bridge.js';
import { walletService } from './wallet-service.js';
import { logger } from '../middleware/logger.js';

// Lazy import to avoid circular dependency
let resolveOrgByPhoneNumber: ((phone: string) => Promise<{ orgId: string; orgName: string } | null>) | null = null;

async function getPhoneResolver() {
  if (!resolveOrgByPhoneNumber) {
    const mod = await import('./phone-routing-service.js');
    resolveOrgByPhoneNumber = mod.resolveOrgByPhoneNumber;
  }
  return resolveOrgByPhoneNumber;
}

interface TwilioStartEvent {
  event: 'start';
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: { encoding: string; sampleRate: number; channels: number };
    customParameters: Record<string, string>;
  };
}

/**
 * Handle an incoming Twilio Media Stream WebSocket connection.
 */
export async function handleTwilioMediaStream(ws: WebSocket, _req: IncomingMessage): Promise<void> {
  logger.info('[MediaStream] New Twilio Media Stream connection');

  let bridgeStarted = false;

  // Listen for the 'start' event to get call metadata
  ws.on('message', async (data: Buffer | string) => {
    if (bridgeStarted) return; // Bridge handles subsequent messages

    try {
      const message = JSON.parse(data.toString());

      if (message.event === 'connected') {
        logger.info('[MediaStream] Twilio stream connected');
        return;
      }

      if (message.event === 'start') {
        bridgeStarted = true;
        const startEvent = message as TwilioStartEvent;
        const { callSid, customParameters } = startEvent.start;
        const callerPhone = customParameters['callerPhone'] ?? '';
        const calledNumber = customParameters['calledNumber'] ?? '';

        logger.info('[MediaStream] Starting Gemini bridge', {
          callSid,
          callerPhone,
          calledNumber,
        });

        try {
          // Resolve org from called number
          const resolver = await getPhoneResolver();
          const orgInfo = await resolver(calledNumber);

          if (!orgInfo) {
            logger.error('[MediaStream] Could not resolve org for number', { calledNumber });
            ws.close(1008, 'Unknown phone number');
            return;
          }

          const { orgId } = orgInfo;

          // Check wallet balance
          const balance = await walletService.getBalance(orgId);
          if (balance < 0.50) {
            logger.warn('[MediaStream] Insufficient wallet balance', { orgId, balance });
            ws.close(1008, 'Insufficient balance');
            return;
          }

          // Load active phone agent for this org
          const [agent] = await db
            .select()
            .from(aiAgents)
            .where(and(
              eq(aiAgents.orgId, orgId),
              eq(aiAgents.type, 'phone'),
              eq(aiAgents.isActive, true),
            ))
            .limit(1);

          if (!agent) {
            logger.error('[MediaStream] No active phone agent', { orgId });
            ws.close(1008, 'No AI agent configured');
            return;
          }

          // Extract voice from geminiConfig or use default
          const geminiConfig = (agent.geminiConfig ?? {}) as Record<string, unknown>;
          const voiceName = typeof geminiConfig['voiceName'] === 'string'
            ? geminiConfig['voiceName']
            : undefined;

          // Create and start the bridge
          const bridge = new GeminiCallBridge({
            twilioWs: ws,
            orgId,
            agentId: agent.id,
            callSid,
            callerPhone,
            systemPrompt: agent.systemPrompt,
            voiceName,
          });

          await bridge.start();
        } catch (err) {
          logger.error('[MediaStream] Failed to start bridge', {
            callSid,
            error: err instanceof Error ? err.message : String(err),
          });
          ws.close(1011, 'Bridge startup failed');
        }
      }
    } catch (err) {
      logger.error('[MediaStream] Message parse error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  ws.on('error', (err) => {
    logger.error('[MediaStream] WebSocket error', {
      error: err.message,
    });
  });
}
