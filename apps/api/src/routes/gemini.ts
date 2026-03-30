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

// ─── Test Session (Browser Dev Testing) ─────────────────────────────────────

// In-memory rate limiter: orgId -> list of timestamps
const testSessionRateLimiter = new Map<string, number[]>();

// Clear stale entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [orgId, timestamps] of testSessionRateLimiter.entries()) {
    const recent = timestamps.filter((t) => t > oneHourAgo);
    if (recent.length === 0) {
      testSessionRateLimiter.delete(orgId);
    } else {
      testSessionRateLimiter.set(orgId, recent);
    }
  }
}, 60 * 60 * 1000);

const testSessionSchema = z.object({
  systemPrompt: z.string().min(1),
  voiceName: z.string().optional(),
});

geminiRoutes.post('/test-session', async (c) => {
  const orgId = c.get('orgId') as string;

  let body: z.infer<typeof testSessionSchema>;
  try {
    body = testSessionSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'systemPrompt is required', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  // Rate limit: max 10 test calls per org per hour
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = (testSessionRateLimiter.get(orgId) ?? []).filter((t) => t > oneHourAgo);
  if (timestamps.length >= 10) {
    return c.json({
      error: 'Rate limit exceeded. Maximum 10 test calls per hour.',
      code: 'RATE_LIMITED',
      status: 429,
    }, 429);
  }
  testSessionRateLimiter.set(orgId, [...timestamps, now]);

  // Generate ephemeral token — does NOT debit wallet
  const { token, expiresAt } = await generateEphemeralToken(config.GOOGLE_AI_API_KEY);

  const voiceName = body.voiceName ?? config.GEMINI_DEFAULT_VOICE;

  return c.json({
    data: {
      token,
      expiresAt,
      wsUrl: buildEphemeralWsUrl(token),
      config: {
        model: `models/${config.GEMINI_LIVE_MODEL}`,
        systemPrompt: body.systemPrompt,
        voiceName,
      },
    },
  });
});

// ─── Voice Sample (cached TTS preview) ────────────────────────────────────

import { cacheGet, cacheSet } from '../lib/redis.js';

const SAMPLE_TEXT = 'Hello! I\'m your AI assistant. How can I help you today?';
const SAMPLE_CACHE_TTL = 60 * 60 * 24; // 24 hours

/** Wrap raw PCM 16-bit LE samples in a WAV header so browsers can play it. */
function pcmToWav(pcmBase64: string, sampleRate: number): Buffer {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const wav = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);

  // fmt chunk
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);           // chunk size
  wav.writeUInt16LE(1, 20);            // PCM format
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, headerSize);

  return wav;
}

const voiceSampleSchema = z.object({
  voiceName: z.string().min(1),
});

geminiRoutes.get('/voice-sample', async (c) => {
  const voiceName = c.req.query('voiceName');
  if (!voiceName) {
    return c.json({ error: 'voiceName query parameter required', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  const parsed = voiceSampleSchema.safeParse({ voiceName });
  if (!parsed.success) {
    return c.json({ error: 'Invalid voiceName', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  const cacheKey = `voice-sample:${parsed.data.voiceName}`;

  // Check cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return c.json({ audio: cached, mimeType: 'audio/wav' });
  }

  // Generate via Gemini REST API (generateContent with audio response)
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_TTS_MODEL}:generateContent?key=${config.GOOGLE_AI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: SAMPLE_TEXT }],
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: parsed.data.voiceName },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown');
      logger.error('[Gemini] Voice sample generation failed', { voiceName: parsed.data.voiceName, status: response.status, error: errorBody });
      return c.json({ error: 'Failed to generate voice sample', code: 'UPSTREAM_ERROR', status: 502 }, 502);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType: string; data: string } }>;
        };
      }>;
    };

    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      return c.json({ error: 'No audio in response', code: 'UPSTREAM_ERROR', status: 502 }, 502);
    }

    // Gemini TTS returns raw PCM (audio/L16;rate=24000) — wrap in WAV header
    const sampleRate = inlineData.mimeType?.includes('rate=')
      ? Number(inlineData.mimeType.split('rate=')[1])
      : 24000;
    const wavBuffer = pcmToWav(inlineData.data, sampleRate);
    const wavBase64 = wavBuffer.toString('base64');

    // Cache the WAV for 24 hours
    await cacheSet(cacheKey, wavBase64, SAMPLE_CACHE_TTL);

    return c.json({ audio: wavBase64, mimeType: 'audio/wav' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Gemini] Voice sample error', { error: message });
    return c.json({ error: 'Voice sample generation failed', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

export { geminiRoutes };
