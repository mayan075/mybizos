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
 */
organizations.get('/:orgId', async (c) => {
  const orgId = c.get('orgId');
  const org = mockOrgs.find((o) => o.id === orgId);

  if (!org) {
    return c.json(
      { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  return c.json({ data: org });
});

/**
 * PATCH /orgs/:orgId — update org settings (owner/admin only)
 */
organizations.patch('/:orgId', requireRole('owner', 'admin'), async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = updateOrgSchema.parse(body);

  const idx = mockOrgs.findIndex((o) => o.id === orgId);
  if (idx === -1) {
    return c.json(
      { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  const existing = mockOrgs[idx] as Org;
  const updated: Org = {
    ...existing,
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  mockOrgs[idx] = updated;

  logger.info('Organization updated', { orgId });
  return c.json({ data: updated });
});

/**
 * GET /orgs/:orgId/members — list organization members
 */
organizations.get('/:orgId/members', async (c) => {
  const orgId = c.get('orgId');
  const members = mockMembers.filter((m) => m.orgId === orgId);
  return c.json({ data: members });
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

export { organizations as orgRoutes };
