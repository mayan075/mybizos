import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { platformAssistantService } from '../services/platform-assistant-service.js';
import { reviewService } from '../services/review-service.js';
import { logger } from '../middleware/logger.js';

const aiContentRouter = new Hono();

aiContentRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const generateCampaignSchema = z.object({
  type: z.enum(['email', 'sms']),
  audience: z.string().min(1, 'Audience is required').max(200),
  topic: z.string().min(1, 'Topic is required').max(500),
});

const generateReviewResponseSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
});

// ── Routes ──

/**
 * POST /orgs/:orgId/ai/generate-campaign
 *
 * Generate AI-powered campaign content (email or SMS).
 * Uses Claude to create personalized marketing content based on
 * the business profile, audience, and topic.
 */
aiContentRouter.post('/generate-campaign', async (c) => {
  const orgId = c.get('orgId');

  const body = await c.req.json();
  const parsed = generateCampaignSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors },
      400,
    );
  }

  const { type, audience, topic } = parsed.data;

  try {
    const result = await platformAssistantService.generateCampaignContent(orgId, {
      type,
      audience,
      topic,
    });

    return c.json({
      type,
      ...result,
    });
  } catch (err) {
    logger.error('Campaign content generation failed', {
      orgId,
      type,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Failed to generate campaign content', code: 'AI_GENERATION_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * POST /orgs/:orgId/ai/generate-review-response
 *
 * Generate an AI-powered response to a customer review.
 * Loads the review from the database, sends it to Claude with
 * business context, and returns the suggested response.
 */
aiContentRouter.post('/generate-review-response', async (c) => {
  const orgId = c.get('orgId');

  const body = await c.req.json();
  const parsed = generateReviewResponseSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors },
      400,
    );
  }

  const { reviewId } = parsed.data;

  try {
    // Get the review from DB
    const review = await reviewService.getById(orgId, reviewId);

    // Generate response via Claude
    const aiResponse = await platformAssistantService.generateReviewResponse(orgId, {
      reviewerName: review.reviewerName,
      rating: review.rating,
      reviewText: review.reviewText,
      platform: review.platform,
    });

    return c.json({
      reviewId,
      response: aiResponse,
    });
  } catch (err) {
    logger.error('Review response generation failed', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Re-throw AppErrors (like NOT_FOUND)
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    return c.json(
      { error: 'Failed to generate review response', code: 'AI_GENERATION_ERROR', status: 500 },
      500,
    );
  }
});

export { aiContentRouter as aiContentRoutes };
