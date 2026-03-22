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
 */
dashboard.get('/stats', async (c) => {
  try {
    // When the DB is ready, pull real stats here.
    // For now, build the response from mock data.
    const raw = getMockDashboardStats();
    const appointments = getMockAppointments();

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

    const upcomingAppointments = appointments
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

    return c.json({ stats, upcomingAppointments });
  } catch (err) {
    logger.warn('Error building dashboard stats', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Return minimal fallback
    return c.json({ stats: [], upcomingAppointments: [] });
  }
});

/**
 * GET /orgs/:orgId/dashboard/activity — recent activity feed
 *
 * Returns activity items in the format expected by the
 * frontend's useRecentActivity hook.
 */
dashboard.get('/activity', async (c) => {
  try {
    // When the DB is ready, pull real activity here.
    // For now, return mock activity items.
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
  } catch (err) {
    logger.warn('Error building activity feed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json([]);
  }
});

export { dashboard as dashboardRoutes };
