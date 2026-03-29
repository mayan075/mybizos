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

// ── Types ──

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

// ── Routes ──

/**
 * GET /orgs/:orgId — get organization details
 * Returns org details from the database.
 */
organizations.get('/:orgId', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@hararai/db');
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
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }

  return c.json(
    { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
    404,
  );
});

/**
 * PATCH /orgs/:orgId — update org settings (owner/admin only)
 */
organizations.patch('/:orgId', requireRole('owner', 'admin'), async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = updateOrgSchema.parse(body);

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@hararai/db');
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
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }

  return c.json(
    { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
    404,
  );
});

/**
 * GET /orgs/:orgId/members — list organization members
 */
organizations.get('/:orgId/members', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, orgMembers, users, withOrgScope } = await import('@hararai/db');
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
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/invite — invite a new member (owner/admin only)
 */
organizations.post('/:orgId/invite', requireRole('owner', 'admin'), async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = inviteMemberSchema.parse(body);

  try {
    const { db, orgMembers, users, withOrgScope } = await import('@hararai/db');
    const { eq, and } = await import('drizzle-orm');

    // Check if already a member
    const existingRows = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .leftJoin(users, eq(orgMembers.userId, users.id))
      .where(and(withOrgScope(orgMembers.orgId, orgId), eq(users.email, parsed.email)));

    if (existingRows.length > 0) {
      return c.json(
        { error: 'User is already a member of this organization', code: 'CONFLICT', status: 409 },
        409,
      );
    }

    // TODO: Create invitation record in database and send invite email
    logger.info('Member invited', { orgId, email: parsed.email, role: parsed.role });

    return c.json({ data: { orgId, email: parsed.email, role: parsed.role, status: 'invited' } }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

const settingsSchema = z.record(z.string(), z.unknown());

/**
 * GET /orgs/:orgId/settings — get all organization settings
 */
organizations.get('/:orgId/settings', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@hararai/db');
    const [org] = await db
      .select({ settings: orgsTable.settings })
      .from(orgsTable)
      .where(withOrgScope(orgsTable.id, orgId));

    if (org) {
      logger.info('Settings served from REAL DATABASE', { orgId });
      return c.json({ data: org.settings ?? {}, _source: 'database' });
    }
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }

  return c.json({ data: {}, _source: 'database' });
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
    const { db, organizations: orgsTable, withOrgScope } = await import('@hararai/db');
    const { sql } = await import('drizzle-orm');
    await db
      .update(orgsTable)
      .set({ settings: sql`COALESCE(${orgsTable.settings}, '{}'::jsonb) || ${JSON.stringify(parsed)}::jsonb`, updatedAt: new Date() })
      .where(withOrgScope(orgsTable.id, orgId));

    logger.info('Settings saved to REAL DATABASE', { orgId, keys: Object.keys(parsed) });
    return c.json({ data: parsed, _source: 'database' });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/onboarding — persist onboarding data to org settings
 */
organizations.post('/:orgId/onboarding', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();

  // Try to persist to DB
  try {
    const { db, organizations: orgsTable, withOrgScope } = await import('@hararai/db');
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

    // Process onboarding data into real system config (pipelines, availability, etc.)
    try {
      const { processOnboardingData } = await import('../services/onboarding-service.js');
      await processOnboardingData(orgId, body);
    } catch (processErr) {
      // Don't fail the whole request if processing fails — data is already saved
      logger.warn('Onboarding processing partially failed', {
        orgId,
        error: processErr instanceof Error ? processErr.message : String(processErr),
      });
    }
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }

  logger.info('Onboarding data saved and processed', { orgId, businessName: body.businessName });
  return c.json({ data: { onboarding: body } });
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
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { organizations as orgRoutes };
