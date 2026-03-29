# Multi-Tenancy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the CRM's multi-tenancy with per-tenant rate limiting, PostgreSQL RLS, Redis caching, cross-tenant integration tests, and org-level audit logging.

**Architecture:** Five independent improvements layered on top of the existing `withOrgScope()` pattern. Each can be deployed independently. RLS acts as defense-in-depth at the DB layer. Redis replaces in-memory caches. Audit logging uses a new dedicated table.

**Tech Stack:** PostgreSQL (RLS policies), Redis (ioredis), Hono middleware, Drizzle ORM, Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/api/src/middleware/rate-limit.ts` | Add per-org rate limiting alongside per-IP |
| Create | `packages/db/drizzle/0003_row-level-security.sql` | RLS policies for all tenant-scoped tables |
| Create | `apps/api/src/lib/redis.ts` | Redis client singleton |
| Modify | `apps/api/src/services/phone-routing-service.ts` | Replace in-memory cache with Redis |
| Modify | `apps/api/src/config.ts` | No changes needed — already has REDIS_URL |
| Create | `packages/db/src/schema/audit-log.ts` | Audit log table definition |
| Modify | `packages/db/src/index.ts` | Export audit log schema |
| Create | `apps/api/src/services/audit-service.ts` | Audit logging service |
| Modify | `apps/api/src/middleware/org-scope.ts` | Inject audit logging for mutations |
| Create | `apps/api/src/__tests__/multi-tenancy.test.ts` | Cross-tenant isolation tests |

---

### Task 1: Per-Tenant Rate Limiting

**Files:**
- Modify: `apps/api/src/middleware/rate-limit.ts`

- [ ] **Step 1: Add org-aware rate limiting to the existing rate limiter**

Replace the entire file with a dual-key system that tracks both IP-level and org-level limits:

```typescript
import type { Context, Next } from 'hono';

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

function checkLimit(key: string, maxAttempts: number, windowMs: number): { limited: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= maxAttempts) {
      return { limited: true, remaining: 0 };
    }
    entry.count++;
    return { limited: false, remaining: maxAttempts - entry.count };
  }

  store.set(key, { count: 1, resetAt: now + windowMs });
  return { limited: false, remaining: maxAttempts - 1 };
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
    const key = `ip:${ip}:${route}`;

    const result = checkLimit(key, maxAttempts, windowMs);
    if (result.limited) {
      return c.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED', status: 429 },
        429,
      );
    }

    c.header('X-RateLimit-Remaining', String(result.remaining));
    await next();
  };
}

/**
 * Rate limit by org ID (for authenticated, org-scoped routes).
 * Prevents a single tenant from consuming disproportionate resources.
 * Apply AFTER authMiddleware + orgScopeMiddleware.
 */
export function orgRateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const orgId = c.get('orgId');
    if (!orgId) {
      // No org context — skip org-level limiting (IP limit still applies)
      await next();
      return;
    }

    const route = c.req.path;
    const key = `org:${orgId}:${route}`;

    const result = checkLimit(key, maxRequests, windowMs);
    if (result.limited) {
      return c.json(
        { error: 'Organization rate limit exceeded. Please try again later.', code: 'ORG_RATE_LIMITED', status: 429 },
        429,
      );
    }

    c.header('X-Org-RateLimit-Remaining', String(result.remaining));
    await next();
  };
}
```

- [ ] **Step 2: Apply org rate limiting to the main app**

In `apps/api/src/index.ts`, add a global org-level rate limit after the security headers middleware. Add this import at the top:

```typescript
import { orgRateLimit } from './middleware/rate-limit.js';
```

Then add this line after the security headers middleware block (after line 90):

```typescript
// Per-org rate limiting for all authenticated routes (200 requests per minute per org)
app.use('/orgs/*', orgRateLimit(200, 60 * 1000));
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd mybizos && pnpm tsc --noEmit -p apps/api/tsconfig.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/middleware/rate-limit.ts apps/api/src/index.ts
git commit -m "feat(api): add per-tenant rate limiting alongside per-IP"
```

---

### Task 2: PostgreSQL Row-Level Security (RLS)

**Files:**
- Create: `packages/db/drizzle/0003_row-level-security.sql`

- [ ] **Step 1: Create the RLS migration**

This migration enables RLS on all tenant-scoped tables. The app connects as a superuser, so RLS won't block it unless we use `SET LOCAL` — instead we create policies that the app can enable per-session when ready. For now, this adds the safety net.

```sql
-- Row-Level Security for multi-tenancy defense-in-depth
-- All tenant-scoped tables get RLS policies based on org_id

-- Create an app-level setting to pass org_id into the session
-- Usage: SET LOCAL app.current_org_id = '<uuid>';

-- ── Enable RLS on all tenant-scoped tables ──

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_campaigns ENABLE ROW LEVEL SECURITY;

-- ── Create RLS policies ──
-- Policies use current_setting('app.current_org_id') to scope access.
-- When the setting is empty or not set, all rows are visible (superuser/migration safety).

CREATE POLICY tenant_isolation_contacts ON contacts
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_companies ON companies
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_deals ON deals
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_pipelines ON pipelines
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_pipeline_stages ON pipeline_stages
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_activities ON activities
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_messages ON messages
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_campaign_recipients ON campaign_recipients
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_drip_sequences ON drip_sequences
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_sequence_enrollments ON sequence_enrollments
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_ai_agents ON ai_agents
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_ai_call_logs ON ai_call_logs
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_wallet_accounts ON wallet_accounts
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_wallet_transactions ON wallet_transactions
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_invoices ON invoices
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_estimates ON estimates
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_appointments ON appointments
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_availability_rules ON availability_rules
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_forms ON forms
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_form_submissions ON form_submissions
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_notifications ON notifications
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_social_posts ON social_posts
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_call_history ON call_history
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_reviews ON reviews
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');

CREATE POLICY tenant_isolation_review_campaigns ON review_campaigns
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid OR current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '');
```

- [ ] **Step 2: Wire RLS into the DB client with `SET LOCAL`**

Modify `packages/db/src/client.ts` to export a helper that sets the org context per-transaction:

Add this export at the bottom of the file (after the `db` export):

```typescript
/**
 * Execute a callback within a transaction that sets RLS org context.
 * This enables PostgreSQL Row-Level Security as defense-in-depth.
 *
 * Usage:
 * ```ts
 * const result = await withRLS(orgId, async (tx) => {
 *   return tx.select().from(contacts);
 * });
 * ```
 */
export async function withRLS<T>(
  orgId: string,
  callback: (tx: ReturnType<typeof drizzle>) => Promise<T>,
): Promise<T> {
  const realDb = getDb();
  return await (realDb as any).transaction(async (tx: any) => {
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    return callback(tx);
  });
}
```

Also add the missing `sql` import at the top:

```typescript
import { sql } from "drizzle-orm";
```

And export `withRLS` from `packages/db/src/index.ts`:

```typescript
export { withRLS } from "./client.js";
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/drizzle/0003_row-level-security.sql packages/db/src/client.ts packages/db/src/index.ts
git commit -m "feat(db): add PostgreSQL RLS policies for tenant isolation defense-in-depth"
```

---

### Task 3: Redis Caching with Org-Prefixed Keys

**Files:**
- Create: `apps/api/src/lib/redis.ts`
- Modify: `apps/api/src/services/phone-routing-service.ts`

- [ ] **Step 1: Create Redis client singleton**

```typescript
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

/**
 * Lightweight Redis wrapper using ioredis.
 * Falls back gracefully to in-memory map when Redis is unavailable.
 */

let redisClient: import('ioredis').default | null = null;
let fallbackStore: Map<string, { value: string; expiresAt: number }> | null = null;

async function getRedis(): Promise<import('ioredis').default | null> {
  if (redisClient) return redisClient;
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL not set — using in-memory fallback cache');
    fallbackStore = fallbackStore ?? new Map();
    return null;
  }

  try {
    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    await redisClient.connect();
    logger.info('Redis connected');
    return redisClient;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Redis connection failed — using in-memory fallback', { error: message });
    fallbackStore = fallbackStore ?? new Map();
    return null;
  }
}

/**
 * Get a cached value by key (org-prefixed).
 */
export async function cacheGet(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (redis) {
    return redis.get(key);
  }
  // In-memory fallback
  if (fallbackStore) {
    const entry = fallbackStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      fallbackStore.delete(key);
      return null;
    }
    return entry.value;
  }
  return null;
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(key, value, 'EX', ttlSeconds);
    return;
  }
  // In-memory fallback
  if (fallbackStore) {
    fallbackStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

/**
 * Delete a cached value.
 */
export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  if (fallbackStore) {
    fallbackStore.delete(key);
  }
}

/**
 * Delete all keys matching a pattern (e.g., "org:<orgId>:*").
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }
  // In-memory fallback — iterate and match
  if (fallbackStore) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of fallbackStore.keys()) {
      if (regex.test(key)) {
        fallbackStore.delete(key);
      }
    }
  }
}

/**
 * Gracefully close Redis connection.
 */
export async function cacheClose(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
```

- [ ] **Step 2: Install ioredis**

Run: `cd mybizos && pnpm add ioredis -F @hararai/api`

If the package filter name is different, check `apps/api/package.json` for the `name` field and use that.

- [ ] **Step 3: Replace in-memory cache in phone-routing-service**

Replace the entire cache section in `apps/api/src/services/phone-routing-service.ts`. Remove the `CacheEntry` interface, `CACHE_TTL_MS`, `orgByPhoneCache` Map, `getCached()`, `setCache()`, and the cleanup `setInterval`. Replace with Redis-backed caching:

Add import at top:
```typescript
import { cacheGet, cacheSet } from '../lib/redis.js';
```

Replace the cache helper usage in `resolveOrgByPhoneNumber`:
- Where `getCached(normalized)` was called, use:
  ```typescript
  const cachedJson = await cacheGet(`phone-routing:${normalized}`);
  if (cachedJson) {
    const cached = JSON.parse(cachedJson) as ResolvedOrg;
    logger.debug('Org resolved from Redis cache', { phone: normalized, orgId: cached.orgId });
    return cached;
  }
  ```
- Where `setCache(normalized, resolved)` was called, use:
  ```typescript
  await cacheSet(`phone-routing:${normalized}`, JSON.stringify(resolved), 300);
  ```

- [ ] **Step 4: Verify the build compiles**

Run: `cd mybizos && pnpm tsc --noEmit -p apps/api/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/redis.ts apps/api/src/services/phone-routing-service.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): replace in-memory caches with Redis (org-prefixed keys)"
```

---

### Task 4: Org-Level Audit Logging

**Files:**
- Create: `packages/db/src/schema/audit-log.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/src/client.ts` (add to schema imports)
- Create: `apps/api/src/services/audit-service.ts`
- Modify: `apps/api/src/middleware/org-scope.ts`

- [ ] **Step 1: Create audit log schema**

```typescript
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "send",
  "invite",
  "role_change",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_org_id_idx").on(table.orgId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.orgId, table.action),
    index("audit_logs_resource_idx").on(table.orgId, table.resource),
    index("audit_logs_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
```

- [ ] **Step 2: Export audit log schema from the DB package**

Add to `packages/db/src/index.ts`:
```typescript
export * from "./schema/audit-log.js";
```

Add to `packages/db/src/client.ts` imports section:
```typescript
import * as auditLogSchema from "./schema/audit-log.js";
```

And add to the schema object:
```typescript
const schema = {
  ...authSchema,
  ...organizationsSchema,
  ...contactsSchema,
  ...pipelineSchema,
  ...activitiesSchema,
  ...communicationsSchema,
  ...schedulingSchema,
  ...aiSchema,
  ...auditLogSchema,
};
```

- [ ] **Step 3: Create audit service**

```typescript
import { db, auditLogs, withOrgScope } from '@hararai/db';
import { and, desc, eq } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';

type AuditAction = typeof auditLogs.action.enumValues[number];

interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const auditService = {
  /**
   * Log an audit event. Fire-and-forget — never blocks the request.
   */
  async log(orgId: string, entry: AuditEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        orgId,
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        description: entry.description,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to write audit log', { orgId, action: entry.action, error: message });
    }
  },

  /**
   * Query audit logs for an org with pagination.
   */
  async getAuditLogs(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
      resource?: string;
      userId?: string;
    },
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [withOrgScope(auditLogs.orgId, orgId)];
    if (options?.action) conditions.push(eq(auditLogs.action, options.action));
    if (options?.resource) conditions.push(eq(auditLogs.resource, options.resource));
    if (options?.userId) conditions.push(eq(auditLogs.userId, options.userId));

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  },
};
```

- [ ] **Step 4: Add audit logging middleware for mutations**

Modify `apps/api/src/middleware/org-scope.ts` to add an audit logging helper middleware:

Add this new export at the bottom of the file:

```typescript
/**
 * Audit logging middleware for mutation endpoints.
 * Logs the action after the request completes successfully.
 * Apply to POST, PATCH, DELETE routes that modify data.
 */
export function auditLog(action: string, resource: string): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only log on successful mutations (2xx status)
    if (c.res.status >= 200 && c.res.status < 300) {
      const orgId = c.get('orgId');
      const user = c.get('user');
      if (!orgId || !user) return;

      // Fire-and-forget — import audit service lazily to avoid circular deps
      import('../services/audit-service.js').then(({ auditService }) => {
        auditService.log(orgId, {
          userId: user.id,
          action: action as any,
          resource,
          resourceId: c.req.param('id') ?? null,
          description: `${action} ${resource}`,
          ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
            || c.req.header('x-real-ip') || null,
          userAgent: c.req.header('user-agent') || null,
        }).catch(() => {});
      }).catch(() => {});
    }
  };
}
```

- [ ] **Step 5: Generate the migration**

Run: `cd mybizos/packages/db && pnpm db:generate`
Expected: New migration SQL file created for the audit_logs table

- [ ] **Step 6: Verify the build compiles**

Run: `cd mybizos && pnpm tsc --noEmit -p apps/api/tsconfig.json`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/audit-log.ts packages/db/src/index.ts packages/db/src/client.ts apps/api/src/services/audit-service.ts apps/api/src/middleware/org-scope.ts
git commit -m "feat(api): add org-level audit logging with queryable history"
```

---

### Task 5: Cross-Tenant Integration Tests

**Files:**
- Create: `apps/api/src/__tests__/multi-tenancy.test.ts`

- [ ] **Step 1: Create the cross-tenant test suite**

These tests verify that the middleware and service layers properly isolate tenant data. They mock the DB layer and focus on middleware behavior.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AuthUser } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { orgRateLimit } from '../middleware/rate-limit.js';

// ── Helper: Create a test app with fake auth ──

function createTestApp(user: AuthUser) {
  const app = new Hono();

  // Fake auth middleware — sets the user context
  app.use('*', async (c, next) => {
    c.set('user', user);
    c.set('token', 'test-token');
    await next();
  });

  // Apply org scope middleware
  app.use('*', orgScopeMiddleware);

  return app;
}

const ORG_A_ID = '00000000-0000-0000-0000-000000000001';
const ORG_B_ID = '00000000-0000-0000-0000-000000000002';

const userA: AuthUser = { id: 'user-a', email: 'a@test.com', orgId: ORG_A_ID, role: 'owner' };
const userB: AuthUser = { id: 'user-b', email: 'b@test.com', orgId: ORG_B_ID, role: 'owner' };

// ── Tests ──

describe('Multi-Tenancy Isolation', () => {
  describe('orgScopeMiddleware', () => {
    it('allows access when orgId matches user org', async () => {
      const app = createTestApp(userA);
      app.get('/orgs/:orgId/contacts', (c) => c.json({ orgId: c.get('orgId') }));

      const res = await app.request(`/orgs/${ORG_A_ID}/contacts`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.orgId).toBe(ORG_A_ID);
    });

    it('blocks access when orgId does NOT match user org (403)', async () => {
      const app = createTestApp(userA);
      app.get('/orgs/:orgId/contacts', (c) => c.json({ orgId: c.get('orgId') }));

      // User A tries to access Org B's data
      const res = await app.request(`/orgs/${ORG_B_ID}/contacts`);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.code).toBe('FORBIDDEN');
    });

    it('sets orgId from user context when no URL param', async () => {
      const app = createTestApp(userB);
      app.get('/dashboard', (c) => c.json({ orgId: c.get('orgId') }));

      const res = await app.request('/dashboard');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.orgId).toBe(ORG_B_ID);
    });

    it('rejects requests without authentication', async () => {
      const app = new Hono();
      // No auth middleware — user not set
      app.use('*', orgScopeMiddleware);
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');
      expect(res.status).toBe(401);
    });
  });

  describe('Cross-tenant data isolation pattern', () => {
    it('user A cannot impersonate org B via URL manipulation', async () => {
      const app = createTestApp(userA);

      // Routes that use orgId from URL param
      const routes = [
        `/orgs/${ORG_B_ID}/contacts`,
        `/orgs/${ORG_B_ID}/deals`,
        `/orgs/${ORG_B_ID}/campaigns`,
        `/orgs/${ORG_B_ID}/wallet`,
        `/orgs/${ORG_B_ID}/sequences`,
        `/orgs/${ORG_B_ID}/invoices`,
      ];

      for (const route of routes) {
        app.get(route.replace(ORG_B_ID, ':orgId'), (c) => c.json({ leaked: true }));
      }

      for (const route of routes) {
        const res = await app.request(route);
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Per-org rate limiting', () => {
    it('rate limits by org, not just by IP', async () => {
      const app = createTestApp(userA);

      // Very low limit for testing: 3 requests per 10 seconds
      app.use('/orgs/*', orgRateLimit(3, 10_000));
      app.get('/orgs/:orgId/data', (c) => c.json({ ok: true }));

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.request(`/orgs/${ORG_A_ID}/data`);
        expect(res.status).toBe(200);
      }

      // 4th request should be rate limited
      const res = await app.request(`/orgs/${ORG_A_ID}/data`);
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.code).toBe('ORG_RATE_LIMITED');
    });

    it('different orgs have separate rate limit buckets', async () => {
      // Use org A's app and hit its limit
      const appA = createTestApp(userA);
      appA.use('/orgs/*', orgRateLimit(2, 10_000));
      appA.get('/orgs/:orgId/data', (c) => c.json({ ok: true }));

      await appA.request(`/orgs/${ORG_A_ID}/data`);
      await appA.request(`/orgs/${ORG_A_ID}/data`);
      const resA = await appA.request(`/orgs/${ORG_A_ID}/data`);
      expect(resA.status).toBe(429);

      // Org B should still have its own budget
      const appB = createTestApp(userB);
      appB.use('/orgs/*', orgRateLimit(2, 10_000));
      appB.get('/orgs/:orgId/data', (c) => c.json({ ok: true }));

      const resB = await appB.request(`/orgs/${ORG_B_ID}/data`);
      expect(resB.status).toBe(200);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd mybizos/apps/api && pnpm vitest run src/__tests__/multi-tenancy.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/multi-tenancy.test.ts
git commit -m "test(api): add cross-tenant isolation and per-org rate limit tests"
```

---

## Execution Order

Tasks 1-5 are independent and can be executed in parallel. However, for clean commits, this order is recommended:

1. **Task 1** (rate limiting) — smallest change, immediate value
2. **Task 2** (RLS) — DB-level, no app code changes needed to work
3. **Task 3** (Redis) — new dependency, impacts caching
4. **Task 4** (audit logging) — new table + service
5. **Task 5** (tests) — validates everything above

## Post-Implementation

After all tasks complete:
1. Run full test suite: `cd mybizos/apps/api && pnpm test`
2. Run the RLS migration against the database: `cd mybizos/packages/db && pnpm db:migrate`
3. Generate the audit_logs migration: `cd mybizos/packages/db && pnpm db:generate && pnpm db:migrate`
