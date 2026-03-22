import {
  db,
  campaigns,
  campaignRecipients,
  contacts,
  withOrgScope,
} from '@mybizos/db';
import type { CampaignStats, SegmentFilter } from '@mybizos/db';
import { eq, and, ilike, sql, desc, count } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface CampaignFilters {
  search?: string;
  status?: string;
  type?: string;
  page: number;
  limit: number;
}

export const campaignService = {
  /**
   * List campaigns with stats (paginated, searchable, filterable)
   */
  async list(orgId: string, filters: CampaignFilters) {
    const conditions = [withOrgScope(campaigns.orgId, orgId)];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(ilike(campaigns.name, pattern));
    }

    if (filters.status) {
      conditions.push(
        eq(
          campaigns.status,
          filters.status as (typeof campaigns.status.enumValues)[number],
        ),
      );
    }

    if (filters.type) {
      conditions.push(
        eq(
          campaigns.type,
          filters.type as (typeof campaigns.type.enumValues)[number],
        ),
      );
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(campaigns)
      .where(whereClause);

    const total = totalResult?.value ?? 0;

    const offset = (filters.page - 1) * filters.limit;

    const rows = await db
      .select()
      .from(campaigns)
      .where(whereClause)
      .orderBy(desc(campaigns.createdAt))
      .limit(filters.limit)
      .offset(offset);

    return { campaigns: rows, total };
  },

  /**
   * Get a single campaign with recipient stats
   */
  async getById(orgId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!campaign) {
      throw Errors.notFound('Campaign');
    }

    // Get recipient count by status
    const recipientStats = await db
      .select({
        status: campaignRecipients.status,
        count: count(),
      })
      .from(campaignRecipients)
      .where(
        and(
          withOrgScope(campaignRecipients.orgId, orgId),
          eq(campaignRecipients.campaignId, campaignId),
        ),
      )
      .groupBy(campaignRecipients.status);

    return { campaign, recipientStats };
  },

  /**
   * Create a draft campaign
   */
  async create(
    orgId: string,
    data: {
      name: string;
      type: (typeof campaigns.type.enumValues)[number];
      subject?: string | null;
      bodyHtml?: string | null;
      bodyText?: string | null;
      segmentFilter?: SegmentFilter;
      scheduledAt?: Date | null;
    },
  ) {
    const [created] = await db
      .insert(campaigns)
      .values({
        orgId,
        name: data.name,
        type: data.type,
        status: 'draft',
        subject: data.subject ?? null,
        bodyHtml: data.bodyHtml ?? null,
        bodyText: data.bodyText ?? null,
        segmentFilter: data.segmentFilter ?? { allContacts: true },
        scheduledAt: data.scheduledAt ?? null,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
        },
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create campaign');
    }

    logger.info('Campaign created', { orgId, campaignId: created.id });
    return created;
  },

  /**
   * Update a draft campaign
   */
  async update(
    orgId: string,
    campaignId: string,
    data: {
      name?: string;
      subject?: string | null;
      bodyHtml?: string | null;
      bodyText?: string | null;
      segmentFilter?: SegmentFilter;
      scheduledAt?: Date | null;
    },
  ) {
    // Only allow updating drafts
    const [existing] = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!existing) {
      throw Errors.notFound('Campaign');
    }

    if (existing.status !== 'draft') {
      throw Errors.badRequest('Can only update draft campaigns');
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      )
      .returning();

    if (!updated) {
      throw Errors.notFound('Campaign');
    }

    logger.info('Campaign updated', { orgId, campaignId });
    return updated;
  },

  /**
   * Queue a campaign for sending.
   * Resolves the segment filter to populate campaign_recipients,
   * then marks the campaign as 'sending'.
   */
  async send(orgId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!campaign) {
      throw Errors.notFound('Campaign');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw Errors.badRequest('Campaign must be in draft or scheduled status to send');
    }

    // Validate content
    if (campaign.type === 'email' && (!campaign.subject || !campaign.bodyHtml)) {
      throw Errors.badRequest('Email campaigns require a subject and body');
    }

    if (campaign.type === 'sms' && !campaign.bodyText) {
      throw Errors.badRequest('SMS campaigns require body text');
    }

    // Resolve recipients from segment filter
    const filter = campaign.segmentFilter as SegmentFilter;
    const contactConditions = [withOrgScope(contacts.orgId, orgId)];

    if (!filter.allContacts) {
      if (filter.tags && filter.tags.length > 0) {
        contactConditions.push(
          sql`${contacts.tags} && ARRAY[${sql.join(
            filter.tags.map((t) => sql`${t}`),
            sql`, `,
          )}]::text[]`,
        );
      }

      if (filter.minScore !== undefined) {
        contactConditions.push(
          sql`${contacts.aiScore} >= ${filter.minScore}`,
        );
      }

      if (filter.maxScore !== undefined) {
        contactConditions.push(
          sql`${contacts.aiScore} <= ${filter.maxScore}`,
        );
      }

      if (filter.source) {
        contactConditions.push(
          eq(
            contacts.source,
            filter.source as (typeof contacts.source.enumValues)[number],
          ),
        );
      }
    }

    // For email campaigns, only include contacts with email
    if (campaign.type === 'email') {
      contactConditions.push(sql`${contacts.email} IS NOT NULL`);
    }

    // For SMS campaigns, only include contacts with phone
    if (campaign.type === 'sms') {
      contactConditions.push(sql`${contacts.phone} IS NOT NULL`);
    }

    const matchedContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(...contactConditions));

    if (matchedContacts.length === 0) {
      throw Errors.badRequest('No contacts match the segment filter');
    }

    // Insert recipients
    const recipientValues = matchedContacts.map((c) => ({
      campaignId,
      contactId: c.id,
      orgId,
      status: 'pending' as const,
    }));

    // Batch insert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < recipientValues.length; i += chunkSize) {
      const chunk = recipientValues.slice(i, i + chunkSize);
      await db.insert(campaignRecipients).values(chunk);
    }

    // Update campaign status
    const [updated] = await db
      .update(campaigns)
      .set({
        status: 'sending',
        sentAt: new Date(),
        stats: {
          sent: matchedContacts.length,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      )
      .returning();

    logger.info('Campaign queued for sending', {
      orgId,
      campaignId,
      recipientCount: String(matchedContacts.length),
    });

    return { campaign: updated, recipientCount: matchedContacts.length };
  },

  /**
   * Delete a draft campaign
   */
  async delete(orgId: string, campaignId: string) {
    const [existing] = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!existing) {
      throw Errors.notFound('Campaign');
    }

    if (existing.status !== 'draft') {
      throw Errors.badRequest('Can only delete draft campaigns');
    }

    await db
      .delete(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    logger.info('Campaign deleted', { orgId, campaignId });
  },

  /**
   * List recipients for a campaign with statuses
   */
  async getRecipients(
    orgId: string,
    campaignId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify campaign exists and belongs to org
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!campaign) {
      throw Errors.notFound('Campaign');
    }

    const [totalResult] = await db
      .select({ value: count() })
      .from(campaignRecipients)
      .where(
        and(
          withOrgScope(campaignRecipients.orgId, orgId),
          eq(campaignRecipients.campaignId, campaignId),
        ),
      );

    const total = totalResult?.value ?? 0;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: campaignRecipients.id,
        contactId: campaignRecipients.contactId,
        status: campaignRecipients.status,
        sentAt: campaignRecipients.sentAt,
        openedAt: campaignRecipients.openedAt,
        clickedAt: campaignRecipients.clickedAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(campaignRecipients)
      .innerJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
      .where(
        and(
          withOrgScope(campaignRecipients.orgId, orgId),
          eq(campaignRecipients.campaignId, campaignId),
        ),
      )
      .limit(limit)
      .offset(offset);

    return { recipients: rows, total };
  },

  /**
   * Get aggregate stats for a campaign
   */
  async getStats(orgId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          withOrgScope(campaigns.orgId, orgId),
          eq(campaigns.id, campaignId),
        ),
      );

    if (!campaign) {
      throw Errors.notFound('Campaign');
    }

    const stats = campaign.stats as CampaignStats;
    const sent = stats.sent || 0;

    return {
      ...stats,
      openRate: sent > 0 ? (stats.opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (stats.clicked / sent) * 100 : 0,
      bounceRate: sent > 0 ? (stats.bounced / sent) * 100 : 0,
      deliveryRate: sent > 0 ? (stats.delivered / sent) * 100 : 0,
    };
  },
};
