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
    const { db, socialPosts, withOrgScope } = await import('@hararai/db');
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
    const { db, socialPosts } = await import('@hararai/db');

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
    const { db, socialPosts, withOrgScope } = await import('@hararai/db');
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
    const { db, socialPosts, withOrgScope } = await import('@hararai/db');
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
    const { db, organizations, withOrgScope } = await import('@hararai/db');

    const [org] = await db.select({ name: organizations.name, industry: organizations.industry })
      .from(organizations).where(withOrgScope(organizations.id, orgId));

    const businessName = org?.name ?? 'Our Business';
    const industry = org?.industry ?? 'general';

    // Generate suggestions using Claude
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { config } = await import('../config.js');

    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate 3 short social media post ideas for a ${industry} business called "${businessName}". Each post should be engaging and under 280 characters. Return as JSON array: [{"text": "...", "category": "educational|promotional|social_proof"}]`,
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

// ── Social Account Management ──

/**
 * GET /social/accounts — list connected social accounts
 */
socialRoutes.get('/accounts', async (c) => {
  const orgId = c.get('orgId');
  try {
    const { db, socialAccounts, withOrgScope } = await import('@hararai/db');
    const rows = await db.select().from(socialAccounts)
      .where(withOrgScope(socialAccounts.orgId, orgId));

    return c.json({ data: rows });
  } catch (err) {
    logger.error('Failed to list social accounts', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /social/connect/:platform — initiate OAuth connection for a platform.
 * Returns the OAuth authorization URL to redirect the user to.
 */
socialRoutes.post('/connect/:platform', async (c) => {
  const orgId = c.get('orgId');
  const platform = c.req.param('platform');
  const { config } = await import('../config.js');

  const validPlatforms = ['facebook', 'instagram', 'google_business', 'linkedin'];
  if (!validPlatforms.includes(platform)) {
    return c.json({ error: `Unsupported platform: ${platform}`, code: 'BAD_REQUEST', status: 400 }, 400);
  }

  // Build OAuth URL based on platform
  const redirectBase = `${config.APP_URL}/orgs/${orgId}/social/callback/${platform}`;
  const state = Buffer.from(JSON.stringify({ orgId, platform })).toString('base64url');

  let authUrl: string;

  switch (platform) {
    case 'facebook':
    case 'instagram': {
      // Meta OAuth — covers both Facebook Pages and Instagram
      const appId = config.STRIPE_SECRET_KEY ? '' : ''; // Will use org-level settings
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=FACEBOOK_APP_ID` +
        `&redirect_uri=${encodeURIComponent(redirectBase)}` +
        `&state=${state}` +
        `&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish`;
      break;
    }
    case 'google_business': {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${config.GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectBase)}` +
        `&response_type=code` +
        `&state=${state}` +
        `&scope=https://www.googleapis.com/auth/business.manage` +
        `&access_type=offline&prompt=consent`;
      break;
    }
    case 'linkedin': {
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=LINKEDIN_CLIENT_ID` +
        `&redirect_uri=${encodeURIComponent(redirectBase)}` +
        `&state=${state}` +
        `&scope=w_member_social`;
      break;
    }
    default:
      return c.json({ error: 'Platform not supported', code: 'BAD_REQUEST', status: 400 }, 400);
  }

  logger.info('Social OAuth initiated', { orgId, platform });
  return c.json({ data: { authUrl, platform } });
});

/**
 * POST /social/callback/:platform — handle OAuth callback.
 * Exchanges auth code for tokens and saves the connected account.
 */
socialRoutes.post('/callback/:platform', async (c) => {
  const orgId = c.get('orgId');
  const platform = c.req.param('platform');
  const body = await c.req.json();
  const code = z.string().parse(body.code);

  try {
    const { db, socialAccounts } = await import('@hararai/db');

    // Exchange code for token (platform-specific)
    // For now, save the token directly — in production, this would call the platform's token endpoint
    const tokenData = {
      accessToken: code, // Placeholder — real implementation exchanges code
      refreshToken: body.refreshToken ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      accountName: body.accountName ?? `${platform} Account`,
      platformAccountId: body.platformAccountId ?? `${platform}-${Date.now()}`,
      platformPageId: body.platformPageId ?? null,
    };

    const [account] = await db.insert(socialAccounts).values({
      orgId,
      platform: platform as 'facebook' | 'instagram' | 'google_business' | 'linkedin' | 'nextdoor',
      ...tokenData,
    }).returning();

    logger.info('Social account connected', { orgId, platform, accountId: account?.id });
    return c.json({ data: account }, 201);
  } catch (err) {
    logger.error('Failed to connect social account', { orgId, platform, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Failed to connect account', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

/**
 * DELETE /social/accounts/:id — disconnect a social account
 */
socialRoutes.delete('/accounts/:id', async (c) => {
  const orgId = c.get('orgId');
  const accountId = c.req.param('id');

  try {
    const { db, socialAccounts, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const result = await db.delete(socialAccounts)
      .where(and(withOrgScope(socialAccounts.orgId, orgId), eq(socialAccounts.id, accountId)))
      .returning({ id: socialAccounts.id });

    if (result.length === 0) {
      return c.json({ error: 'Account not found', code: 'NOT_FOUND', status: 404 }, 404);
    }

    logger.info('Social account disconnected', { orgId, accountId });
    return c.json({ data: { message: 'Account disconnected' } });
  } catch (err) {
    logger.error('Failed to disconnect social account', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /social/posts/:id/publish — publish a post to connected platforms
 */
socialRoutes.post('/posts/:id/publish', async (c) => {
  const orgId = c.get('orgId');
  const postId = c.req.param('id');

  try {
    const { db, socialPosts, socialAccounts, withOrgScope } = await import('@hararai/db');
    const { and, eq, inArray } = await import('drizzle-orm');

    // Get the post
    const [post] = await db.select().from(socialPosts)
      .where(and(withOrgScope(socialPosts.orgId, orgId), eq(socialPosts.id, postId)));

    if (!post) return c.json({ error: 'Post not found', code: 'NOT_FOUND', status: 404 }, 404);

    const platforms = (post.platforms as string[]) ?? [];
    if (platforms.length === 0) {
      return c.json({ error: 'No platforms selected', code: 'BAD_REQUEST', status: 400 }, 400);
    }

    // Get connected accounts for the target platforms
    const accounts = await db.select().from(socialAccounts)
      .where(and(
        withOrgScope(socialAccounts.orgId, orgId),
        eq(socialAccounts.isActive, true),
      ));

    const connectedPlatforms = new Set(accounts.map((a: any) => a.platform));
    const missingPlatforms = platforms.filter((p: string) => !connectedPlatforms.has(p));

    if (missingPlatforms.length > 0) {
      return c.json({
        error: `Not connected to: ${missingPlatforms.join(', ')}`,
        code: 'MISSING_CONNECTIONS',
        status: 400,
        missingPlatforms,
      }, 400);
    }

    // Publish to each platform (platform-specific API calls)
    const results: Array<{ platform: string; success: boolean; error?: string }> = [];

    for (const account of accounts) {
      if (!platforms.includes(account.platform)) continue;

      try {
        // Platform-specific publishing
        switch (account.platform) {
          case 'facebook': {
            // POST to Facebook Graph API
            const pageId = account.platformPageId || account.platformAccountId;
            const fbRes = await fetch(
              `https://graph.facebook.com/v19.0/${pageId}/feed`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: post.text,
                  access_token: account.accessToken,
                }),
              },
            );
            if (!fbRes.ok) {
              const fbErr = await fbRes.text();
              throw new Error(`Facebook API error: ${fbErr}`);
            }
            results.push({ platform: 'facebook', success: true });
            break;
          }
          case 'google_business': {
            // POST to Google Business Profile API
            const gbpRes = await fetch(
              `https://mybusiness.googleapis.com/v4/accounts/${account.platformAccountId}/locations/${account.platformPageId}/localPosts`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${account.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  summary: post.text,
                  languageCode: 'en',
                  topicType: 'STANDARD',
                }),
              },
            );
            if (!gbpRes.ok) {
              const gbpErr = await gbpRes.text();
              throw new Error(`Google Business API error: ${gbpErr}`);
            }
            results.push({ platform: 'google_business', success: true });
            break;
          }
          case 'linkedin': {
            // POST to LinkedIn UGC API
            const liRes = await fetch(
              'https://api.linkedin.com/v2/ugcPosts',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${account.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  author: `urn:li:person:${account.platformAccountId}`,
                  lifecycleState: 'PUBLISHED',
                  specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                      shareCommentary: { text: post.text },
                      shareMediaCategory: 'NONE',
                    },
                  },
                  visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
                }),
              },
            );
            if (!liRes.ok) {
              const liErr = await liRes.text();
              throw new Error(`LinkedIn API error: ${liErr}`);
            }
            results.push({ platform: 'linkedin', success: true });
            break;
          }
          default:
            results.push({ platform: account.platform, success: false, error: 'Platform not yet supported for publishing' });
        }
      } catch (publishErr) {
        const msg = publishErr instanceof Error ? publishErr.message : String(publishErr);
        logger.error('Failed to publish to platform', { orgId, platform: account.platform, error: msg });
        results.push({ platform: account.platform, success: false, error: msg });
      }
    }

    // Update post status
    const allSucceeded = results.every((r) => r.success);
    const anySucceeded = results.some((r) => r.success);

    await db.update(socialPosts).set({
      status: allSucceeded ? 'published' : anySucceeded ? 'partially_published' : 'failed',
      publishedAt: anySucceeded ? new Date() : null,
      metrics: { publishResults: results },
    }).where(and(withOrgScope(socialPosts.orgId, orgId), eq(socialPosts.id, postId)));

    logger.info('Social post publish attempted', { orgId, postId, results });
    return c.json({
      data: {
        postId,
        status: allSucceeded ? 'published' : anySucceeded ? 'partially_published' : 'failed',
        results,
      },
    });
  } catch (err) {
    logger.error('Failed to publish social post', { orgId, postId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Failed to publish post', code: 'INTERNAL_ERROR', status: 500 }, 500);
  }
});

export { socialRoutes };
