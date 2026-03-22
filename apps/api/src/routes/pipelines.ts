import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { pipelineService } from '../services/deal-service.js';

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
  const orgId = c.get('orgId');
  const result = await pipelineService.list(orgId);
  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/pipelines — create a new pipeline
 */
pipelines.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createPipelineSchema.parse(body);

  const pipeline = await pipelineService.create(orgId, parsed);
  return c.json({ data: pipeline }, 201);
});

/**
 * GET /orgs/:orgId/pipelines/:id — get pipeline with stages and deals
 */
pipelines.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const pipelineId = c.req.param('id');

  const result = await pipelineService.getById(orgId, pipelineId);
  return c.json({ data: result });
});

/**
 * PATCH /orgs/:orgId/pipelines/:id — update a pipeline
 */
pipelines.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const pipelineId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updatePipelineSchema.parse(body);

  const pipeline = await pipelineService.update(orgId, pipelineId, parsed);
  return c.json({ data: pipeline });
});

export { pipelines as pipelineRoutes };
