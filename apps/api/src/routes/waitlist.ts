import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { waitlistService } from '../services/waitlist-service.js';
import { logger } from '../middleware/logger.js';

const waitlistRouter = new Hono();

waitlistRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'notified', 'booked', 'expired']),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/waitlist
 * List all waitlist entries for the org, with optional ?status= filter
 */
waitlistRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const status = c.req.query('status');
  try {
    const entries = await waitlistService.list(orgId, status ? { status } : undefined);
    return c.json({ data: entries });
  } catch (err) {
    logger.error('Failed to list waitlist entries', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * PATCH /orgs/:orgId/waitlist/:id
 * Update status of a waitlist entry
 */
waitlistRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json({ error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors }, 400);
  }

  try {
    const entry = await waitlistService.updateStatus(orgId, id, parsed.data.status);
    return c.json({ data: entry });
  } catch (err) {
    logger.error('Failed to update waitlist entry status', {
      orgId,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * DELETE /orgs/:orgId/waitlist/:id
 * Remove a waitlist entry
 */
waitlistRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  try {
    await waitlistService.remove(orgId, id);
    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete waitlist entry', {
      orgId,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { waitlistRouter as waitlistRoutes };
