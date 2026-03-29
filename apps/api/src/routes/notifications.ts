import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';

const notificationRoutes = new Hono();
notificationRoutes.use('*', authMiddleware, orgScopeMiddleware);

const listSchema = z.object({
  type: z.string().optional(),
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

notificationRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = listSchema.parse({
    type: c.req.query('type'),
    unread: c.req.query('unread'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { db, notifications, withOrgScope } = await import('@hararai/db');
    const { and, eq, desc, count } = await import('drizzle-orm');

    const conditions = [withOrgScope(notifications.orgId, orgId)];
    if (query.type) conditions.push(eq(notifications.type, query.type));
    if (query.unread === 'true') conditions.push(eq(notifications.read, false));

    const whereClause = and(...conditions);

    const [totalResult] = await db.select({ value: count() }).from(notifications).where(whereClause);
    const total = totalResult?.value ?? 0;

    const [unreadResult] = await db.select({ value: count() }).from(notifications)
      .where(and(withOrgScope(notifications.orgId, orgId), eq(notifications.read, false)));
    const unreadCount = unreadResult?.value ?? 0;

    const offset = (query.page - 1) * query.limit;
    const rows = await db.select().from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(query.limit)
      .offset(offset);

    return c.json({
      data: rows,
      unreadCount,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

notificationRoutes.patch('/:id/read', async (c) => {
  const orgId = c.get('orgId');
  const notificationId = c.req.param('id');
  try {
    const { db, notifications, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(and(withOrgScope(notifications.orgId, orgId), eq(notifications.id, notificationId)))
      .returning();

    if (!updated) return c.json({ error: 'Notification not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

notificationRoutes.post('/read-all', async (c) => {
  const orgId = c.get('orgId');
  try {
    const { db, notifications, withOrgScope } = await import('@hararai/db');
    const { eq, and } = await import('drizzle-orm');

    await db.update(notifications)
      .set({ read: true })
      .where(and(withOrgScope(notifications.orgId, orgId), eq(notifications.read, false)));

    return c.json({ data: { message: 'All notifications marked as read' } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

notificationRoutes.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const notificationId = c.req.param('id');
  try {
    const { db, notifications, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const result = await db.delete(notifications)
      .where(and(withOrgScope(notifications.orgId, orgId), eq(notifications.id, notificationId)))
      .returning({ id: notifications.id });

    if (result.length === 0) return c.json({ error: 'Notification not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: { message: 'Notification dismissed' } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { notificationRoutes };
