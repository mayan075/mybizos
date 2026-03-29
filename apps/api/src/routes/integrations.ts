import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, requirePlatformAdmin } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { db, googleCalendarConnections } from '@hararai/db';
import { eq, and } from 'drizzle-orm';
import {
  OAUTH_PROVIDERS,
  buildOAuthUrl,
  exchangeCodeForTokens,
  revokeTokens,
  fetchAccountName,
  type OAuthProvider,
  type OAuthConnection,
  type OAuthCredentials,
  type OAuthConnectionStatus,
} from '@hararai/integrations';

// ─── In-Memory Storage ──────────────────────────────────────────────────────
// In production this will be stored in the database. For now we use Maps.

/** orgId -> provider -> connection */
const connectionStore = new Map<string, Map<OAuthProvider, OAuthConnection>>();

/** Admin-configured OAuth credentials: credentialKey -> value */
const adminCredentialStore = new Map<string, string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_PROVIDERS: OAuthProvider[] = [
  'facebook',
  'instagram',
  'google_business',
  'google_ads',
  'google_analytics',
  'google_calendar',
  'quickbooks',
  'stripe',
];

const providerParamSchema = z.enum([
  'facebook',
  'instagram',
  'google_business',
  'google_ads',
  'google_analytics',
  'google_calendar',
  'quickbooks',
  'stripe',
]);

function getOrgConnections(orgId: string): Map<OAuthProvider, OAuthConnection> {
  let orgMap = connectionStore.get(orgId);
  if (!orgMap) {
    orgMap = new Map();
    connectionStore.set(orgId, orgMap);
  }
  return orgMap;
}

function getCredentials(provider: OAuthProvider): OAuthCredentials | null {
  const providerCfg = OAUTH_PROVIDERS[provider];
  const clientId = adminCredentialStore.get(providerCfg.credentialKeys.clientId);
  const clientSecret = adminCredentialStore.get(providerCfg.credentialKeys.clientSecret);

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

function getRedirectUri(orgId: string, provider: OAuthProvider): string {
  const baseUrl = config.APP_URL || 'http://localhost:3001';
  return `${baseUrl}/orgs/${orgId}/integrations/${provider}/callback`;
}

function generateState(orgId: string, provider: OAuthProvider): string {
  // In production, use a signed JWT or HMAC. For now, base64 encode.
  const payload = JSON.stringify({
    orgId,
    provider,
    ts: Date.now(),
    nonce: Math.random().toString(36).substring(2),
  });
  return Buffer.from(payload).toString('base64url');
}

function parseState(state: string): { orgId: string; provider: OAuthProvider } | null {
  try {
    const payload = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf-8'),
    ) as { orgId: string; provider: string };
    if (!payload.orgId || !VALID_PROVIDERS.includes(payload.provider as OAuthProvider)) {
      return null;
    }
    return { orgId: payload.orgId, provider: payload.provider as OAuthProvider };
  } catch {
    return null;
  }
}

// ─── Route Definitions ──────────────────────────────────────────────────────

const integrations = new Hono();

// All routes require authentication and org scope
integrations.use('*', authMiddleware, orgScopeMiddleware);

// ── GET /status — Connection status for all providers ──

integrations.get('/status', (c) => {
  const orgId = c.get('orgId');
  const orgConnections = getOrgConnections(orgId);

  const status: Record<string, OAuthConnectionStatus> = {};

  for (const provider of VALID_PROVIDERS) {
    const conn = orgConnections.get(provider);
    const providerCfg = OAUTH_PROVIDERS[provider];
    const creds = getCredentials(provider);

    status[provider] = {
      connected: !!conn,
      provider,
      accountName: conn?.accountName ?? null,
      accountId: conn?.accountId ?? null,
      connectedAt: conn?.connectedAt ?? null,
      expiresAt: conn?.tokens.expiresAt ?? null,
    };

    // Also include whether credentials are configured
    (status[provider] as unknown as Record<string, unknown>)['credentialsConfigured'] = !!creds;
    (status[provider] as unknown as Record<string, unknown>)['displayName'] = providerCfg.displayName;
  }

  return c.json({ status });
});

// ── GET /:provider/auth — Redirect to OAuth consent screen ──

integrations.get('/:provider/auth', (c) => {
  const providerParam = c.req.param('provider');
  const parsed = providerParamSchema.safeParse(providerParam);

  if (!parsed.success) {
    return c.json(
      { error: `Invalid provider: ${providerParam}`, code: 'BAD_REQUEST', status: 400 },
      400,
    );
  }

  const provider = parsed.data;
  const orgId = c.get('orgId');
  const credentials = getCredentials(provider);

  if (!credentials) {
    const providerCfg = OAUTH_PROVIDERS[provider];
    return c.json(
      {
        error: `${providerCfg.displayName} integration is not configured. Ask your HararAI admin to add ${providerCfg.credentialKeys.clientId} and ${providerCfg.credentialKeys.clientSecret} in Settings > Integrations.`,
        code: 'INTEGRATION_NOT_CONFIGURED',
        status: 400,
        developerUrl: providerCfg.developerUrl,
      },
      400,
    );
  }

  const redirectUri = getRedirectUri(orgId, provider);
  const state = generateState(orgId, provider);

  const authUrl = buildOAuthUrl(provider, credentials, redirectUri, state);

  logger.info(`OAuth redirect for ${provider}`, { orgId, provider });

  return c.redirect(authUrl);
});

// ── GET /:provider/callback — Handle OAuth callback ──

integrations.get('/:provider/callback', async (c) => {
  const providerParam = c.req.param('provider');
  const parsed = providerParamSchema.safeParse(providerParam);

  if (!parsed.success) {
    return c.json(
      { error: `Invalid provider: ${providerParam}`, code: 'BAD_REQUEST', status: 400 },
      400,
    );
  }

  const provider = parsed.data;
  const orgId = c.get('orgId');

  // Check for error response from provider
  const error = c.req.query('error');
  if (error) {
    const errorDescription = c.req.query('error_description') ?? 'Authorization was denied';
    logger.warn(`OAuth error for ${provider}`, { orgId, error, errorDescription });

    const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
    return c.redirect(
      `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(errorDescription)}&provider=${provider}`,
    );
  }

  // Get the authorization code
  const code = c.req.query('code');
  if (!code) {
    return c.json(
      { error: 'No authorization code received', code: 'BAD_REQUEST', status: 400 },
      400,
    );
  }

  // Validate state parameter
  const stateParam = c.req.query('state');
  if (stateParam) {
    const stateData = parseState(stateParam);
    if (!stateData || stateData.orgId !== orgId || stateData.provider !== provider) {
      return c.json(
        { error: 'Invalid state parameter — possible CSRF attack', code: 'FORBIDDEN', status: 403 },
        403,
      );
    }
  }

  const credentials = getCredentials(provider);
  if (!credentials) {
    return c.json(
      { error: 'Integration credentials not configured', code: 'INTEGRATION_NOT_CONFIGURED', status: 400 },
      400,
    );
  }

  const redirectUri = getRedirectUri(orgId, provider);

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(provider, code, credentials, redirectUri);

    // Fetch the account/page name for display
    const { accountName, accountId } = await fetchAccountName(provider, tokens.accessToken);

    // Store the connection
    const connection: OAuthConnection = {
      provider,
      orgId,
      tokens,
      accountName,
      accountId,
      connectedAt: new Date(),
      metadata: {},
    };

    const orgConnections = getOrgConnections(orgId);
    orgConnections.set(provider, connection);

    // For Google Calendar: also persist tokens to database for sync service
    if (provider === 'google_calendar') {
      const user = c.get('user');
      try {
        // Upsert: update if exists, insert if not
        const [existing] = await db
          .select({ id: googleCalendarConnections.id })
          .from(googleCalendarConnections)
          .where(
            and(
              eq(googleCalendarConnections.orgId, orgId),
              eq(googleCalendarConnections.userId, user.id),
            ),
          );

        if (existing) {
          await db
            .update(googleCalendarConnections)
            .set({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt,
              syncEnabled: true,
              updatedAt: new Date(),
            })
            .where(eq(googleCalendarConnections.id, existing.id));
        } else {
          await db.insert(googleCalendarConnections).values({
            orgId,
            userId: user.id,
            calendarId: 'primary',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          });
        }

        logger.info('Google Calendar tokens persisted to DB', { orgId, userId: user.id });
      } catch (err) {
        logger.error('Failed to persist Google Calendar tokens to DB', {
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
        // Don't fail the OAuth flow — in-memory storage still works
      }
    }

    logger.info(`OAuth connected: ${provider}`, { orgId, accountName, accountId });

    // Redirect back to frontend integrations page with success
    const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
    return c.redirect(
      `${frontendUrl}/dashboard/integrations?connected=${provider}&name=${encodeURIComponent(accountName)}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    logger.error(`OAuth callback error for ${provider}`, { orgId, error: message });

    const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
    return c.redirect(
      `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(message)}&provider=${provider}`,
    );
  }
});

// ── DELETE /:provider — Disconnect an integration ──

integrations.delete('/:provider', async (c) => {
  const providerParam = c.req.param('provider');
  const parsed = providerParamSchema.safeParse(providerParam);

  if (!parsed.success) {
    return c.json(
      { error: `Invalid provider: ${providerParam}`, code: 'BAD_REQUEST', status: 400 },
      400,
    );
  }

  const provider = parsed.data;
  const orgId = c.get('orgId');
  const orgConnections = getOrgConnections(orgId);
  const connection = orgConnections.get(provider);

  if (!connection) {
    return c.json(
      { error: `${OAUTH_PROVIDERS[provider].displayName} is not connected`, code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  // Attempt to revoke tokens at the provider
  const credentials = getCredentials(provider);
  if (credentials) {
    await revokeTokens(provider, connection.tokens.accessToken, credentials);
  }

  // Remove from store
  orgConnections.delete(provider);

  // For Google Calendar: also remove from database
  if (provider === 'google_calendar') {
    const user = c.get('user');
    try {
      await db
        .delete(googleCalendarConnections)
        .where(
          and(
            eq(googleCalendarConnections.orgId, orgId),
            eq(googleCalendarConnections.userId, user.id),
          ),
        );
    } catch (err) {
      logger.error('Failed to remove Google Calendar connection from DB', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info(`OAuth disconnected: ${provider}`, { orgId });

  return c.json({
    success: true,
    message: `${OAUTH_PROVIDERS[provider].displayName} has been disconnected`,
  });
});

// ── Admin Credentials Management ──

const adminCredentialSchema = z.object({
  key: z.string().min(1, 'Credential key is required'),
  value: z.string().min(1, 'Credential value is required'),
});

const adminCredentialsBatchSchema = z.object({
  credentials: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
});

// GET /admin/credentials — List configured credential keys (values masked)
integrations.get('/admin/credentials', requirePlatformAdmin(), (c) => {
  const credentialKeys = [
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'QUICKBOOKS_CLIENT_ID',
    'QUICKBOOKS_CLIENT_SECRET',
    'STRIPE_CLIENT_ID',
  ];

  const configured: Record<string, { configured: boolean; maskedValue: string }> = {};

  for (const key of credentialKeys) {
    const value = adminCredentialStore.get(key);
    configured[key] = {
      configured: !!value,
      maskedValue: value ? `${value.substring(0, 4)}${'*'.repeat(Math.max(0, value.length - 4))}` : '',
    };
  }

  return c.json({ credentials: configured });
});

// POST /admin/credentials — Set OAuth credentials
integrations.post('/admin/credentials', requirePlatformAdmin(), async (c) => {
  const body = await c.req.json();
  const parsed = adminCredentialsBatchSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid credentials payload',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.issues,
      },
      400,
    );
  }

  for (const cred of parsed.data.credentials) {
    adminCredentialStore.set(cred.key, cred.value);
  }

  logger.info('Admin credentials updated', {
    keys: parsed.data.credentials.map((c) => c.key).join(', '),
  });

  return c.json({
    success: true,
    message: `${parsed.data.credentials.length} credential(s) saved`,
  });
});

// DELETE /admin/credentials/:key — Remove a specific credential
integrations.delete('/admin/credentials/:key', requirePlatformAdmin(), (c) => {
  const key = c.req.param('key');
  adminCredentialStore.delete(key);

  return c.json({
    success: true,
    message: `Credential ${key} removed`,
  });
});

export { integrations as integrationRoutes };
