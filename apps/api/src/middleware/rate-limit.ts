import type { Context, Next } from 'hono';

/**
 * Simple in-memory rate limiter middleware.
 * Limits requests per IP address (rateLimit) or per org ID (orgRateLimit) within a sliding time window.
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

/**
 * Shared rate-limit check against the in-memory store.
 *
 * Returns the number of remaining requests if the request is allowed,
 * or -1 if the limit has been exceeded.
 */
function checkLimit(key: string, maxAttempts: number, windowMs: number): number {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= maxAttempts) {
      return -1;
    }
    entry.count++;
    return maxAttempts - entry.count;
  }

  store.set(key, { count: 1, resetAt: now + windowMs });
  return maxAttempts - 1;
}

export function rateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const route = c.req.path;
    const key = `ip:${ip}:${route}`;

    const remaining = checkLimit(key, maxAttempts, windowMs);

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

export function orgRateLimit(maxAttempts: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const orgId = c.get('orgId') as string | undefined;

    // If orgId is not set on context, skip org-level limiting
    if (!orgId) {
      await next();
      return;
    }

    const key = `org:${orgId}`;

    const remaining = checkLimit(key, maxAttempts, windowMs);

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
