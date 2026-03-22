import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { campaignService } from '../services/campaign-service.js';

const campaignsRouter = new Hono();

campaignsRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const listCampaignsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']).optional(),
  type: z.enum(['email', 'sms']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  type: z.enum(['email', 'sms']),
  subject: z.string().nullable().optional().default(null),
  bodyHtml: z.string().nullable().optional().default(null),
  bodyText: z.string().nullable().optional().default(null),
  segmentFilter: z.object({
    tags: z.array(z.string()).optional(),
    minScore: z.number().optional(),
    maxScore: z.number().optional(),
    source: z.string().optional(),
    allContacts: z.boolean().optional(),
  }).optional().default({ allContacts: true }),
  scheduledAt: z.string().datetime().nullable().optional().default(null),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  segmentFilter: z.object({
    tags: z.array(z.string()).optional(),
    minScore: z.number().optional(),
    maxScore: z.number().optional(),
    source: z.string().optional(),
    allContacts: z.boolean().optional(),
  }).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/campaigns — list campaigns
 */
campaignsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = listCampaignsSchema.parse({
    search: c.req.query('search'),
    status: c.req.query('status'),
    type: c.req.query('type'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await campaignService.list(orgId, query);

  return c.json({
    data: result.campaigns,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

/**
 * GET /orgs/:orgId/campaigns/:id — get campaign with stats
 */
campaignsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('id');
  const result = await campaignService.getById(orgId, campaignId);

  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/campaigns — create a draft campaign
 */
campaignsRouter.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createCampaignSchema.parse(body);

  const campaign = await campaignService.create(orgId, {
    ...parsed,
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
  });

  return c.json({ data: campaign }, 201);
});

/**
 * PATCH /orgs/:orgId/campaigns/:id — update a draft campaign
 */
campaignsRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateCampaignSchema.parse(body);

  const campaign = await campaignService.update(orgId, campaignId, {
    ...parsed,
    scheduledAt: parsed.scheduledAt !== undefined
      ? (parsed.scheduledAt ? new Date(parsed.scheduledAt) : null)
      : undefined,
  });

  return c.json({ data: campaign });
});

/**
 * POST /orgs/:orgId/campaigns/:id/send — send campaign
 */
campaignsRouter.post('/:id/send', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('id');

  const result = await campaignService.send(orgId, campaignId);

  return c.json({ data: result });
});

/**
 * DELETE /orgs/:orgId/campaigns/:id — delete draft campaign
 */
campaignsRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('id');

  await campaignService.delete(orgId, campaignId);

  return c.json({ data: { message: 'Campaign deleted successfully' } });
});

/**
 * GET /orgs/:orgId/campaigns/:id/recipients — list recipients
 */
campaignsRouter.get('/:id/recipients', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('id');
  const query = paginationSchema.parse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await campaignService.getRecipients(
    orgId,
    campaignId,
    query.page,
    query.limit,
  );

  return c.json({
    data: result.recipients,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

export { campaignsRouter as campaignRoutes };
