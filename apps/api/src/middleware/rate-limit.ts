import type { Context, Next } from 'hono';

/**
 * Simple in-memory rate limiter middleware.
 * Limits requests per IP address within a sliding time window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const route = c.req.path;
    const key = `${ip}:${route}`;
    const now = Date.now();

    const entry = store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        return c.json(
          {
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
            status: 429,
          },
          429,
        );
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + windowMs });
    }

    await next();
  };
}
