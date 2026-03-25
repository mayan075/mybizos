import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../middleware/logger.js';

const organizations = new Hono();

// Apply auth + org scope to all routes
organizations.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  businessHours: z
    .object({
      start: z.string(),
      end: z.string(),
      days: z.array(z.number().min(0).max(6)),
    })
    .optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
  name: z.string().min(1, 'Name is required'),
});

// ── Mock data ──

interface Org {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
  businessHours: { start: string; end: string; days: number[] };
  plan: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'deactivated';
  joinedAt: string;
}

const mockOrgs: Org[] = [
  {
    id: 'org_01',
    name: 'Acme HVAC & Plumbing',
    slug: 'acme-hvac',
    phone: '+15551234567',
    email: 'info@acmehvac.com',
    address: '789 Main Street, Springfield, IL',
    timezone: 'America/Chicago',
    businessHours: { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] },
    plan: 'starter',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

const mockMembers: OrgMember[] = [
  {
    id: 'mem_01',
    orgId: 'org_01',
    userId: 'usr_01',
    name: 'Demo Owner',
    email: 'demo@mybizos.com',
    role: 'owner',
    status: 'active',
    joinedAt: '2026-01-01T00:00:00Z',
  },
];

// ── Routes ──

/**
 * GET /orgs/:orgId — get organization details
 * Tries real database first, falls back to mock data.
 */
organizations.get('/:orgId', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@mybizos/db');
    const [org] = await db
      .select()
      .from(orgsTable)
      .where(withOrgScope(orgsTable.id, orgId));

    if (org) {
      logger.info('Organization served from REAL DATABASE', { orgId });
      return c.json({
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          phone: org.phone ?? '',
          email: org.email ?? '',
          address: org.address ?? '',
          timezone: org.timezone,
          plan: 'starter',
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
        },
        _source: 'database',
      });
    }
  } catch (err) {
    logger.warn('DB unavailable for org get, using MOCK data', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback to mock
  const org = mockOrgs.find((o) => o.id === orgId);
  if (!org) {
    return c.json(
      { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }
  return c.json({ data: org, _source: 'mock' });
});

/**
 * PATCH /orgs/:orgId — update org settings (owner/admin only)
 */
organizations.patch('/:orgId', requireRole('owner', 'admin'), async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = updateOrgSchema.parse(body);

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');
    const [updated] = await db
      .update(orgsTable)
      .set({ ...parsed, updatedAt: new Date() })
      .where(withOrgScope(orgsTable.id, orgId))
      .returning();

    if (updated) {
      logger.info('Organization updated in REAL DATABASE', { orgId });
      return c.json({ data: updated, _source: 'database' });
    }
  } catch (err) {
    logger.warn('DB unavailable for org update, using MOCK', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback to mock
  const idx = mockOrgs.findIndex((o) => o.id === orgId);
  if (idx === -1) {
    return c.json(
      { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  const existing = mockOrgs[idx] as Org;
  const updatedMock: Org = {
    ...existing,
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  mockOrgs[idx] = updatedMock;

  logger.info('Organization updated (mock)', { orgId });
  return c.json({ data: updatedMock, _source: 'mock' });
});

/**
 * GET /orgs/:orgId/members — list organization members
 */
organizations.get('/:orgId/members', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, orgMembers, users, withOrgScope } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select({
        id: orgMembers.id,
        orgId: orgMembers.orgId,
        userId: orgMembers.userId,
        role: orgMembers.role,
        isActive: orgMembers.isActive,
        joinedAt: orgMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orgMembers)
      .leftJoin(users, eq(orgMembers.userId, users.id))
      .where(withOrgScope(orgMembers.orgId, orgId));

    const members = rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      userId: r.userId,
      name: r.userName ?? '',
      email: r.userEmail ?? '',
      role: r.role,
      status: r.isActive ? 'active' : 'deactivated',
      joinedAt: r.joinedAt.toISOString(),
    }));

    logger.info('Members served from REAL DATABASE', { orgId, count: members.length });
    return c.json({ data: members, _source: 'database' });
  } catch (err) {
    logger.warn('DB unavailable for members list, using MOCK', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const members = mockMembers.filter((m) => m.orgId === orgId);
  return c.json({ data: members, _source: 'mock' });
});

/**
 * POST /orgs/:orgId/invite — invite a new member (owner/admin only)
 */
organizations.post('/:orgId/invite', requireRole('owner', 'admin'), async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = inviteMemberSchema.parse(body);

  // Check if already a member
  const existing = mockMembers.find((m) => m.orgId === orgId && m.email === parsed.email);
  if (existing) {
    return c.json(
      { error: 'User is already a member of this organization', code: 'CONFLICT', status: 409 },
      409,
    );
  }

  const member: OrgMember = {
    id: `mem_${Date.now()}`,
    orgId,
    userId: `usr_invited_${Date.now()}`,
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    status: 'invited',
    joinedAt: new Date().toISOString(),
  };

  mockMembers.push(member);
  logger.info('Member invited', { orgId, email: parsed.email, role: parsed.role });

  return c.json({ data: member }, 201);
});

// ── In-memory settings store (per-org) ──
// In production this would be the organization's `settings` JSONB column.

const orgSettings: Record<string, Record<string, unknown>> = {};

const settingsSchema = z.record(z.string(), z.unknown());

/**
 * GET /orgs/:orgId/settings — get all organization settings
 */
organizations.get('/:orgId/settings', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@mybizos/db');
    const [org] = await db
      .select({ settings: orgsTable.settings })
      .from(orgsTable)
      .where(withOrgScope(orgsTable.id, orgId));

    if (org) {
      logger.info('Settings served from REAL DATABASE', { orgId });
      return c.json({ data: org.settings ?? {}, _source: 'database' });
    }
  } catch (err) {
    logger.warn('DB unavailable for settings get, using in-memory', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const settings = orgSettings[orgId] ?? {};
  logger.info('Settings retrieved (in-memory)', { orgId });
  return c.json({ data: settings, _source: 'memory' });
});

/**
 * POST /orgs/:orgId/settings — save/replace organization settings
 */
organizations.post('/:orgId/settings', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = settingsSchema.parse(body);

  // Try to save to DB first
  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@mybizos/db');
    const { sql } = await import('drizzle-orm');
    await db
      .update(orgsTable)
      .set({ settings: sql`COALESCE(${orgsTable.settings}, '{}'::jsonb) || ${JSON.stringify(parsed)}::jsonb`, updatedAt: new Date() })
      .where(withOrgScope(orgsTable.id, orgId));

    logger.info('Settings saved to REAL DATABASE', { orgId, keys: Object.keys(parsed) });
    // Also update in-memory cache
    orgSettings[orgId] = { ...orgSettings[orgId], ...parsed };
    return c.json({ data: orgSettings[orgId], _source: 'database' });
  } catch (err) {
    logger.warn('DB unavailable for settings save, using in-memory', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  orgSettings[orgId] = { ...orgSettings[orgId], ...parsed };
  logger.info('Settings saved (in-memory)', { orgId, keys: Object.keys(parsed) });
  return c.json({ data: orgSettings[orgId], _source: 'memory' });
});

/**
 * POST /orgs/:orgId/onboarding — persist onboarding data to org settings
 */
organizations.post('/:orgId/onboarding', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();

  // Try to persist to DB
  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@mybizos/db');
    const { sql } = await import('drizzle-orm');

    const updateData: Record<string, unknown> = {
      settings: sql`COALESCE(${orgsTable.settings}, '{}'::jsonb) || ${JSON.stringify({ onboarding: body })}::jsonb`,
      updatedAt: new Date(),
    };
    if (body.businessName) {
      updateData['name'] = body.businessName;
    }

    await db
      .update(orgsTable)
      .set(updateData)
      .where(withOrgScope(orgsTable.id, orgId));

    logger.info('Onboarding data saved to REAL DATABASE', { orgId, businessName: body.businessName });
  } catch (err) {
    logger.warn('DB unavailable for onboarding save, using in-memory', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Also update in-memory
  if (!orgSettings[orgId]) {
    orgSettings[orgId] = {};
  }
  orgSettings[orgId]['onboarding'] = body;

  if (body.businessName) {
    const orgIdx = mockOrgs.findIndex((o) => o.id === orgId);
    if (orgIdx !== -1) {
      const existing = mockOrgs[orgIdx] as Org;
      mockOrgs[orgIdx] = {
        ...existing,
        name: body.businessName,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  logger.info('Onboarding data saved', { orgId, businessName: body.businessName });
  return c.json({ data: orgSettings[orgId] });
});

/**
 * GET /orgs/:orgId/conversations/unread-count — get count of unread conversations
 */
organizations.get('/:orgId/conversations/unread-count', async (c) => {
  const orgId = c.get('orgId');
  try {
    const { conversationService } = await import('../services/conversation-service.js');
    const conversations = await conversationService.list(orgId, { status: 'open' });
    const unreadCount = conversations.filter((conv: Record<string, unknown>) => conv.status === 'open').length;
    return c.json({ data: { count: unreadCount } });
  } catch {
    // If DB unavailable, return 0 (not a fake number)
    return c.json({ data: { count: 0 } });
  }
});

export { organizations as orgRoutes };
