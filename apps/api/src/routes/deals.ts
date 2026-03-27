import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const deals = new Hono();

deals.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const createDealSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  stageId: z.string().min(1, 'Stage ID is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
  title: z.string().min(1, 'Deal title is required'),
  value: z.number().nonnegative('Deal value must be non-negative').transform(v => String(v)).optional(),
  currency: z.string().length(3).default('USD'),
  expectedCloseDate: z.string().nullable().optional().default(null),
  assignedTo: z.string().nullable().optional().default(null),
});

const updateDealSchema = z.object({
  stageId: z.string().optional(),
  title: z.string().min(1).optional(),
  value: z.number().nonnegative().transform(v => String(v)).optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/deals — list all deals
 */
deals.get('/', async (c) => {
  try {
    const { dealService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const result = await dealService.list(orgId);
    logger.info('Deals list served from REAL DATABASE', { orgId, count: result.length });
    return c.json({ data: result, _source: 'database' });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

deals.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createDealSchema.parse(body);
  try {
    const { dealService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const deal = await dealService.create(orgId, { ...parsed, expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null });
    logger.info('Deal created in REAL DATABASE', { orgId, dealId: deal.id });
    return c.json({ data: deal }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

deals.patch('/:id', async (c) => {
  const dealId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateDealSchema.parse(body);
  try {
    const { dealService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const deal = await dealService.update(orgId, dealId, { ...parsed, expectedCloseDate: parsed.expectedCloseDate !== undefined ? (parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null) : undefined });
    logger.info('Deal updated in REAL DATABASE', { orgId, dealId });
    return c.json({ data: deal });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

deals.delete('/:id', async (c) => {
  try {
    const { dealService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const dealId = c.req.param('id');
    await dealService.remove(orgId, dealId);
    logger.info('Deal deleted from REAL DATABASE', { orgId, dealId });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
  return c.json({ data: { message: 'Deal deleted successfully' } });
});

export { deals as dealRoutes };
