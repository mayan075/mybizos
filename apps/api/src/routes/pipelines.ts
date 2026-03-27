import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
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
        slug: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Slug must be lowercase alphanumeric with underscores'),
      }),
    )
    .min(1, 'At least one stage is required'),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
});

const createStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Slug must be lowercase alphanumeric with underscores'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'),
  position: z.number().int().min(0),
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code').optional(),
  position: z.number().int().min(0).optional(),
});

const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ).min(1, 'At least one stage is required'),
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
    // Flatten to stage columns for the frontend, using the first (default) pipeline
    const defaultPipeline = result[0];
    if (!defaultPipeline) {
      return c.json({ data: [] });
    }
    const columns = defaultPipeline.stages.map((s) => ({
      id: s.slug,
      title: s.name,
      color: s.color ?? '#6366f1',
      pipelineId: defaultPipeline.id,
      stageId: s.id,
      slug: s.slug,
    }));
    return c.json({ data: columns });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
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
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

pipelines.get('/:id', async (c) => {
  const pipelineId = c.req.param('id');
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const result = await pipelineService.getById(orgId, pipelineId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
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
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/pipelines/:id/stages — create a new stage
 */
pipelines.post('/:id/stages', async (c) => {
  const pipelineId = c.req.param('id');
  const body = await c.req.json();
  const parsed = createStageSchema.parse(body);
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const stage = await pipelineService.createStage(orgId, pipelineId, parsed);
    return c.json({ data: stage }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    throw err;
  }
});

/**
 * PATCH /orgs/:orgId/pipelines/:id/stages/reorder — reorder all stages
 */
pipelines.patch('/:id/stages/reorder', async (c) => {
  const pipelineId = c.req.param('id');
  const body = await c.req.json();
  const parsed = reorderStagesSchema.parse(body);
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const stages = await pipelineService.reorderStages(orgId, pipelineId, parsed.stages);
    return c.json({ data: stages });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    throw err;
  }
});

/**
 * PATCH /orgs/:orgId/pipelines/:id/stages/:stageId — update a stage
 */
pipelines.patch('/:id/stages/:stageId', async (c) => {
  const stageId = c.req.param('stageId');
  const body = await c.req.json();
  const parsed = updateStageSchema.parse(body);
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    const stage = await pipelineService.updateStage(orgId, stageId, parsed);
    return c.json({ data: stage });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    throw err;
  }
});

/**
 * DELETE /orgs/:orgId/pipelines/:id/stages/:stageId — delete a stage
 */
pipelines.delete('/:id/stages/:stageId', async (c) => {
  const stageId = c.req.param('stageId');
  try {
    const { pipelineService } = await import('../services/deal-service.js');
    const orgId = c.get('orgId');
    await pipelineService.deleteStage(orgId, stageId);
    return c.json({ data: { success: true } });
  } catch (err) {
    throw err;
  }
});

export { pipelines as pipelineRoutes };
