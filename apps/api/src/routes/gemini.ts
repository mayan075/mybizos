/**
 * Gemini Live API routes for browser-side voice calls.
 *
 * - POST /session-token  — generate ephemeral token for browser WS connection
 * - POST /tool-call      — execute tool during browser-initiated call
 * - POST /call-ended     — log call + debit wallet after browser call ends
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, aiAgents, aiCallLogs, notifications } from '@hararai/db';
import { generateEphemeralToken, buildEphemeralWsUrl, buildGeminiToolsConfig } from '@hararai/integrations';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { executeToolCall } from '../services/call-tool-handler.js';
import { walletService } from '../services/wallet-service.js';
import { resolveContact } from '../services/contact-resolution-service.js';
import { activityService } from '../services/activity-service.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

const geminiRoutes = new Hono();

// All routes require auth + org scope
geminiRoutes.use('*', authMiddleware);
geminiRoutes.use('*', orgScopeMiddleware);

// ─── Session Token ──────────────────────────────────────────────────────────

const sessionTokenSchema = z.object({
  agentId: z.string().uuid(),
});

geminiRoutes.post('/session-token', async (c) => {
  const orgId = c.get('orgId') as string;
  const body = sessionTokenSchema.parse(await c.req.json());

  // Verify agent belongs to org
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(
      eq(aiAgents.id, body.agentId),
      eq(aiAgents.orgId, orgId),
      eq(aiAgents.isActive, true),
    ))
    .limit(1);

  if (!agent) {
    return c.json({ error: 'Agent not found', code: 'NOT_FOUND', status: 404 }, 404);
  }

  // Check wallet balance
  const balance = await walletService.getBalance(orgId);
  if (balance < 0.50) {
    return c.json({
      error: 'Insufficient wallet balance. Please top up to make calls.',
      code: 'INSUFFICIENT_BALANCE',
      status: 402,
    }, 402);
  }

  // Generate ephemeral token
  const { token, expiresAt } = await generateEphemeralToken(config.GOOGLE_AI_API_KEY);

  // Build session config for the browser
  const geminiConfig = (agent.geminiConfig ?? {}) as Record<string, unknown>;
  const voiceName = typeof geminiConfig['voiceName'] === 'string'
    ? geminiConfig['voiceName']
    : config.GEMINI_DEFAULT_VOICE;

  const sessionConfig = {
    model: `models/${config.GEMINI_LIVE_MODEL}`,
    responseModalities: ['AUDIO'],
    systemInstruction: {
      parts: [{ text: agent.systemPrompt }],
    },
    tools: buildGeminiToolsConfig(),
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    generationConfig: {
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
    },
  };

  return c.json({
    token,
    expiresAt,
    wsUrl: buildEphemeralWsUrl(token),
    sessionConfig,
    agentId: agent.id,
  });
});

// ─── Tool Call (Browser) ────────────────────────────────────────────────────

const toolCallSchema = z.object({
  toolName: z.string(),
  args: z.record(z.unknown()),
  agentId: z.string().uuid(),
  callerPhone: z.string().default(''),
});

geminiRoutes.post('/tool-call', async (c) => {
  const orgId = c.get('orgId') as string;
  const body = toolCallSchema.parse(await c.req.json());

  try {
    const result = await executeToolCall(
      { orgId, callerPhone: body.callerPhone, agentId: body.agentId },
      body.toolName,
      body.args,
    );
    return c.json({ result: result.result, sideEffects: result.sideEffects });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Gemini] Browser tool call failed', { toolName: body.toolName, error: message });
    return c.json({
      result: "I'm sorry, I encountered an issue processing that request.",
      error: message,
    });
  }
});

// ─── Call Ended (Browser) ───────────────────────────────────────────────────

const callEndedSchema = z.object({
  agentId: z.string().uuid(),
  callerPhone: z.string().default(''),
  durationSeconds: z.number().min(0),
  transcript: z.string().default(''),
  summary: z.string().default(''),
  outcome: z.enum(['booked', 'qualified', 'escalated', 'spam', 'voicemail']).default('qualified'),
  audioDurationInMs: z.number().default(0),
  audioDurationOutMs: z.number().default(0),
  textTokensIn: z.number().default(0),
  textTokensOut: z.number().default(0),
});

geminiRoutes.post('/call-ended', async (c) => {
  const orgId = c.get('orgId') as string;
  const body = callEndedSchema.parse(await c.req.json());

  // Resolve contact
  let contactId: string | null = null;
  if (body.callerPhone) {
    try {
      const contact = await resolveContact(orgId, body.callerPhone, 'phone');
      contactId = contact.id;
    } catch {
      // Non-critical
    }
  }

  // Calculate actual Gemini cost
  const actualCost =
    (body.audioDurationInMs / 60000) * 0.005 +
    (body.audioDurationOutMs / 60000) * 0.018 +
    (body.textTokensIn / 1_000_000) * 0.75 +
    (body.textTokensOut / 1_000_000) * 4.50;

  // Log call
  try {
    await db.insert(aiCallLogs).values({
      orgId,
      agentId: body.agentId,
      contactId,
      direction: 'inbound',
      durationSeconds: Math.ceil(body.durationSeconds),
      transcript: body.transcript || null,
      summary: body.summary || null,
      sentiment: null,
      outcome: body.outcome,
      provider: 'gemini',
      audioDurationInMs: Math.round(body.audioDurationInMs),
      audioDurationOutMs: Math.round(body.audioDurationOutMs),
      textTokensIn: body.textTokensIn,
      textTokensOut: body.textTokensOut,
      actualCost: actualCost.toFixed(4),
    });
  } catch (err) {
    logger.error('[Gemini] Failed to log browser call', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Debit wallet (fire-and-forget)
  const DEFAULT_AI_CALL_RATE = 0.15;
  const billedAmount = (body.durationSeconds / 60) * DEFAULT_AI_CALL_RATE;
  if (billedAmount > 0) {
    walletService.debit(orgId, {
      amount: billedAmount,
      category: 'ai_call',
      description: `AI call (${Math.ceil(body.durationSeconds / 60)} min) [Gemini browser]`,
    }).catch(err => {
      logger.warn('[Gemini] Failed to debit wallet for browser call', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Activity + notification
  if (contactId) {
    activityService.logActivity(orgId, {
      contactId,
      type: 'ai_interaction',
      title: `AI call (${Math.ceil(body.durationSeconds / 60)} min)`,
      description: body.summary,
      metadata: { outcome: body.outcome, provider: 'gemini' },
    }).catch(() => {});
  }

  db.insert(notifications).values({
    orgId,
    title: body.outcome === 'booked'
      ? 'AI booked appointment from browser call'
      : `AI handled browser call (${body.outcome})`,
    description: body.summary || `Duration: ${Math.ceil(body.durationSeconds / 60)} min`,
    type: 'call',
    metadata: { outcome: body.outcome, contactId, provider: 'gemini' },
  }).catch(() => {});

  return c.json({ received: true, actualCost: Number(actualCost.toFixed(4)) });
});

export { geminiRoutes };
