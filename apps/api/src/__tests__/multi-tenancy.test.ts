import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { orgRateLimit } from '../middleware/rate-limit.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ORG_A_ID = '00000000-0000-0000-0000-000000000001';
const ORG_B_ID = '00000000-0000-0000-0000-000000000002';

const USER_A: AuthUser = {
  id: 'user-a',
  email: 'alice@org-a.com',
  orgId: ORG_A_ID,
  role: 'owner',
};

const USER_B: AuthUser = {
  id: 'user-b',
  email: 'bob@org-b.com',
  orgId: ORG_B_ID,
  role: 'owner',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Builds a minimal Hono app that:
 *  1. Injects `user` into context (simulating authMiddleware)
 *  2. Runs orgScopeMiddleware inline on the route handler so that Hono
 *     exposes :orgId as a named param (wildcard middleware can't see params)
 *  3. Exposes a GET handler at the given path that returns 200 + the orgId
 */
function createTestApp(user: AuthUser, routePath = '/test') {
  const app = new Hono();

  // Fake auth middleware — sets the user without touching the DB or JWT
  app.use('*', async (c, next) => {
    c.set('user', user);
    c.set('token', 'test-token');
    await next();
  });

  // Register orgScopeMiddleware at the concrete route so :orgId param is visible
  app.get(routePath, orgScopeMiddleware, (c) => {
    return c.json({ ok: true, orgId: c.get('orgId') });
  });

  return app;
}

/**
 * Builds an app with per-org rate limiting applied on top of orgScopeMiddleware.
 * Uses unique route paths per test to avoid sharing the in-memory rate-limit store
 * with other test suites.
 */
function createRateLimitApp(
  user: AuthUser,
  routePath: string,
  maxAttempts: number,
  windowMs = 60_000,
) {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('user', user);
    c.set('token', 'test-token');
    await next();
  });

  app.use('*', orgScopeMiddleware);
  app.use('*', orgRateLimit(maxAttempts, windowMs));

  app.get(routePath, (c) => c.json({ ok: true }));

  return app;
}

// ─── 1. orgScopeMiddleware tests ──────────────────────────────────────────────

describe('orgScopeMiddleware', () => {
  it('allows access when URL orgId matches the authenticated user org', async () => {
    const app = createTestApp(USER_A, '/orgs/:orgId/resource');
    const res = await app.request(`/orgs/${ORG_A_ID}/resource`);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; orgId: string };
    expect(body.ok).toBe(true);
    expect(body.orgId).toBe(ORG_A_ID);
  });

  it('blocks access (403 FORBIDDEN) when URL orgId does not match user org', async () => {
    // User A tries to access Org B's URL
    const app = createTestApp(USER_A, '/orgs/:orgId/resource');
    const res = await app.request(`/orgs/${ORG_B_ID}/resource`);
    expect(res.status).toBe(403);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('FORBIDDEN');
  });

  it('sets orgId on context from user when no URL :orgId param is present', async () => {
    const app = createTestApp(USER_A, '/resource');
    const res = await app.request('/resource');
    expect(res.status).toBe(200);
    const body = await res.json() as { orgId: string };
    expect(body.orgId).toBe(ORG_A_ID);
  });

  it('rejects requests without an authenticated user (401)', async () => {
    // Build an app that does NOT inject a user — simulates missing auth
    const app = new Hono();
    app.use('*', orgScopeMiddleware);
    app.get('/resource', (c) => c.json({ ok: true }));

    const res = await app.request('/resource');
    expect(res.status).toBe(401);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

// ─── 2. Cross-tenant data isolation tests ────────────────────────────────────

describe('Cross-tenant data isolation', () => {
  const routes = [
    '/orgs/:orgId/contacts',
    '/orgs/:orgId/deals',
    '/orgs/:orgId/campaigns',
    '/orgs/:orgId/wallet',
    '/orgs/:orgId/sequences',
    '/orgs/:orgId/invoices',
  ];

  for (const routePattern of routes) {
    it(`User A cannot access Org B's route via URL manipulation: ${routePattern}`, async () => {
      const app = createTestApp(USER_A, routePattern);

      // User A attempts to reach the same route but scoped to Org B
      const url = routePattern.replace(':orgId', ORG_B_ID);
      const res = await app.request(url);

      expect(res.status).toBe(403);
      const body = await res.json() as { code: string };
      expect(body.code).toBe('FORBIDDEN');
    });
  }
});

// ─── 3. Per-org rate limiting tests ──────────────────────────────────────────

describe('Per-org rate limiting', () => {
  // Each sub-test uses a unique route path so the shared in-memory store
  // does not bleed counts across tests.
  const WINDOW_MS = 60_000; // 1-minute window — won't expire during test run

  it('allows requests up to the limit then returns 429 ORG_RATE_LIMITED', async () => {
    const MAX = 3;
    const routePath = '/rl-test-limit-bucket';
    const app = createRateLimitApp(USER_A, routePath, MAX, WINDOW_MS);

    // First MAX requests should all be 200
    for (let i = 0; i < MAX; i++) {
      const res = await app.request(routePath);
      expect(res.status).toBe(200);
    }

    // The (MAX + 1)th request should be rate-limited
    const limitedRes = await app.request(routePath);
    expect(limitedRes.status).toBe(429);
    const body = await limitedRes.json() as { code: string };
    expect(body.code).toBe('ORG_RATE_LIMITED');
  });

  it('rate-limited response includes X-Org-RateLimit-Remaining: 0 header', async () => {
    const MAX = 2;
    const routePath = '/rl-test-header-bucket';
    const app = createRateLimitApp(USER_A, routePath, MAX, WINDOW_MS);

    for (let i = 0; i < MAX; i++) {
      await app.request(routePath);
    }

    const res = await app.request(routePath);
    expect(res.status).toBe(429);
    expect(res.headers.get('X-Org-RateLimit-Remaining')).toBe('0');
  });

  it('Org A and Org B have independent rate-limit buckets', async () => {
    const MAX = 2;
    const routePath = '/rl-test-isolation-bucket';

    const appA = createRateLimitApp(USER_A, routePath, MAX, WINDOW_MS);
    const appB = createRateLimitApp(USER_B, routePath, MAX, WINDOW_MS);

    // Exhaust Org A's quota
    for (let i = 0; i < MAX; i++) {
      await appA.request(routePath);
    }
    const orgALimited = await appA.request(routePath);
    expect(orgALimited.status).toBe(429);

    // Org B has its own bucket — should still be under the limit
    const orgBRes = await appB.request(routePath);
    expect(orgBRes.status).toBe(200);
  });
});
