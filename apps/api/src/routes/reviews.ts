import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const reviewsRouter = new Hono();

reviewsRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const listReviewsSchema = z.object({
  platform: z.enum(['google', 'facebook', 'yelp', 'internal']).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  responded: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createReviewSchema = z.object({
  contactId: z.string().uuid().nullable().optional().default(null),
  platform: z.enum(['google', 'facebook', 'yelp', 'internal']),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().nullable().optional().default(null),
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  reviewUrl: z.string().url().nullable().optional().default(null),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
});

const postResponseSchema = z.object({
  response: z.string().min(1, 'Response text is required'),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  triggerType: z.enum(['after_appointment', 'after_deal_won', 'manual']),
  delayHours: z.number().int().min(0).default(24),
  messageTemplate: z.string().min(1, 'Message template is required'),
  channel: z.enum(['sms', 'email', 'both']),
  isActive: z.boolean().default(true),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  triggerType: z.enum(['after_appointment', 'after_deal_won', 'manual']).optional(),
  delayHours: z.number().int().min(0).optional(),
  messageTemplate: z.string().min(1).optional(),
  channel: z.enum(['sms', 'email', 'both']).optional(),
  isActive: z.boolean().optional(),
});

// ── Review Routes ──

/**
 * GET /orgs/:orgId/reviews — list reviews with filters
 */
reviewsRouter.get('/', async (c) => {
  const query = listReviewsSchema.parse({
    platform: c.req.query('platform'), minRating: c.req.query('minRating'), maxRating: c.req.query('maxRating'),
    responded: c.req.query('responded'), sentiment: c.req.query('sentiment'), page: c.req.query('page'), limit: c.req.query('limit'),
  });
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const result = await reviewService.list(orgId, query);
    return c.json({ data: result.reviews, pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) } });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.get('/stats', async (c) => {
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const stats = await reviewService.getStats(orgId);
    return c.json({ data: stats });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.get('/:id', async (c) => {
  const reviewId = c.req.param('id');
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const review = await reviewService.getById(orgId, reviewId);
    return c.json({ data: review });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createReviewSchema.parse(body);
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const review = await reviewService.create(orgId, parsed);
    return c.json({ data: review }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.post('/:id/generate-response', async (c) => {
  const reviewId = c.req.param('id');
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const review = await reviewService.generateResponse(orgId, reviewId);
    return c.json({ data: review });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.post('/:id/respond', async (c) => {
  const reviewId = c.req.param('id');
  const body = await c.req.json();
  const parsed = postResponseSchema.parse(body);
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const review = await reviewService.postResponse(orgId, reviewId, parsed.response);
    return c.json({ data: review });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.get('/campaigns', async (c) => {
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const campaigns = await reviewService.listCampaigns(orgId);
    return c.json({ data: campaigns });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.get('/campaigns/:campaignId', async (c) => {
  const campaignId = c.req.param('campaignId');
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const campaign = await reviewService.getCampaign(orgId, campaignId);
    return c.json({ data: campaign });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.post('/campaigns', async (c) => {
  const body = await c.req.json();
  const parsed = createCampaignSchema.parse(body);
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const campaign = await reviewService.createCampaign(orgId, parsed);
    return c.json({ data: campaign }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.patch('/campaigns/:campaignId', async (c) => {
  const campaignId = c.req.param('campaignId');
  const body = await c.req.json();
  const parsed = updateCampaignSchema.parse(body);
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const campaign = await reviewService.updateCampaign(orgId, campaignId, parsed);
    return c.json({ data: campaign });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

reviewsRouter.delete('/campaigns/:campaignId', async (c) => {
  try {
    const { reviewService } = await import('../services/review-service.js');
    const orgId = c.get('orgId');
    const campaignId = c.req.param('campaignId');
    await reviewService.deleteCampaign(orgId, campaignId);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
  return c.json({ data: { message: 'Review campaign deleted successfully' } });
});

export { reviewsRouter as reviewRoutes };
