import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { reviewService } from '../services/review-service.js';

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
  const orgId = c.get('orgId');
  const query = listReviewsSchema.parse({
    platform: c.req.query('platform'),
    minRating: c.req.query('minRating'),
    maxRating: c.req.query('maxRating'),
    responded: c.req.query('responded'),
    sentiment: c.req.query('sentiment'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await reviewService.list(orgId, query);

  return c.json({
    data: result.reviews,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

/**
 * GET /orgs/:orgId/reviews/stats — aggregate review stats
 */
reviewsRouter.get('/stats', async (c) => {
  const orgId = c.get('orgId');
  const stats = await reviewService.getStats(orgId);
  return c.json({ data: stats });
});

/**
 * GET /orgs/:orgId/reviews/:id — get single review
 */
reviewsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const reviewId = c.req.param('id');
  const review = await reviewService.getById(orgId, reviewId);
  return c.json({ data: review });
});

/**
 * POST /orgs/:orgId/reviews — create a new review
 */
reviewsRouter.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createReviewSchema.parse(body);
  const review = await reviewService.create(orgId, parsed);
  return c.json({ data: review }, 201);
});

/**
 * POST /orgs/:orgId/reviews/:id/generate-response — AI generates response
 */
reviewsRouter.post('/:id/generate-response', async (c) => {
  const orgId = c.get('orgId');
  const reviewId = c.req.param('id');
  const review = await reviewService.generateResponse(orgId, reviewId);
  return c.json({ data: review });
});

/**
 * POST /orgs/:orgId/reviews/:id/respond — post the response
 */
reviewsRouter.post('/:id/respond', async (c) => {
  const orgId = c.get('orgId');
  const reviewId = c.req.param('id');
  const body = await c.req.json();
  const parsed = postResponseSchema.parse(body);
  const review = await reviewService.postResponse(orgId, reviewId, parsed.response);
  return c.json({ data: review });
});

// ── Campaign Routes ──

/**
 * GET /orgs/:orgId/reviews/campaigns — list review campaigns
 */
reviewsRouter.get('/campaigns', async (c) => {
  const orgId = c.get('orgId');
  const campaigns = await reviewService.listCampaigns(orgId);
  return c.json({ data: campaigns });
});

/**
 * GET /orgs/:orgId/reviews/campaigns/:campaignId — get single campaign
 */
reviewsRouter.get('/campaigns/:campaignId', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('campaignId');
  const campaign = await reviewService.getCampaign(orgId, campaignId);
  return c.json({ data: campaign });
});

/**
 * POST /orgs/:orgId/reviews/campaigns — create a campaign
 */
reviewsRouter.post('/campaigns', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createCampaignSchema.parse(body);
  const campaign = await reviewService.createCampaign(orgId, parsed);
  return c.json({ data: campaign }, 201);
});

/**
 * PATCH /orgs/:orgId/reviews/campaigns/:campaignId — update a campaign
 */
reviewsRouter.patch('/campaigns/:campaignId', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('campaignId');
  const body = await c.req.json();
  const parsed = updateCampaignSchema.parse(body);
  const campaign = await reviewService.updateCampaign(orgId, campaignId, parsed);
  return c.json({ data: campaign });
});

/**
 * DELETE /orgs/:orgId/reviews/campaigns/:campaignId — delete a campaign
 */
reviewsRouter.delete('/campaigns/:campaignId', async (c) => {
  const orgId = c.get('orgId');
  const campaignId = c.req.param('campaignId');
  await reviewService.deleteCampaign(orgId, campaignId);
  return c.json({ data: { message: 'Review campaign deleted successfully' } });
});

export { reviewsRouter as reviewRoutes };
