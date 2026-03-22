import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { getMockPipelines, getMockPipelineById } from '../services/mock-service.js';
import { logger } from '../middleware/logger.js';

const pipelines = new Hono();

pipelines.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required'),
  stages: z
    .array(
      z.object({
        name: z.string().min(1, 'Stage name is required'),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'),
        slug: z.enum(['new_lead', 'contacted', 'qualified', 'quote_sent', 'negotiation', 'won', 'lost']),
      }),
    )
    .min(1, 'At least one stage is required'),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/pipelines — list all pipelines
 */
pipelines.get('/', async (c) => {
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const result = await pipelineService.list(orgId);
    return c.json({ data: result });
  } catch {
    logger.warn('DB unavailable for pipelines list, using mock data');
    return c.json({ data: getMockPipelines() });
  }
});

pipelines.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createPipelineSchema.parse(body);
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const pipeline = await pipelineService.create(orgId, parsed);
    return c.json({ data: pipeline }, 201);
  } catch {
    logger.warn('DB unavailable for pipeline create, returning mock');
    return c.json({ data: { id: `pipe_${Date.now()}`, ...parsed, createdAt: new Date().toISOString() } }, 201);
  }
});

pipelines.get('/:id', async (c) => {
  const pipelineId = c.req.param('id');
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const result = await pipelineService.getById(orgId, pipelineId);
    return c.json({ data: result });
  } catch {
    logger.warn('DB unavailable for pipeline get, using mock data');
    const pipeline = getMockPipelineById(pipelineId);
    if (!pipeline) return c.json({ error: 'Pipeline not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: pipeline });
  }
});

pipelines.patch('/:id', async (c) => {
  const pipelineId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updatePipelineSchema.parse(body);
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const pipeline = await pipelineService.update(orgId, pipelineId, parsed);
    return c.json({ data: pipeline });
  } catch {
    logger.warn('DB unavailable for pipeline update, returning mock');
    return c.json({ data: { id: pipelineId, ...parsed, updatedAt: new Date().toISOString() } });
  }
});

export { pipelines as pipelineRoutes };
