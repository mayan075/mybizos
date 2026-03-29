import {
  db,
  activities,
  messages,
  aiCallLogs,
  withOrgScope,
} from '@hararai/db';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';

export const activityService = {
  async logActivity(
    orgId: string,
    data: {
      contactId?: string | null;
      dealId?: string | null;
      type: typeof activities.type.enumValues[number];
      title: string;
      description?: string | null;
      performedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [created] = await db
      .insert(activities)
      .values({
        orgId,
        contactId: data.contactId ?? null,
        dealId: data.dealId ?? null,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        performedBy: data.performedBy ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    if (!created) {
      logger.error('Failed to log activity', { orgId, type: data.type });
      return null;
    }

    logger.debug('Activity logged', { orgId, activityId: created.id, type: data.type });
    return created;
  },

  async getTimeline(
    orgId: string,
    contactId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Fetch activities for this contact
    const contactActivities = await db
      .select({
        id: activities.id,
        type: activities.type,
        title: activities.title,
        description: activities.description,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        source: sql<string>`'activity'`.as('source'),
      })
      .from(activities)
      .where(and(
        withOrgScope(activities.orgId, orgId),
        eq(activities.contactId, contactId),
      ));

    // Fetch AI call logs for this contact
    const callLogs = await db
      .select({
        id: aiCallLogs.id,
        type: sql<string>`'call'`,
        title: sql<string>`'AI Call'`,
        description: aiCallLogs.summary,
        metadata: sql<Record<string, unknown>>`jsonb_build_object(
          'duration', ${aiCallLogs.durationSeconds},
          'direction', ${aiCallLogs.direction},
          'outcome', ${aiCallLogs.outcome},
          'sentiment', ${aiCallLogs.sentiment}
        )`,
        createdAt: aiCallLogs.createdAt,
        source: sql<string>`'call_log'`.as('source'),
      })
      .from(aiCallLogs)
      .where(and(
        withOrgScope(aiCallLogs.orgId, orgId),
        eq(aiCallLogs.contactId, contactId),
      ));

    // Combine and sort by date descending
    const combined = [...contactActivities, ...callLogs]
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(offset, offset + limit);

    return combined;
  },

  async getActivitiesForDeal(orgId: string, dealId: string) {
    const rows = await db
      .select()
      .from(activities)
      .where(and(
        withOrgScope(activities.orgId, orgId),
        eq(activities.dealId, dealId),
      ))
      .orderBy(desc(activities.createdAt));

    return rows;
  },

  async getRecentActivities(orgId: string, limit = 20) {
    const rows = await db
      .select()
      .from(activities)
      .where(withOrgScope(activities.orgId, orgId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return rows;
  },
};
