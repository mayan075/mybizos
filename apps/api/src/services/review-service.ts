import {
  db,
  reviews,
  reviewCampaigns,
  withOrgScope,
} from '@hararai/db';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface ReviewFilters {
  platform?: 'google' | 'facebook' | 'yelp' | 'internal';
  minRating?: number;
  maxRating?: number;
  responded?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  page: number;
  limit: number;
}

export const reviewService = {
  /**
   * List reviews for an org with filtering and pagination.
   */
  async list(orgId: string, filters: ReviewFilters) {
    const conditions = [withOrgScope(reviews.orgId, orgId)];

    if (filters.platform) {
      conditions.push(eq(reviews.platform, filters.platform));
    }

    if (filters.minRating !== undefined) {
      conditions.push(sql`${reviews.rating} >= ${filters.minRating}`);
    }

    if (filters.maxRating !== undefined) {
      conditions.push(sql`${reviews.rating} <= ${filters.maxRating}`);
    }

    if (filters.responded !== undefined) {
      conditions.push(eq(reviews.responsePosted, filters.responded));
    }

    if (filters.sentiment) {
      conditions.push(eq(reviews.sentiment, filters.sentiment));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(reviews)
      .where(whereClause);

    const total = totalResult?.value ?? 0;
    const offset = (filters.page - 1) * filters.limit;

    const rows = await db
      .select()
      .from(reviews)
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(filters.limit)
      .offset(offset);

    return { reviews: rows, total };
  },

  /**
   * Get a single review by ID.
   */
  async getById(orgId: string, reviewId: string) {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(
        withOrgScope(reviews.orgId, orgId),
        eq(reviews.id, reviewId),
      ));

    if (!review) {
      throw Errors.notFound('Review');
    }

    return review;
  },

  /**
   * Create a new review record.
   */
  async create(
    orgId: string,
    data: {
      contactId?: string | null;
      platform: 'google' | 'facebook' | 'yelp' | 'internal';
      rating: number;
      reviewText?: string | null;
      reviewerName: string;
      reviewUrl?: string | null;
      sentiment: 'positive' | 'neutral' | 'negative';
    },
  ) {
    const [created] = await db
      .insert(reviews)
      .values({
        orgId,
        contactId: data.contactId ?? null,
        platform: data.platform,
        rating: data.rating,
        reviewText: data.reviewText ?? null,
        reviewerName: data.reviewerName,
        reviewUrl: data.reviewUrl ?? null,
        sentiment: data.sentiment,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create review');
    }

    logger.info('Review created', { orgId, reviewId: created.id });
    return created;
  },

  /**
   * Generate an AI response for a review using Claude.
   * Uses real Claude API via platformAssistantService, with template fallback.
   */
  async generateResponse(orgId: string, reviewId: string) {
    const review = await reviewService.getById(orgId, reviewId);

    // Use real Claude API for response generation
    let aiResponse: string;
    try {
      const { platformAssistantService } = await import('./platform-assistant-service.js');
      aiResponse = await platformAssistantService.generateReviewResponse(orgId, {
        reviewerName: review.reviewerName,
        rating: review.rating,
        reviewText: review.reviewText,
        platform: review.platform,
      });
    } catch (err) {
      logger.warn('Claude API failed for review response, using template fallback', {
        orgId,
        reviewId,
        error: err instanceof Error ? err.message : String(err),
      });
      aiResponse = generateMockAIResponse(review);
    }

    const [updated] = await db
      .update(reviews)
      .set({
        aiResponse,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(reviews.orgId, orgId),
        eq(reviews.id, reviewId),
      ))
      .returning();

    if (!updated) {
      throw Errors.internal('Failed to save AI response');
    }

    logger.info('AI response generated for review', { orgId, reviewId });
    return updated;
  },

  /**
   * Mark a response as posted.
   */
  async postResponse(orgId: string, reviewId: string, response: string) {
    const [updated] = await db
      .update(reviews)
      .set({
        aiResponse: response,
        responsePosted: true,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(reviews.orgId, orgId),
        eq(reviews.id, reviewId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Review');
    }

    logger.info('Review response posted', { orgId, reviewId });
    return updated;
  },

  /**
   * Get aggregate stats for an org's reviews.
   */
  async getStats(orgId: string) {
    const scope = withOrgScope(reviews.orgId, orgId);

    const [totals] = await db
      .select({
        totalReviews: count(),
        avgRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 2)`,
      })
      .from(reviews)
      .where(scope);

    const [responded] = await db
      .select({ value: count() })
      .from(reviews)
      .where(and(scope, eq(reviews.responsePosted, true)));

    const byPlatform = await db
      .select({
        platform: reviews.platform,
        count: count(),
        avgRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 2)`,
      })
      .from(reviews)
      .where(scope)
      .groupBy(reviews.platform);

    const byRating = await db
      .select({
        rating: reviews.rating,
        count: count(),
      })
      .from(reviews)
      .where(scope)
      .groupBy(reviews.rating)
      .orderBy(desc(reviews.rating));

    const totalReviews = totals?.totalReviews ?? 0;
    const respondedCount = responded?.value ?? 0;

    return {
      totalReviews,
      avgRating: totals?.avgRating ?? 0,
      responseRate: totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0,
      byPlatform,
      ratingDistribution: byRating,
    };
  },

  // ── Review Campaigns ──

  async listCampaigns(orgId: string) {
    const rows = await db
      .select()
      .from(reviewCampaigns)
      .where(withOrgScope(reviewCampaigns.orgId, orgId))
      .orderBy(desc(reviewCampaigns.createdAt));

    return rows;
  },

  async getCampaign(orgId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(reviewCampaigns)
      .where(and(
        withOrgScope(reviewCampaigns.orgId, orgId),
        eq(reviewCampaigns.id, campaignId),
      ));

    if (!campaign) {
      throw Errors.notFound('Review campaign');
    }

    return campaign;
  },

  async createCampaign(
    orgId: string,
    data: {
      name: string;
      triggerType: 'after_appointment' | 'after_deal_won' | 'manual';
      delayHours?: number;
      messageTemplate: string;
      channel: 'sms' | 'email' | 'both';
      isActive?: boolean;
    },
  ) {
    const [created] = await db
      .insert(reviewCampaigns)
      .values({
        orgId,
        name: data.name,
        triggerType: data.triggerType,
        delayHours: data.delayHours ?? 24,
        messageTemplate: data.messageTemplate,
        channel: data.channel,
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create review campaign');
    }

    logger.info('Review campaign created', { orgId, campaignId: created.id });
    return created;
  },

  async updateCampaign(
    orgId: string,
    campaignId: string,
    data: {
      name?: string;
      triggerType?: 'after_appointment' | 'after_deal_won' | 'manual';
      delayHours?: number;
      messageTemplate?: string;
      channel?: 'sms' | 'email' | 'both';
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(reviewCampaigns)
      .set(data)
      .where(and(
        withOrgScope(reviewCampaigns.orgId, orgId),
        eq(reviewCampaigns.id, campaignId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Review campaign');
    }

    logger.info('Review campaign updated', { orgId, campaignId });
    return updated;
  },

  async deleteCampaign(orgId: string, campaignId: string) {
    const result = await db
      .delete(reviewCampaigns)
      .where(and(
        withOrgScope(reviewCampaigns.orgId, orgId),
        eq(reviewCampaigns.id, campaignId),
      ))
      .returning({ id: reviewCampaigns.id });

    if (result.length === 0) {
      throw Errors.notFound('Review campaign');
    }

    logger.info('Review campaign deleted', { orgId, campaignId });
  },
};

// ── Helpers ──

function buildReviewResponsePrompt(review: {
  reviewerName: string;
  rating: number;
  reviewText: string | null;
  platform: string;
}): string {
  return [
    'You are a professional business owner responding to a customer review.',
    `Platform: ${review.platform}`,
    `Reviewer: ${review.reviewerName}`,
    `Rating: ${review.rating}/5`,
    `Review text: ${review.reviewText ?? '(no text)'}`,
    '',
    'Write a brief, warm, and professional response. If the review is negative,',
    'acknowledge the concern and offer to make it right. Keep it under 100 words.',
  ].join('\n');
}

function generateMockAIResponse(review: {
  reviewerName: string;
  rating: number;
  reviewText: string | null;
}): string {
  if (review.rating >= 4) {
    return `Thank you so much for the wonderful ${review.rating}-star review, ${review.reviewerName}! We're thrilled to hear about your positive experience. Your feedback means the world to our team. We look forward to serving you again!`;
  }
  if (review.rating === 3) {
    return `Thank you for your feedback, ${review.reviewerName}. We appreciate you taking the time to share your experience. We're always looking to improve and would love to hear more about how we can better serve you. Please don't hesitate to reach out to us directly.`;
  }
  return `${review.reviewerName}, thank you for bringing this to our attention. We sincerely apologize for the experience you had. This is not the level of service we strive for. Please contact us directly so we can make this right. Your satisfaction is our top priority.`;
}
