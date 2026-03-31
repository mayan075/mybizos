/**
 * Public demo call endpoint — no auth required.
 * Creates a server-side session that the browser connects to via
 * the WebSocket proxy at /ws/demo-live, keeping the API key server-side.
 *
 * Rate-limited by IP: 3 calls per 24 hours.
 */

import crypto from 'crypto';
import { Hono } from 'hono';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';
import { getDemoAgentPrompt } from '@hararai/ai';

const demoCallRoutes = new Hono();

// ── Demo Session Store (server-side, API key never exposed) ─────────────────

interface DemoSession {
  config: Record<string, unknown>;
  createdAt: number;
}

export const demoSessions = new Map<string, DemoSession>();

// Cleanup expired demo sessions every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, session] of demoSessions) {
    if (session.createdAt < fiveMinutesAgo) {
      demoSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

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
    if (!config.GOOGLE_AI_API_KEY) {
      logger.error('Demo session failed: GOOGLE_AI_API_KEY not configured');
      return c.json(
        { error: 'Voice demo is temporarily unavailable.', code: 'CONFIG_ERROR', status: 503 },
        503,
      );
    }

    // Build session config (stored server-side, never sent to browser)
    const sessionConfig = {
      model: `models/${config.GEMINI_LIVE_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.GEMINI_DEFAULT_VOICE },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: getDemoAgentPrompt() }],
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    // Store session server-side — browser gets only the session ID
    const sessionId = crypto.randomUUID();
    demoSessions.set(sessionId, {
      config: sessionConfig,
      createdAt: Date.now(),
    });

    // Record the call for rate limiting
    recordCall(ip);

    logger.info('Demo session created', { ip, sessionId });

    // Return WebSocket proxy URL (API key stays on server)
    // Derive WS URL from the request Host header so it works in all environments
    const host = c.req.header('host') ?? new URL(config.APP_URL).host;
    const protocol = c.req.header('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}/ws/demo-live?session=${sessionId}`;

    return c.json({
      wsUrl,
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
