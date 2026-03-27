import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const socialRoutes = new Hono();
socialRoutes.use('*', authMiddleware, orgScopeMiddleware);

const createPostSchema = z.object({
  text: z.string().min(1),
  platforms: z.array(z.string()).min(1),
  status: z.enum(['draft', 'scheduled']).default('draft'),
  scheduledAt: z.string().optional(),
  imageUrl: z.string().optional(),
});

const updatePostSchema = createPostSchema.partial();

const listSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

socialRoutes.get('/posts', async (c) => {
  const orgId = c.get('orgId');
  const query = listSchema.parse({
    status: c.req.query('status'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { db, socialPosts, withOrgScope } = await import('@mybizos/db');
    const { and, eq, desc, count } = await import('drizzle-orm');

    const conditions = [withOrgScope(socialPosts.orgId, orgId)];
    if (query.status) conditions.push(eq(socialPosts.status, query.status));

    const whereClause = and(...conditions);
    const [totalResult] = await db.select({ value: count() }).from(socialPosts).where(whereClause);
    const total = totalResult?.value ?? 0;
    const offset = (query.page - 1) * query.limit;

    const rows = await db.select().from(socialPosts)
      .where(whereClause)
      .orderBy(desc(socialPosts.createdAt))
      .limit(query.limit)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  } catch (err) {
    logger.error('Failed to list social posts', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

socialRoutes.post('/posts', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createPostSchema.parse(body);

  try {
    const { db, socialPosts } = await import('@mybizos/db');

    const [created] = await db.insert(socialPosts).values({
      orgId,
      text: parsed.text,
      platforms: parsed.platforms,
      status: parsed.status,
      scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
      imageUrl: parsed.imageUrl ?? null,
    }).returning();

    if (!created) return c.json({ error: 'Failed to create post', code: 'INTERNAL_ERROR', status: 500 }, 500);

    logger.info('Social post created', { orgId, postId: created.id, status: parsed.status });
    return c.json({ data: created }, 201);
  } catch (err) {
    logger.error('Failed to create social post', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

socialRoutes.patch('/posts/:id', async (c) => {
  const orgId = c.get('orgId');
  const postId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updatePostSchema.parse(body);

  try {
    const { db, socialPosts, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const updateData: Record<string, unknown> = {};
    if (parsed.text !== undefined) updateData.text = parsed.text;
    if (parsed.platforms !== undefined) updateData.platforms = parsed.platforms;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.scheduledAt !== undefined) updateData.scheduledAt = new Date(parsed.scheduledAt);
    if (parsed.imageUrl !== undefined) updateData.imageUrl = parsed.imageUrl;

    const [updated] = await db.update(socialPosts).set(updateData)
      .where(and(withOrgScope(socialPosts.orgId, orgId), eq(socialPosts.id, postId))).returning();

    if (!updated) return c.json({ error: 'Post not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

socialRoutes.delete('/posts/:id', async (c) => {
  const orgId = c.get('orgId');
  const postId = c.req.param('id');
  try {
    const { db, socialPosts, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const result = await db.delete(socialPosts)
      .where(and(withOrgScope(socialPosts.orgId, orgId), eq(socialPosts.id, postId)))
      .returning({ id: socialPosts.id });

    if (result.length === 0) return c.json({ error: 'Post not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: { message: 'Post deleted' } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

socialRoutes.post('/suggestions', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db, organizations, withOrgScope } = await import('@mybizos/db');

    const [org] = await db.select({ name: organizations.name, vertical: organizations.vertical })
      .from(organizations).where(withOrgScope(organizations.id, orgId));

    const businessName = org?.name ?? 'Our Business';
    const vertical = org?.vertical ?? 'general';

    // Generate suggestions using Claude
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { config } = await import('../config.js');

    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate 3 short social media post ideas for a ${vertical} business called "${businessName}". Each post should be engaging and under 280 characters. Return as JSON array: [{"text": "...", "category": "educational|promotional|social_proof"}]`,
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return c.json({ data: suggestions });
  } catch (err) {
    logger.error('Failed to generate suggestions', { orgId, error: err instanceof Error ? err.message : String(err) });
    // Fallback suggestions
    return c.json({
      data: [
        { text: "Did you know? Regular maintenance saves you money in the long run. Book a checkup today!", category: "educational" },
        { text: "Another happy customer! Thank you for trusting us with your home.", category: "social_proof" },
        { text: "Limited time offer: 10% off all services this week. Call now!", category: "promotional" },
      ],
    });
  }
});

export { socialRoutes };
