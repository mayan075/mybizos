import type { Context, Next } from 'hono';
import { cacheGet, cacheSet } from '../lib/redis.js';

/**
 * Redis-backed rate limiter middleware.
 * Falls back to in-memory automatically via redis.ts when Redis is unavailable.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key.
 * Returns remaining requests if allowed, or -1 if limit exceeded.
 */
async function checkLimit(key: string, maxAttempts: number, windowMs: number): Promise<number> {
  const now = Date.now();
  const raw = await cacheGet(key);

  if (raw) {
    const entry: RateLimitEntry = JSON.parse(raw);

    if (now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        return -1;
      }
      entry.count++;
      const remainingTtl = Math.ceil((entry.resetAt - now) / 1000);
      await cacheSet(key, JSON.stringify(entry), remainingTtl);
      return maxAttempts - entry.count;
    }
    // Window expired — fall through to create new entry
  }

  const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
  const ttlSeconds = Math.ceil(windowMs / 1000);
  await cacheSet(key, JSON.stringify(entry), ttlSeconds);
  return maxAttempts - 1;
}

/**
 * Rate limit by IP address (for unauthenticated routes like login).
 */
export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const route = c.req.path;
    const key = `rl:ip:${ip}:${route}`;

    const remaining = await checkLimit(key, maxAttempts, windowMs);

    if (remaining === -1) {
      c.header('X-RateLimit-Remaining', '0');
      return c.json(
        {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
          status: 429,
        },
        429,
      );
    }

    c.header('X-RateLimit-Remaining', String(remaining));
    await next();
  };
}

/**
 * Rate limit by organization ID (for authenticated org-scoped routes).
 */
export function orgRateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const orgId = c.get('orgId') as string | undefined;

    // If orgId is not set on context, skip org-level limiting
    if (!orgId) {
      await next();
      return;
    }

    const key = `rl:org:${orgId}`;

    const remaining = await checkLimit(key, maxAttempts, windowMs);

    if (remaining === -1) {
      c.header('X-Org-RateLimit-Remaining', '0');
      return c.json(
        {
          error: 'Organisation rate limit exceeded. Please try again later.',
          code: 'ORG_RATE_LIMITED',
          status: 429,
        },
        429,
      );
    }

    c.header('X-Org-RateLimit-Remaining', String(remaining));
    await next();
  };
}
