import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';

const teamRoutes = new Hono();
teamRoutes.use('*', authMiddleware, orgScopeMiddleware);

teamRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, orgMembers, users, withOrgScope } = await import('@mybizos/db');
    const { eq, and } = await import('drizzle-orm');

    const rows = await db
      .select({
        memberId: orgMembers.id,
        role: orgMembers.role,
        isActive: orgMembers.isActive,
        joinedAt: orgMembers.joinedAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(withOrgScope(orgMembers.orgId, orgId));

    const members = rows.map((row) => ({
      id: row.memberId,
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      role: row.role,
      isActive: row.isActive,
      joinedAt: row.joinedAt?.toISOString() ?? null,
    }));

    return c.json({ data: members });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { teamRoutes };
