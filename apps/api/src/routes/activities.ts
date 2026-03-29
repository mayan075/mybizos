import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';

const activityRoutes = new Hono();
activityRoutes.use('*', authMiddleware, orgScopeMiddleware);

const listSchema = z.object({
  type: z.string().optional(),
  contactId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

activityRoutes.get('/', async (c) => {
  const query = listSchema.parse({
    type: c.req.query('type'),
    contactId: c.req.query('contactId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { db, activities, contacts, withOrgScope } = await import('@hararai/db');
    const { and, eq, desc, count } = await import('drizzle-orm');

    const conditions = [withOrgScope(activities.orgId, c.get('orgId'))];

    if (query.type) {
      conditions.push(eq(activities.type, query.type as typeof activities.type.enumValues[number]));
    }
    if (query.contactId) {
      conditions.push(eq(activities.contactId, query.contactId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(activities)
      .where(whereClause);

    const total = totalResult?.value ?? 0;
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        activity: activities,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(activities)
      .leftJoin(contacts, and(eq(activities.contactId, contacts.id), eq(contacts.orgId, activities.orgId)))
      .where(whereClause)
      .orderBy(desc(activities.createdAt))
      .limit(query.limit)
      .offset(offset);

    const data = rows.map((row) => ({
      ...row.activity,
      contactName:
        row.contactFirstName && row.contactLastName
          ? `${row.contactFirstName} ${row.contactLastName}`
          : null,
    }));

    return c.json({
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { activityRoutes };
