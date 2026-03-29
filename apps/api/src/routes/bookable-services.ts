import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { bookableServiceService } from '../services/bookable-service-service.js';
import { logger } from '../middleware/logger.js';

const bookableServiceRouter = new Hono();

bookableServiceRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  qualifyingQuestions: z.array(z.string().max(500)).max(10).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/bookable-services
 * List all bookable services for the org
 */
bookableServiceRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  try {
    const services = await bookableServiceService.list(orgId);
    return c.json({ data: services });
  } catch (err) {
    logger.error('Failed to list bookable services', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * GET /orgs/:orgId/bookable-services/:id
 * Get a single bookable service with its team members
 */
bookableServiceRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  try {
    const service = await bookableServiceService.getWithTeamMembers(orgId, id);
    if (!service) {
      return c.json({ error: 'Bookable service not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    return c.json({ data: service });
  } catch (err) {
    logger.error('Failed to get bookable service', {
      orgId,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/bookable-services
 * Create a new bookable service
 */
bookableServiceRouter.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json({ error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors }, 400);
  }

  try {
    const service = await bookableServiceService.create(orgId, parsed.data);
    return c.json({ data: service }, 201);
  } catch (err) {
    logger.error('Failed to create bookable service', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * PATCH /orgs/:orgId/bookable-services/:id
 * Update a bookable service
 */
bookableServiceRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json({ error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors }, 400);
  }

  try {
    const service = await bookableServiceService.update(orgId, id, parsed.data);
    return c.json({ data: service });
  } catch (err) {
    logger.error('Failed to update bookable service', {
      orgId,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * DELETE /orgs/:orgId/bookable-services/:id
 * Delete a bookable service
 */
bookableServiceRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  try {
    await bookableServiceService.remove(orgId, id);
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete bookable service', {
      orgId,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/bookable-services/:id/team-members
 * Add a team member to a bookable service
 */
bookableServiceRouter.post('/:id/team-members', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = addTeamMemberSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json({ error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors }, 400);
  }

  try {
    const member = await bookableServiceService.addTeamMember(orgId, id, parsed.data.userId);
    return c.json({ data: member }, 201);
  } catch (err) {
    logger.error('Failed to add team member to bookable service', {
      orgId,
      id,
      userId: parsed.data.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * DELETE /orgs/:orgId/bookable-services/:id/team-members/:userId
 * Remove a team member from a bookable service
 */
bookableServiceRouter.delete('/:id/team-members/:userId', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  try {
    await bookableServiceService.removeTeamMember(orgId, id, userId);
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to remove team member from bookable service', {
      orgId,
      id,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { bookableServiceRouter as bookableServiceRoutes };
