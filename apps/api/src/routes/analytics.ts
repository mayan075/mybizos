import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const analyticsRoutes = new Hono();
analyticsRoutes.use('*', authMiddleware, orgScopeMiddleware);

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
});

analyticsRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = dateRangeSchema.parse({
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    period: c.req.query('period'),
  });

  try {
    const { db, contacts, deals, appointments, activities, formSubmissions, callHistory, withOrgScope } = await import('@hararai/db');
    const { and, gte, count, sum, sql, desc } = await import('drizzle-orm');

    // Calculate date range
    const now = new Date();
    const periodDays = query.period === '7d' ? 7 : query.period === '30d' ? 30 : query.period === '90d' ? 90 : 365;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - periodDays * 86400000);

    // Previous period for comparison
    const prevStartDate = new Date(startDate.getTime() - periodDays * 86400000);

    // Current period metrics
    const [leadsResult] = await db.select({ value: count() }).from(contacts)
      .where(and(withOrgScope(contacts.orgId, orgId), gte(contacts.createdAt, startDate)));
    const [prevLeadsResult] = await db.select({ value: count() }).from(contacts)
      .where(and(withOrgScope(contacts.orgId, orgId), gte(contacts.createdAt, prevStartDate), sql`${contacts.createdAt} < ${startDate}`));

    const [dealsWonResult] = await db.select({ value: count(), total: sum(deals.value) }).from(deals)
      .where(and(withOrgScope(deals.orgId, orgId), gte(deals.closedAt, startDate), sql`${deals.closedAt} IS NOT NULL`));
    const [prevDealsWonResult] = await db.select({ value: count(), total: sum(deals.value) }).from(deals)
      .where(and(withOrgScope(deals.orgId, orgId), gte(deals.closedAt, prevStartDate), sql`${deals.closedAt} < ${startDate}`, sql`${deals.closedAt} IS NOT NULL`));

    const [appointmentsResult] = await db.select({ value: count() }).from(appointments)
      .where(and(withOrgScope(appointments.orgId, orgId), gte(appointments.createdAt, startDate)));

    const [formSubsResult] = await db.select({ value: count() }).from(formSubmissions)
      .where(and(withOrgScope(formSubmissions.orgId, orgId), gte(formSubmissions.createdAt, startDate)));

    let callsCount = 0;
    try {
      const [callsResult] = await db.select({ value: count() }).from(callHistory)
        .where(and(withOrgScope(callHistory.orgId, orgId), gte(callHistory.createdAt, startDate)));
      callsCount = callsResult?.value ?? 0;
    } catch {
      // call_history table may not exist yet
    }

    // Lead sources breakdown
    const leadSources = await db
      .select({ source: contacts.source, count: count() })
      .from(contacts)
      .where(and(withOrgScope(contacts.orgId, orgId), gte(contacts.createdAt, startDate)))
      .groupBy(contacts.source);

    // Recent activities for timeline
    const recentActivities = await db
      .select()
      .from(activities)
      .where(and(withOrgScope(activities.orgId, orgId), gte(activities.createdAt, startDate)))
      .orderBy(desc(activities.createdAt))
      .limit(20);

    const leads = leadsResult?.value ?? 0;
    const prevLeads = prevLeadsResult?.value ?? 0;
    const revenue = Number(dealsWonResult?.total ?? 0);
    const prevRevenue = Number(prevDealsWonResult?.total ?? 0);
    const dealsWon = dealsWonResult?.value ?? 0;
    const prevDealsWon = prevDealsWonResult?.value ?? 0;

    return c.json({
      data: {
        period: query.period,
        kpis: {
          leads: { value: leads, previous: prevLeads, change: prevLeads > 0 ? ((leads - prevLeads) / prevLeads) * 100 : 0 },
          revenue: { value: revenue, previous: prevRevenue, change: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0 },
          dealsWon: { value: dealsWon, previous: prevDealsWon, change: prevDealsWon > 0 ? ((dealsWon - prevDealsWon) / prevDealsWon) * 100 : 0 },
          appointments: { value: appointmentsResult?.value ?? 0 },
          formSubmissions: { value: formSubsResult?.value ?? 0 },
          calls: { value: callsCount },
        },
        leadSources: leadSources.map((s) => ({ source: s.source, count: s.count })),
        recentActivities,
      },
    });
  } catch (err) {
    logger.error('Analytics query failed', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { analyticsRoutes };
