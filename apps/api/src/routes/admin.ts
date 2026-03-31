import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { authMiddleware, requirePlatformAdmin } from '../middleware/auth.js';
import { generateToken } from '../services/auth-service.js';

const admin = new Hono();

// All admin routes require authentication + platform admin role
admin.use('*', authMiddleware, requirePlatformAdmin());

// ── Cached connection statuses (kept in-memory for health checks) ────────────

interface ConnectionStatus {
  connected: boolean;
  message: string;
  lastTested: string | null;
  latencyMs?: number;
}

const connectionStatuses = new Map<string, ConnectionStatus>();

// ── Zod schemas ──────────────────────────────────────────────────────────────

const saveSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
  category: z.string(),
});

const twilioTestSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required'),
  authToken: z.string().min(1, 'Auth Token is required'),
});

const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

const suspendSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

const disableSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// ── GET /admin/stats — Real platform-wide statistics ─────────────────────────

admin.get('/stats', async (c) => {
  try {
    const { db, organizations, users, contacts, deals, walletAccounts } = await import('@hararai/db');
    const { count, sum } = await import('drizzle-orm');

    const [orgCount] = await db.select({ value: count() }).from(organizations);
    const [userCount] = await db.select({ value: count() }).from(users);
    const [contactCount] = await db.select({ value: count() }).from(contacts);
    const [dealCount] = await db.select({ value: count() }).from(deals);
    const [walletSum] = await db
      .select({ value: sum(walletAccounts.balance) })
      .from(walletAccounts);

    return c.json({
      totalOrgs: orgCount?.value ?? 0,
      totalUsers: userCount?.value ?? 0,
      totalContacts: contactCount?.value ?? 0,
      totalDeals: dealCount?.value ?? 0,
      totalWalletBalance: walletSum?.value ?? '0',
    });
  } catch (err) {
    logger.error('Failed to fetch admin stats', { err });
    return c.json({ error: 'Failed to fetch stats', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/stats/growth — 30-day growth data for sparklines ──────────────

admin.get('/stats/growth', async (c) => {
  try {
    const { db, organizations, users } = await import('@hararai/db');
    const { sql } = await import('drizzle-orm');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orgGrowth = await db
      .select({
        date: sql<string>`date(${organizations.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(organizations)
      .where(sql`${organizations.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(sql`date(${organizations.createdAt})`)
      .orderBy(sql`date(${organizations.createdAt})`);

    const userGrowth = await db
      .select({
        date: sql<string>`date(${users.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`);

    return c.json({ orgGrowth, userGrowth });
  } catch (err) {
    logger.error('Failed to fetch growth stats', { err });
    return c.json({ error: 'Failed to fetch growth data', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/activity — Recent cross-org audit log ─────────────────────────

admin.get('/activity', async (c) => {
  try {
    const { db, auditLogs, users, organizations } = await import('@hararai/db');
    const { eq, desc } = await import('drizzle-orm');

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        orgId: auditLogs.orgId,
        orgName: organizations.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.orgId, organizations.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    return c.json({ activity: rows });
  } catch (err) {
    logger.error('Failed to fetch admin activity', { err });
    return c.json({ error: 'Failed to fetch activity', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/organizations — List all orgs with counts ─────────────────────

admin.get('/organizations', async (c) => {
  try {
    const { db, organizations, orgMembers, contacts, deals } = await import('@hararai/db');
    const { eq, sql, ilike, desc, asc } = await import('drizzle-orm');

    const search = c.req.query('search') ?? '';
    const sortBy = c.req.query('sort') ?? 'created_at';
    const sortDir = c.req.query('dir') ?? 'desc';
    const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
    const offset = Number(c.req.query('offset') ?? '0');

    const conditions = [];
    if (search) {
      conditions.push(ilike(organizations.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    // Get the most recent login per org for health scoring
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        industry: organizations.industry,
        industryCategory: organizations.industryCategory,
        phone: organizations.phone,
        email: organizations.email,
        website: organizations.website,
        suspendedAt: organizations.suspendedAt,
        suspendedReason: organizations.suspendedReason,
        createdAt: organizations.createdAt,
        memberCount: sql<number>`(SELECT count(*)::int FROM org_members WHERE org_members.org_id = ${organizations.id})`,
        contactCount: sql<number>`(SELECT count(*)::int FROM contacts WHERE contacts.org_id = ${organizations.id})`,
        dealCount: sql<number>`(SELECT count(*)::int FROM deals WHERE deals.org_id = ${organizations.id})`,
        lastMemberLogin: sql<string | null>`(
          SELECT MAX(u.last_login_at)::text
          FROM org_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ${organizations.id}
        )`,
      })
      .from(organizations)
      .where(whereClause)
      .orderBy(sortDir === 'asc' ? asc(organizations.createdAt) : desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count for pagination
    const [totalResult] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause);

    return c.json({
      organizations: rows,
      total: totalResult?.value ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Failed to fetch organizations', { err });
    return c.json({ error: 'Failed to fetch organizations', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/organizations/:orgId — Org detail ─────────────────────────────

admin.get('/organizations/:orgId', async (c) => {
  try {
    const orgId = c.req.param('orgId');
    const { db, organizations, orgMembers, contacts, deals, users, walletAccounts, auditLogs } = await import('@hararai/db');
    const { eq, desc, sql } = await import('drizzle-orm');

    // Org details
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) {
      return c.json({ error: 'Organization not found', code: 'NOT_FOUND', status: 404 }, 404);
    }

    // Members with user info
    const members = await db
      .select({
        id: orgMembers.id,
        role: orgMembers.role,
        isActive: orgMembers.isActive,
        joinedAt: orgMembers.joinedAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        lastLoginAt: users.lastLoginAt,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, orgId));

    // Counts
    const [contactCount] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(contacts)
      .where(eq(contacts.orgId, orgId));

    const [dealCount] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(deals)
      .where(eq(deals.orgId, orgId));

    // Wallet
    const [wallet] = await db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.orgId, orgId));

    // Recent activity
    const recentActivity = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.orgId, orgId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    return c.json({
      organization: org,
      members,
      contactCount: contactCount?.value ?? 0,
      dealCount: dealCount?.value ?? 0,
      walletBalance: wallet?.balance ?? '0',
      recentActivity,
    });
  } catch (err) {
    logger.error('Failed to fetch org detail', { err });
    return c.json({ error: 'Failed to fetch organization', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── PATCH /admin/organizations/:orgId/suspend — Suspend an org ───────────────

admin.patch('/organizations/:orgId/suspend', async (c) => {
  const rawBody = await c.req.json();
  const parsed = suspendSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Reason is required', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  try {
    const orgId = c.req.param('orgId');
    const { db, organizations } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    await db
      .update(organizations)
      .set({
        suspendedAt: new Date(),
        suspendedReason: parsed.data.reason,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    logger.info('Organization suspended', { orgId, reason: parsed.data.reason });
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to suspend org', { err });
    return c.json({ error: 'Failed to suspend organization', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── PATCH /admin/organizations/:orgId/activate — Re-activate an org ──────────

admin.patch('/organizations/:orgId/activate', async (c) => {
  try {
    const orgId = c.req.param('orgId');
    const { db, organizations } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    await db
      .update(organizations)
      .set({
        suspendedAt: null,
        suspendedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    logger.info('Organization activated', { orgId });
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to activate org', { err });
    return c.json({ error: 'Failed to activate organization', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── POST /admin/organizations/:orgId/impersonate — Login as org ──────────────

admin.post('/organizations/:orgId/impersonate', async (c) => {
  try {
    const orgId = c.req.param('orgId');
    const { db, organizations, orgMembers, users } = await import('@hararai/db');
    const { eq, and } = await import('drizzle-orm');

    // Find the org
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) {
      return c.json({ error: 'Organization not found', code: 'NOT_FOUND', status: 404 }, 404);
    }

    // Find the owner of this org
    const [ownerMembership] = await db
      .select({
        userId: orgMembers.userId,
        role: orgMembers.role,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'owner')));

    if (!ownerMembership) {
      return c.json({ error: 'No owner found for this organization', code: 'NOT_FOUND', status: 404 }, 404);
    }

    // Generate a 1-hour impersonation token with audit claims
    const adminUser = c.get('user');
    const token = generateToken(
      {
        userId: ownerMembership.userId,
        orgId,
        email: ownerMembership.userEmail,
        role: 'owner',
        name: ownerMembership.userName,
        orgName: org.name,
        impersonated: true,
        impersonatedBy: adminUser.email,
      },
      '1h',
    );

    logger.info('Admin impersonating org', {
      adminEmail: adminUser.email,
      orgId,
      orgName: org.name,
    });

    return c.json({
      token,
      orgName: org.name,
      ownerName: ownerMembership.userName,
      ownerEmail: ownerMembership.userEmail,
      expiresIn: '1 hour',
    });
  } catch (err) {
    logger.error('Failed to impersonate', { err });
    return c.json({ error: 'Failed to generate impersonation token', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/users — List all users across all orgs ────────────────────────

admin.get('/users', async (c) => {
  try {
    const { db, users, orgMembers, organizations } = await import('@hararai/db');
    const { eq, ilike, desc, asc, sql, inArray } = await import('drizzle-orm');

    const search = c.req.query('search') ?? '';
    const sortDir = c.req.query('dir') ?? 'desc';
    const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
    const offset = Number(c.req.query('offset') ?? '0');

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${ilike(users.name, `%${search}%`)} OR ${ilike(users.email, `%${search}%`)})`,
      );
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        disabledAt: users.disabledAt,
        disabledReason: users.disabledReason,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(sortDir === 'asc' ? asc(users.createdAt) : desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get org memberships for each user
    const userIds = rows.map((r) => r.id);
    let memberships: Array<{
      userId: string;
      orgId: string;
      orgName: string;
      role: string;
    }> = [];

    if (userIds.length > 0) {
      memberships = await db
        .select({
          userId: orgMembers.userId,
          orgId: orgMembers.orgId,
          orgName: organizations.name,
          role: orgMembers.role,
        })
        .from(orgMembers)
        .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
        .where(inArray(orgMembers.userId, userIds));
    }

    // Attach memberships to users
    const usersWithOrgs = rows.map((user) => ({
      ...user,
      organizations: memberships.filter((m) => m.userId === user.id),
    }));

    const [totalResult] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return c.json({
      users: usersWithOrgs,
      total: totalResult?.value ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Failed to fetch users', { err });
    return c.json({ error: 'Failed to fetch users', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/users/:userId — User detail ───────────────────────────────────

admin.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { db, users, orgMembers, organizations, auditLogs } = await import('@hararai/db');
    const { eq, desc } = await import('drizzle-orm');

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return c.json({ error: 'User not found', code: 'NOT_FOUND', status: 404 }, 404);
    }

    const memberships = await db
      .select({
        orgId: orgMembers.orgId,
        role: orgMembers.role,
        isActive: orgMembers.isActive,
        joinedAt: orgMembers.joinedAt,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgIndustry: organizations.industry,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, userId));

    const recentActivity = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
        orgName: organizations.name,
      })
      .from(auditLogs)
      .leftJoin(organizations, eq(auditLogs.orgId, organizations.id))
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    // Don't return password hash
    const { passwordHash: _, ...safeUser } = user;

    return c.json({
      user: safeUser,
      memberships,
      recentActivity,
    });
  } catch (err) {
    logger.error('Failed to fetch user detail', { err });
    return c.json({ error: 'Failed to fetch user', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── PATCH /admin/users/:userId/disable — Disable a user ──────────────────────

admin.patch('/users/:userId/disable', async (c) => {
  const rawBody = await c.req.json();
  const parsed = disableSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Reason is required', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  try {
    const userId = c.req.param('userId');
    const { db, users } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    await db
      .update(users)
      .set({
        isActive: false,
        disabledAt: new Date(),
        disabledReason: parsed.data.reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info('User disabled', { userId, reason: parsed.data.reason });
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to disable user', { err });
    return c.json({ error: 'Failed to disable user', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── PATCH /admin/users/:userId/enable — Re-enable a user ─────────────────────

admin.patch('/users/:userId/enable', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { db, users } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    await db
      .update(users)
      .set({
        isActive: true,
        disabledAt: null,
        disabledReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info('User enabled', { userId });
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to enable user', { err });
    return c.json({ error: 'Failed to enable user', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/health — System health check ──────────────────────────────────

admin.get('/health', async (c) => {
  const services: Record<string, { status: 'healthy' | 'degraded' | 'down'; latencyMs: number; message: string }> = {};

  // Database ping
  const dbStart = Date.now();
  try {
    const { db } = await import('@hararai/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);
    services['database'] = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
      message: 'Connected',
    };
  } catch {
    services['database'] = {
      status: 'down',
      latencyMs: Date.now() - dbStart,
      message: 'Connection failed',
    };
  }

  // Redis ping
  const redisStart = Date.now();
  try {
    if (config.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(config.REDIS_URL, { lazyConnect: true, connectTimeout: 5000 });
      await client.connect();
      await client.ping();
      await client.disconnect();
      services['redis'] = {
        status: 'healthy',
        latencyMs: Date.now() - redisStart,
        message: 'Connected',
      };
    } else {
      services['redis'] = {
        status: 'degraded',
        latencyMs: 0,
        message: 'Not configured',
      };
    }
  } catch {
    services['redis'] = {
      status: 'down',
      latencyMs: Date.now() - redisStart,
      message: 'Connection failed',
    };
  }

  // Third-party services from cached test results
  for (const [key, status] of connectionStatuses.entries()) {
    services[key] = {
      status: status.connected ? 'healthy' : 'degraded',
      latencyMs: status.latencyMs ?? 0,
      message: status.message,
    };
  }

  // Add not-tested services
  for (const svc of ['twilio', 'resend', 'anthropic', 'stripe']) {
    if (!services[svc]) {
      services[svc] = {
        status: 'degraded',
        latencyMs: 0,
        message: 'Not tested yet',
      };
    }
  }

  const overallStatus = Object.values(services).some((s) => s.status === 'down')
    ? 'down'
    : Object.values(services).some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return c.json({
    status: overallStatus,
    services,
    checkedAt: new Date().toISOString(),
  });
});

// ── GET /admin/audit-logs — Cross-org audit logs with filters ────────────────

admin.get('/audit-logs', async (c) => {
  try {
    const { db, auditLogs, users, organizations } = await import('@hararai/db');
    const { eq, and, desc, gte, lte, sql } = await import('drizzle-orm');

    const action = c.req.query('action');
    const orgId = c.req.query('orgId');
    const userId = c.req.query('userId');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const limit = Math.min(Number(c.req.query('limit') ?? '50'), 100);
    const offset = Number(c.req.query('offset') ?? '0');

    const conditions = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action as typeof auditLogs.action.enumValues[number]));
    }
    if (orgId) {
      conditions.push(eq(auditLogs.orgId, orgId));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (from) {
      conditions.push(gte(auditLogs.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(auditLogs.createdAt, new Date(to)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        description: auditLogs.description,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        orgId: auditLogs.orgId,
        orgName: organizations.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.orgId, organizations.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    return c.json({
      logs: rows,
      total: totalResult?.value ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Failed to fetch audit logs', { err });
    return c.json({ error: 'Failed to fetch audit logs', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/audit-logs/export — CSV export ────────────────────────────────

admin.get('/audit-logs/export', async (c) => {
  try {
    const { db, auditLogs, users, organizations } = await import('@hararai/db');
    const { eq, and, desc, gte, lte } = await import('drizzle-orm');

    const action = c.req.query('action');
    const orgId = c.req.query('orgId');
    const from = c.req.query('from');
    const to = c.req.query('to');

    const conditions = [];
    if (action) conditions.push(eq(auditLogs.action, action as typeof auditLogs.action.enumValues[number]));
    if (orgId) conditions.push(eq(auditLogs.orgId, orgId));
    if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        orgName: organizations.name,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.orgId, organizations.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5000);

    const csvHeader = 'Date,Action,Resource,Description,User,Email,Organization,IP Address\n';
    const csvRows = rows.map((r) =>
      [
        r.createdAt?.toISOString() ?? '',
        r.action,
        r.resource,
        `"${(r.description ?? '').replace(/"/g, '""')}"`,
        r.userName ?? '',
        r.userEmail ?? '',
        r.orgName ?? '',
        r.ipAddress ?? '',
      ].join(','),
    ).join('\n');

    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return c.body(csvHeader + csvRows);
  } catch (err) {
    logger.error('Failed to export audit logs', { err });
    return c.json({ error: 'Failed to export', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── POST /admin/settings — Save platform settings to DB ─────────────────────

admin.post('/settings', async (c) => {
  const rawBody = await c.req.json();
  const parsed = saveSettingsSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json({ error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  try {
    const { db, platformSettings } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');
    const user = c.get('user');
    const { settings, category } = parsed.data;

    for (const [key, value] of Object.entries(settings)) {
      const settingKey = `${category}.${key}`;

      // Upsert: try update first, then insert
      const existing = await db
        .select({ id: platformSettings.id })
        .from(platformSettings)
        .where(eq(platformSettings.key, settingKey));

      if (existing.length > 0) {
        await db
          .update(platformSettings)
          .set({ value, updatedBy: user.id, updatedAt: new Date() })
          .where(eq(platformSettings.key, settingKey));
      } else {
        await db.insert(platformSettings).values({
          key: settingKey,
          value,
          category,
          updatedBy: user.id,
        });
      }
    }

    logger.info('Admin settings updated', { category, keys: Object.keys(settings) });
    return c.json({ success: true, category });
  } catch (err) {
    logger.error('Failed to save settings', { err });
    return c.json({ error: 'Failed to save settings', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

// ── GET /admin/settings — Get settings from DB ──────────────────────────────

admin.get('/settings', async (c) => {
  try {
    const { db, platformSettings } = await import('@hararai/db');

    const rows = await db.select().from(platformSettings);

    // Group settings by category
    const settings: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      const keyParts = row.key.split('.');
      const category = keyParts[0] ?? row.category;
      const field = keyParts.slice(1).join('.') || row.key;

      if (!settings[category]) settings[category] = {};
      settings[category][field] = row.value;
    }

    // Also report configured status (from env vars as fallback)
    const configured = {
      twilio: Boolean(settings['twilio']?.['accountSid'] || config.TWILIO_ACCOUNT_SID),
      resend: Boolean(settings['resend']?.['apiKey'] || config.RESEND_API_KEY),
      anthropic: Boolean(settings['anthropic']?.['apiKey'] || config.ANTHROPIC_API_KEY),
      stripe: Boolean(settings['stripe']?.['secretKey'] || config.STRIPE_SECRET_KEY),
    };

    // Cached connection statuses
    const statuses: Record<string, ConnectionStatus> = {};
    for (const [key, val] of connectionStatuses.entries()) {
      statuses[key] = val;
    }

    return c.json({ settings, configured, statuses });
  } catch (err) {
    logger.error('Failed to fetch settings', { err });
    // Fallback to env-based configured status
    return c.json({
      settings: {},
      configured: {
        twilio: Boolean(config.TWILIO_ACCOUNT_SID),
        resend: Boolean(config.RESEND_API_KEY),
        anthropic: Boolean(config.ANTHROPIC_API_KEY),
        stripe: Boolean(config.STRIPE_SECRET_KEY),
      },
      statuses: {},
    });
  }
});

// ── POST /admin/test/twilio — Test Twilio credentials ────────────────────────

admin.post('/test/twilio', async (c) => {
  const rawBody = await c.req.json();
  const parsed = twilioTestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json({ success: false, message: 'Invalid credentials format', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const { accountSid, authToken } = parsed.data;
  const start = Date.now();

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      },
    );

    const latencyMs = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { friendly_name: string; status: string };
      const status: ConnectionStatus = {
        connected: true,
        message: `Connected to ${data.friendly_name} (${data.status})`,
        lastTested: new Date().toISOString(),
        latencyMs,
      };
      connectionStatuses.set('twilio', status);
      logger.info('Twilio test succeeded', { accountSid: accountSid.substring(0, 8) + '...' });
      return c.json({ success: true, message: status.message, accountName: data.friendly_name });
    }

    const status: ConnectionStatus = {
      connected: false,
      message: `Authentication failed (${response.status})`,
      lastTested: new Date().toISOString(),
      latencyMs,
    };
    connectionStatuses.set('twilio', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('twilio', { connected: false, message, lastTested: new Date().toISOString(), latencyMs: Date.now() - start });
    return c.json({ success: false, message });
  }
});

// ── POST /admin/test/resend — Test Resend API key ───────────────────────────

admin.post('/test/resend', async (c) => {
  const rawBody = await c.req.json();
  const parsed = apiKeySchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json({ success: false, message: 'API key is required', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const { apiKey } = parsed.data;
  const start = Date.now();

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const latencyMs = Date.now() - start;

    if (response.ok) {
      const status: ConnectionStatus = { connected: true, message: 'API key valid', lastTested: new Date().toISOString(), latencyMs };
      connectionStatuses.set('resend', status);
      logger.info('Resend test succeeded');
      return c.json({ success: true, message: 'Resend connected — API key is valid' });
    }

    const status: ConnectionStatus = { connected: false, message: `Invalid API key (${response.status})`, lastTested: new Date().toISOString(), latencyMs };
    connectionStatuses.set('resend', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('resend', { connected: false, message, lastTested: new Date().toISOString(), latencyMs: Date.now() - start });
    return c.json({ success: false, message });
  }
});

// ── POST /admin/test/anthropic — Test Claude API key ────────────────────────

admin.post('/test/anthropic', async (c) => {
  const rawBody = await c.req.json();
  const parsed = apiKeySchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json({ success: false, message: 'API key is required', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const { apiKey } = parsed.data;
  const start = Date.now();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    });

    const latencyMs = Date.now() - start;

    if (response.ok) {
      const status: ConnectionStatus = { connected: true, message: 'Claude API key valid', lastTested: new Date().toISOString(), latencyMs };
      connectionStatuses.set('anthropic', status);
      logger.info('Anthropic test succeeded');
      return c.json({ success: true, message: 'Anthropic connected — Claude is ready' });
    }

    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = typeof errData.error === 'object' && errData.error !== null
      ? (errData.error as Record<string, string>).message ?? `Status ${response.status}`
      : `Status ${response.status}`;

    const status: ConnectionStatus = { connected: false, message: errMsg, lastTested: new Date().toISOString(), latencyMs };
    connectionStatuses.set('anthropic', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('anthropic', { connected: false, message, lastTested: new Date().toISOString(), latencyMs: Date.now() - start });
    return c.json({ success: false, message });
  }
});

export const adminRoutes = admin;
