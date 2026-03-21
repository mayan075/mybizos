import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { dealService } from '../services/deal-service.js';

const deals = new Hono();

deals.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const createDealSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  stageId: z.string().min(1, 'Stage ID is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
  title: z.string().min(1, 'Deal title is required'),
  value: z.number().nonnegative('Deal value must be non-negative'),
  currency: z.string().length(3).default('USD'),
  status: z.enum(['open', 'won', 'lost']).default('open'),
  expectedCloseDate: z.string().nullable().optional().default(null),
  assignedTo: z.string().nullable().optional().default(null),
  notes: z.string().default(''),
});

const updateDealSchema = z.object({
  stageId: z.string().optional(),
  title: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  expectedCloseDate: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  notes: z.string().optional(),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/deals — list all deals
 */
deals.get('/', async (c) => {
  const orgId = c.get('orgId');
  const result = await dealService.list(orgId);
  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/deals — create a new deal
 */
deals.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createDealSchema.parse(body);

  const deal = await dealService.create(orgId, parsed);
  return c.json({ data: deal }, 201);
});

/**
 * PATCH /orgs/:orgId/deals/:id — update a deal (including stage changes)
 */
deals.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const dealId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateDealSchema.parse(body);

  const deal = await dealService.update(orgId, dealId, parsed);
  return c.json({ data: deal });
});

/**
 * DELETE /orgs/:orgId/deals/:id — delete a deal
 */
deals.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const dealId = c.req.param('id');

  await dealService.remove(orgId, dealId);
  return c.json({ data: { message: 'Deal deleted successfully' } });
});

export { deals as dealRoutes };
