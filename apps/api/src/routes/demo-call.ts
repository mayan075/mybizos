/**
 * Public demo call endpoint — no auth required.
 * Generates an ephemeral Gemini Live token for the landing page voice widget.
 *
 * Rate-limited by IP: 3 calls per 24 hours.
 */

import { Hono } from 'hono';
import { generateEphemeralToken, buildEphemeralWsUrl } from '@hararai/integrations';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';
import { getDemoAgentPrompt } from '@hararai/ai/prompts/demo-agent-prompt';

const demoCallRoutes = new Hono();

// ── IP Rate Limiting (in-memory) ─────────────────────────────────────────────

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CALL_DURATION_MS = 120_000; // 2 minutes

const ipCallTimestamps = new Map<string, number[]>();

// Cleanup stale entries every hour
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of ipCallTimestamps.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      ipCallTimestamps.delete(ip);
    } else {
      ipCallTimestamps.set(ip, valid);
    }
  }
}, 60 * 60 * 1000);

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (ipCallTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  ipCallTimestamps.set(ip, timestamps);
  return timestamps.length < RATE_LIMIT_MAX;
}

function recordCall(ip: string): void {
  const timestamps = ipCallTimestamps.get(ip) ?? [];
  timestamps.push(Date.now());
  ipCallTimestamps.set(ip, timestamps);
}

// ── POST /demo/session ───────────────────────────────────────────────────────

demoCallRoutes.post('/session', async (c) => {
  const ip = getClientIp(c);

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return c.json(
      {
        error: "You've reached the demo limit for today. Sign up for unlimited calls!",
        code: 'RATE_LIMITED',
        status: 429,
      },
      429,
    );
  }

  try {
    // Generate ephemeral token (server API key never exposed to client)
    const { token, expiresAt } = await generateEphemeralToken(config.GOOGLE_AI_API_KEY);

    // Build session config for the browser
    const sessionConfig = {
      model: `models/${config.GEMINI_LIVE_MODEL}`,
      responseModalities: ['AUDIO'],
      systemInstruction: {
        parts: [{ text: getDemoAgentPrompt() }],
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: config.GEMINI_DEFAULT_VOICE },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      generationConfig: {
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    };

    // Record the call for rate limiting
    recordCall(ip);

    logger.info('Demo session created', { ip, expiresAt: new Date(expiresAt).toISOString() });

    return c.json({
      token,
      expiresAt,
      wsUrl: buildEphemeralWsUrl(token),
      sessionConfig,
      maxDurationMs: MAX_CALL_DURATION_MS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create demo session';
    logger.error('Demo session error', { ip, error: message });
    return c.json(
      { error: 'Unable to start demo call. Please try again.', code: 'INTERNAL_ERROR', status: 500 },
      500,
    );
  }
});

export { demoCallRoutes };
