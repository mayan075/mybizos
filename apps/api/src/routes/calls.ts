import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const callsRoutes = new Hono();
callsRoutes.use('*', authMiddleware, orgScopeMiddleware);

// ── Zod schemas ───────────────────────────────────────────────────────────

const logCallSchema = z.object({
  phoneNumber: z.string().min(5, 'Phone number is required'),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  durationSeconds: z.number().int().min(0).default(0),
  contactName: z.string().nullable().default(null),
  timestamp: z.string().optional(),
  outcome: z.enum(['booked', 'qualified', 'voicemail', 'missed', 'escalated']).default('qualified'),
  summary: z.string().optional(),
});

// ── GET / — List call history for an org ──────────────────────────────────

callsRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, callHistory, withOrgScope } = await import('@hararai/db');
    const { desc } = await import('drizzle-orm');

    const rows = await db
      .select()
      .from(callHistory)
      .where(withOrgScope(callHistory.orgId, orgId))
      .orderBy(desc(callHistory.createdAt))
      .limit(100);

    const calls = rows.map((row) => ({
      id: row.id,
      orgId: row.orgId,
      phoneNumber: row.phoneNumber,
      contactName: row.contactName,
      direction: row.direction,
      duration: row.durationSeconds,
      timestamp: row.createdAt.toISOString(),
      outcome: row.outcome,
      aiHandled: row.aiHandled,
      summary: row.summary ?? '',
      transcript: row.transcript as Array<{ speaker: string; text: string; time: string }>,
      actionsTaken: row.actionsTaken as string[],
      recordingAvailable: row.recordingAvailable,
    }));

    return c.json(calls);
  } catch (err) {
    logger.error('Failed to list calls', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

// ── GET /:id — Get single call detail ─────────────────────────────────────

callsRoutes.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const callId = c.req.param('id');

  try {
    const { db, callHistory, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const [row] = await db
      .select()
      .from(callHistory)
      .where(and(withOrgScope(callHistory.orgId, orgId), eq(callHistory.id, callId)));

    if (!row) {
      return c.json({ error: 'Call not found', code: 'NOT_FOUND', status: 404 }, 404);
    }

    return c.json({
      data: {
        id: row.id,
        orgId: row.orgId,
        phoneNumber: row.phoneNumber,
        contactName: row.contactName,
        direction: row.direction,
        duration: row.durationSeconds,
        timestamp: row.createdAt.toISOString(),
        outcome: row.outcome,
        aiHandled: row.aiHandled,
        summary: row.summary ?? '',
        transcript: row.transcript as Array<{ speaker: string; text: string; time: string }>,
        actionsTaken: row.actionsTaken as string[],
        recordingAvailable: row.recordingAvailable,
      },
    });
  } catch (err) {
    logger.error('Failed to get call', { orgId, callId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

// ── POST /log — Log a completed call ─────────────────────────────────────

callsRoutes.post('/log', async (c) => {
  const orgId = c.get('orgId');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const parsed = logCallSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(', '),
        code: 'VALIDATION_ERROR',
        status: 400,
      },
      400,
    );
  }

  const data = parsed.data;

  try {
    const { db, callHistory } = await import('@hararai/db');

    const [created] = await db
      .insert(callHistory)
      .values({
        orgId,
        phoneNumber: data.phoneNumber,
        contactName: data.contactName,
        direction: data.direction,
        durationSeconds: data.durationSeconds,
        outcome: data.outcome,
        aiHandled: false,
        summary: data.summary ?? `${data.direction === 'outbound' ? 'Outbound' : 'Inbound'} call — ${data.durationSeconds}s`,
        transcript: [],
        actionsTaken: ['Call logged'],
        recordingAvailable: false,
      })
      .returning();

    if (!created) {
      return c.json({ error: 'Failed to log call', code: 'INTERNAL_ERROR', status: 500 }, 500);
    }

    logger.info('Call logged to database', {
      orgId,
      callId: created.id,
      phoneNumber: data.phoneNumber,
      direction: data.direction,
    });

    return c.json({ success: true, call: created });
  } catch (err) {
    logger.error('Failed to log call', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { callsRoutes };
