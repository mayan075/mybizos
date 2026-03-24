import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { getMockDashboardStats, getMockAppointments } from '../services/mock-service.js';
import { logger } from '../middleware/logger.js';

const dashboard = new Hono();

dashboard.use('*', authMiddleware, orgScopeMiddleware);

/**
 * GET /orgs/:orgId/dashboard/stats — dashboard overview
 *
 * Returns stat cards and upcoming appointments in the format
 * expected by the frontend's useDashboardStats hook.
 *
 * Tries real database first, falls back to mock data.
 */
dashboard.get('/stats', async (c) => {
  const orgId = c.get('orgId');

  try {
    // Try real DB
    const { db, contacts, deals, appointments, conversations, activities, aiCallLogs, withOrgScope } = await import('@mybizos/db');
    const { count, sum, eq, and, gte, sql } = await import('drizzle-orm');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all stat queries in parallel
    const [
      contactCountResult,
      dealStatsResult,
      openConversationResult,
      upcomingAppointmentResult,
      recentContactsResult,
      appointmentRows,
      activityRows,
    ] = await Promise.all([
      // Total contacts
      db.select({ value: count() })
        .from(contacts)
        .where(withOrgScope(contacts.orgId, orgId)),

      // Active deals count + total pipeline value
      db.select({
        count: count(),
        totalValue: sum(deals.value),
      })
        .from(deals)
        .where(and(
          withOrgScope(deals.orgId, orgId),
          sql`${deals.closedAt} IS NULL`,
        )),

      // Open conversations
      db.select({ value: count() })
        .from(conversations)
        .where(and(
          withOrgScope(conversations.orgId, orgId),
          eq(conversations.status, 'open'),
        )),

      // Upcoming appointments
      db.select({ value: count() })
        .from(appointments)
        .where(and(
          withOrgScope(appointments.orgId, orgId),
          gte(appointments.startTime, now),
          sql`${appointments.status} IN ('scheduled', 'confirmed')`,
        )),

      // Contacts created this week (leads)
      db.select({ value: count() })
        .from(contacts)
        .where(and(
          withOrgScope(contacts.orgId, orgId),
          gte(contacts.createdAt, weekAgo),
        )),

      // Upcoming appointments details (for the list)
      db.select({
        id: appointments.id,
        title: appointments.title,
        startTime: appointments.startTime,
        status: appointments.status,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
        .from(appointments)
        .leftJoin(contacts, eq(appointments.contactId, contacts.id))
        .where(and(
          withOrgScope(appointments.orgId, orgId),
          gte(appointments.startTime, now),
          sql`${appointments.status} IN ('scheduled', 'confirmed')`,
        ))
        .orderBy(appointments.startTime)
        .limit(5),

      // Recent activities
      db.select()
        .from(activities)
        .where(withOrgScope(activities.orgId, orgId))
        .orderBy(sql`${activities.createdAt} DESC`)
        .limit(10),
    ]);

    const totalContacts = contactCountResult[0]?.value ?? 0;
    const activeDeals = dealStatsResult[0]?.count ?? 0;
    const totalPipelineValue = Number(dealStatsResult[0]?.totalValue ?? 0);
    const openConversations = openConversationResult[0]?.value ?? 0;
    const upcomingAppointmentCount = upcomingAppointmentResult[0]?.value ?? 0;
    const leadsThisWeek = recentContactsResult[0]?.value ?? 0;

    // Try to get AI call count (may not have data yet)
    let aiCallsThisWeek = 0;
    try {
      const [aiCallResult] = await db.select({ value: count() })
        .from(aiCallLogs)
        .where(and(
          withOrgScope(aiCallLogs.orgId, orgId),
          gte(aiCallLogs.createdAt, weekAgo),
        ));
      aiCallsThisWeek = aiCallResult?.value ?? 0;
    } catch {
      // aiCallLogs table may not have data yet
    }

    // Calculate revenue this month from won deals
    let revenueThisMonth = 0;
    try {
      const [revenueResult] = await db.select({ total: sum(deals.value) })
        .from(deals)
        .where(and(
          withOrgScope(deals.orgId, orgId),
          gte(deals.closedAt, monthStart),
          sql`${deals.closedAt} IS NOT NULL`,
        ));
      revenueThisMonth = Number(revenueResult?.total ?? 0);
    } catch {
      // closed deals may not be tracked yet
    }

    const stats = [
      {
        label: 'Total Contacts',
        value: String(totalContacts),
        change: `+${leadsThisWeek} this week`,
        trend: 'up' as const,
        iconName: 'Users',
        color: 'text-info',
        bg: 'bg-info/10',
        href: '/dashboard/contacts',
      },
      {
        label: 'Appointments Booked',
        value: String(upcomingAppointmentCount),
        change: 'upcoming',
        trend: 'up' as const,
        iconName: 'CalendarCheck',
        color: 'text-success',
        bg: 'bg-success/10',
        href: '/dashboard/scheduling',
      },
      {
        label: 'Active Deals',
        value: String(activeDeals),
        change: `$${totalPipelineValue.toLocaleString()} pipeline`,
        trend: 'up' as const,
        iconName: 'DollarSign',
        color: 'text-warning',
        bg: 'bg-warning/10',
        href: '/dashboard/pipeline',
      },
      {
        label: 'Open Conversations',
        value: String(openConversations),
        change: aiCallsThisWeek > 0 ? `${aiCallsThisWeek} AI calls this week` : 'inbox',
        trend: 'up' as const,
        iconName: 'MessageSquare',
        color: 'text-primary',
        bg: 'bg-primary/10',
        href: '/dashboard/inbox',
      },
    ];

    const upcomingAppointments = appointmentRows.map((a) => {
      const start = new Date(a.startTime);
      const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let dateLabel = start.toLocaleDateString('en-US', { weekday: 'long' });
      if (diffDays <= 0) dateLabel = 'Today';
      else if (diffDays === 1) dateLabel = 'Tomorrow';

      return {
        id: a.id,
        customer: `${a.contactFirstName ?? ''} ${a.contactLastName ?? ''}`.trim() || 'Unknown',
        service: a.title.split(' — ')[0] ?? a.title,
        time: timeStr,
        date: dateLabel,
        status: a.status as 'confirmed' | 'scheduled',
      };
    });

    logger.info('Dashboard stats served from REAL DATABASE', { orgId, totalContacts, activeDeals, upcomingAppointmentCount });
    return c.json({ stats, upcomingAppointments, _source: 'database' });

  } catch (err) {
    // Fall back to mock data
    logger.warn('DB unavailable for dashboard stats, using MOCK data', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });

    const raw = getMockDashboardStats();
    const mockAppointmentList = getMockAppointments();

    const stats = [
      {
        label: 'Leads Today',
        value: String(raw.leadsQualifiedThisWeek),
        change: '+18%',
        trend: 'up' as const,
        iconName: 'Users',
        color: 'text-info',
        bg: 'bg-info/10',
        href: '/dashboard/contacts',
      },
      {
        label: 'Appointments Booked',
        value: String(raw.upcomingAppointments),
        change: '+25%',
        trend: 'up' as const,
        iconName: 'CalendarCheck',
        color: 'text-success',
        bg: 'bg-success/10',
        href: '/dashboard/scheduling',
      },
      {
        label: 'AI Calls Answered',
        value: String(raw.aiCallsThisWeek),
        change: '+34%',
        trend: 'up' as const,
        iconName: 'Phone',
        color: 'text-primary',
        bg: 'bg-primary/10',
        href: '/dashboard/inbox',
      },
      {
        label: 'Revenue This Month',
        value: `$${raw.revenueThisMonth.toLocaleString()}`,
        change: '+12%',
        trend: 'up' as const,
        iconName: 'DollarSign',
        color: 'text-warning',
        bg: 'bg-warning/10',
        href: '/dashboard/pipeline',
      },
    ];

    const upcomingAppointments = mockAppointmentList
      .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
      .slice(0, 5)
      .map((a) => {
        const start = new Date(a.startTime);
        const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const now = new Date();
        const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let dateLabel = start.toLocaleDateString('en-US', { weekday: 'long' });
        if (diffDays <= 0) dateLabel = 'Today';
        else if (diffDays === 1) dateLabel = 'Tomorrow';

        return {
          id: a.id,
          customer: a.contactName,
          service: a.title.split(' — ')[0] ?? a.title,
          time: timeStr,
          date: dateLabel,
          status: a.status as 'confirmed' | 'scheduled',
        };
      });

    return c.json({ stats, upcomingAppointments, _source: 'mock' });
  }
});

/**
 * GET /orgs/:orgId/dashboard/activity — recent activity feed
 *
 * Returns activity items in the format expected by the
 * frontend's useRecentActivity hook.
 *
 * Tries real database first, falls back to mock data.
 */
dashboard.get('/activity', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, activities, contacts, withOrgScope } = await import('@mybizos/db');
    const { eq, sql } = await import('drizzle-orm');

    const rows = await db
      .select({
        id: activities.id,
        type: activities.type,
        title: activities.title,
        description: activities.description,
        createdAt: activities.createdAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(activities)
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .where(withOrgScope(activities.orgId, orgId))
      .orderBy(sql`${activities.createdAt} DESC`)
      .limit(10);

    const now = new Date();
    const activity = rows.map((row) => {
      const diffMs = now.getTime() - new Date(row.createdAt).getTime();
      const diffMin = Math.floor(diffMs / 60_000);
      const diffHr = Math.floor(diffMs / 3_600_000);
      const diffDay = Math.floor(diffMs / 86_400_000);
      let time = `${diffDay}d ago`;
      if (diffMin < 60) time = `${diffMin} min ago`;
      else if (diffHr < 24) time = `${diffHr} hr ago`;

      // Map activity type to icon and color
      const iconMap: Record<string, { iconName: string; color: string }> = {
        call: { iconName: 'Phone', color: 'text-primary' },
        ai_call: { iconName: 'Phone', color: 'text-primary' },
        sms_inbound: { iconName: 'MessageSquare', color: 'text-info' },
        sms_outbound: { iconName: 'MessageSquare', color: 'text-info' },
        email_sent: { iconName: 'Mail', color: 'text-info' },
        email_received: { iconName: 'Mail', color: 'text-info' },
        appointment_booked: { iconName: 'CalendarCheck', color: 'text-success' },
        appointment_completed: { iconName: 'CalendarCheck', color: 'text-success' },
        deal_stage_change: { iconName: 'TrendingUp', color: 'text-warning' },
        note: { iconName: 'FileText', color: 'text-muted' },
      };
      const style = iconMap[row.type] ?? { iconName: 'Activity', color: 'text-muted' };

      return {
        id: row.id,
        type: row.type,
        iconName: style.iconName,
        title: row.title,
        description: row.description ?? '',
        time,
        color: style.color,
      };
    });

    logger.info('Activity feed served from REAL DATABASE', { orgId, count: activity.length });
    return c.json(activity);

  } catch (err) {
    logger.warn('DB unavailable for activity feed, using MOCK data', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Return mock activity items
    const activity = [
      {
        id: '1',
        type: 'call',
        iconName: 'Phone',
        title: 'AI answered call from (555) 123-4567',
        description: 'Qualified lead — HVAC maintenance inquiry',
        time: '2 min ago',
        color: 'text-primary',
      },
      {
        id: '2',
        type: 'appointment',
        iconName: 'CalendarCheck',
        title: 'Appointment booked — James Wilson',
        description: 'AC Inspection — Tomorrow at 9:00 AM',
        time: '15 min ago',
        color: 'text-success',
      },
      {
        id: '3',
        type: 'message',
        iconName: 'MessageSquare',
        title: 'SMS from Sarah Chen',
        description: 'Quote received. Let me review with my partner.',
        time: '1 hr ago',
        color: 'text-info',
      },
      {
        id: '4',
        type: 'lead',
        iconName: 'TrendingUp',
        title: 'New lead scored: 95/100',
        description: 'Emily Rodriguez — Emergency plumbing request',
        time: '2 hr ago',
        color: 'text-warning',
      },
      {
        id: '5',
        type: 'call',
        iconName: 'Phone',
        title: 'AI answered call from (555) 987-6543',
        description: 'New construction HVAC estimate request',
        time: '3 hr ago',
        color: 'text-primary',
      },
      {
        id: '6',
        type: 'alert',
        iconName: 'AlertTriangle',
        title: 'Emergency keyword detected — Burst pipe',
        description: 'AI escalated to owner. Customer: Emily Rodriguez',
        time: '4 hr ago',
        color: 'text-destructive',
      },
    ];

    return c.json(activity);
  }
});

export { dashboard as dashboardRoutes };
