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

    // Find or create user by email
    let targetUserId: string;
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.email));

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create placeholder user — they'll set a password when they accept
      const [newUser] = await db
        .insert(users)
        .values({
          email: parsed.email,
          name: parsed.name,
          emailVerified: false,
          isActive: false,
        })
        .returning({ id: users.id });
      targetUserId = newUser!.id;
    }

    // Add to org as inactive (pending invite acceptance)
    const [member] = await db
      .insert(orgMembers)
      .values({
        orgId,
        userId: targetUserId,
        role: parsed.role as 'admin' | 'member',
        isActive: false,
      })
      .returning();

    // Send invite email
    try {
      const { ResendProvider } = await import('@hararai/email');
      const { config: appConfig } = await import('../config.js');
      const resend = new ResendProvider({
        apiKey: appConfig.RESEND_API_KEY,
        defaultFrom: appConfig.RESEND_DEFAULT_FROM,
      });

      // Get org name for the email
      const { organizations: orgsTable } = await import('@hararai/db');
      const [org] = await db
        .select({ name: orgsTable.name })
        .from(orgsTable)
        .where(eq(orgsTable.id, orgId));
      const orgName = org?.name ?? 'Your team';

      const acceptUrl = `${appConfig.CORS_ORIGIN}/register?invite=${member!.id}&email=${encodeURIComponent(parsed.email)}`;

      await resend.sendEmail(
        undefined,
        parsed.email,
        `You've been invited to join ${orgName} on HararAI`,
        `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f7;">
          <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <div style="background:#1a56db;padding:24px 32px;text-align:center;"><h1 style="color:#fff;font-size:22px;margin:0;">${orgName}</h1></div>
            <div style="padding:32px;font-size:15px;line-height:1.6;color:#333;">
              <h2 style="font-size:20px;color:#1a1a1a;">You're Invited!</h2>
              <p>Hi ${parsed.name},</p>
              <p><strong>${orgName}</strong> has invited you to join their team on HararAI as a <strong>${parsed.role}</strong>.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${acceptUrl}" style="display:inline-block;background:#1a56db;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:600;">Accept Invitation</a>
              </div>
              <p style="color:#64748b;font-size:13px;text-align:center;">This invitation doesn't expire, but the link is unique to you.</p>
            </div>
          </div>
        </body></html>`,
        undefined,
        'team-invite',
      );

      logger.info('Invite email sent', { orgId, email: parsed.email });
    } catch (emailErr) {
      // Don't fail the request if email fails — the invite record is saved
      logger.warn('Failed to send invite email', {
        orgId,
        email: parsed.email,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    logger.info('Member invited', { orgId, email: parsed.email, role: parsed.role });

    return c.json({
      data: {
        id: member!.id,
        orgId,
        email: parsed.email,
        name: parsed.name,
        role: parsed.role,
        status: 'invited',
      },
    }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

// SECURITY: Whitelist allowed settings keys to prevent privilege escalation.
// Billing fields (plan, stripeCustomerId, stripeSubscriptionId) are stored in the
// same JSONB column and must NEVER be writable via this endpoint.
const BLOCKED_SETTINGS_KEYS = ['plan', 'stripeCustomerId', 'stripeSubscriptionId', 'stripePaymentMethodId', 'billing', 'subscription', 'role', 'roles', 'permissions'];

const settingsSchema = z.record(z.string(), z.unknown()).refine(
  (obj) => !Object.keys(obj).some((k) => BLOCKED_SETTINGS_KEYS.includes(k)),
  { message: 'Cannot modify protected settings fields' },
);

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
const onboardingBodySchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  industryCategory: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  services: z.array(z.object({
    name: z.string().min(1).max(200),
    enabled: z.boolean().default(true),
  })).max(50).optional(),
  hours: z.record(z.string(), z.object({
    open: z.boolean(),
    start: z.string().max(10),
    end: z.string().max(10),
  })).optional(),
}).strict();

organizations.post('/:orgId/onboarding', async (c) => {
  const orgId = c.get('orgId');
  const rawBody = await c.req.json();
  const parseResult = onboardingBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', status: 422, details: parseResult.error.issues }, 422);
  }
  const body = parseResult.data;

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
