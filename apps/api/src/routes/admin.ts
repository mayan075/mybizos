import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const admin = new Hono();

// All admin routes require authentication + owner role
admin.use('*', authMiddleware, requireRole('owner'));

// ── In-memory settings store (platform-level) ─────────────────────────────

interface PlatformSettings {
  twilio: { accountSid: string; authToken: string };
  resend: { apiKey: string };
  anthropic: { apiKey: string };
  stripe: { secretKey: string; webhookSecret: string };
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  lastTested: string | null;
}

const platformSettings: PlatformSettings = {
  twilio: { accountSid: config.TWILIO_ACCOUNT_SID, authToken: config.TWILIO_AUTH_TOKEN },
  resend: { apiKey: config.RESEND_API_KEY },
  anthropic: { apiKey: config.ANTHROPIC_API_KEY },
  stripe: { secretKey: config.STRIPE_SECRET_KEY, webhookSecret: config.STRIPE_WEBHOOK_SECRET },
};

const connectionStatuses = new Map<string, ConnectionStatus>();

// ── Zod schemas ───────────────────────────────────────────────────────────

const saveSettingsSchema = z.object({
  section: z.string(),
  settings: z.object({
    twilio: z.object({
      accountSid: z.string(),
      authToken: z.string(),
    }).optional(),
    resend: z.object({
      apiKey: z.string(),
    }).optional(),
    anthropic: z.object({
      apiKey: z.string(),
    }).optional(),
    stripe: z.object({
      secretKey: z.string(),
      webhookSecret: z.string(),
    }).optional(),
  }),
});

const twilioTestSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required'),
  authToken: z.string().min(1, 'Auth Token is required'),
});

const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

// ── POST /admin/settings — Save platform API keys ────────────────────────

admin.post('/settings', async (c) => {
  const rawBody = await c.req.json();
  const parsed = saveSettingsSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const { section, settings } = parsed.data;

  if (settings.twilio) {
    platformSettings.twilio = settings.twilio;
  }
  if (settings.resend) {
    platformSettings.resend = settings.resend;
  }
  if (settings.anthropic) {
    platformSettings.anthropic = settings.anthropic;
  }
  if (settings.stripe) {
    platformSettings.stripe = settings.stripe;
  }

  logger.info('Admin settings updated', { section });

  return c.json({ success: true, section });
});

// ── GET /admin/settings — Get current connection status ──────────────────

admin.get('/settings', async (c) => {
  const statuses: Record<string, ConnectionStatus> = {};
  for (const [key, val] of connectionStatuses.entries()) {
    statuses[key] = val;
  }

  return c.json({
    statuses,
    configured: {
      twilio: Boolean(platformSettings.twilio.accountSid),
      resend: Boolean(platformSettings.resend.apiKey),
      anthropic: Boolean(platformSettings.anthropic.apiKey),
      stripe: Boolean(platformSettings.stripe.secretKey),
    },
  });
});

// ── POST /admin/test/twilio — Test Twilio credentials ────────────────────

admin.post('/test/twilio', async (c) => {
  const rawBody = await c.req.json();
  const parsed = twilioTestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      { success: false, message: 'Invalid credentials format', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const { accountSid, authToken } = parsed.data;

  try {
    // Call Twilio REST API to validate credentials
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json() as { friendly_name: string; status: string };
      const status: ConnectionStatus = {
        connected: true,
        message: `Connected to ${data.friendly_name} (${data.status})`,
        lastTested: new Date().toISOString(),
      };
      connectionStatuses.set('twilio', status);
      // Update stored credentials
      platformSettings.twilio = { accountSid, authToken };
      logger.info('Twilio test succeeded', { accountSid: accountSid.substring(0, 8) + '...' });
      return c.json({ success: true, message: status.message, accountName: data.friendly_name });
    }

    const status: ConnectionStatus = {
      connected: false,
      message: `Authentication failed (${response.status})`,
      lastTested: new Date().toISOString(),
    };
    connectionStatuses.set('twilio', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('twilio', {
      connected: false,
      message,
      lastTested: new Date().toISOString(),
    });
    return c.json({ success: false, message });
  }
});

// ── POST /admin/test/resend — Test Resend API key ────────────────────────

admin.post('/test/resend', async (c) => {
  const rawBody = await c.req.json();
  const parsed = apiKeySchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      { success: false, message: 'API key is required', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const { apiKey } = parsed.data;

  try {
    // Verify by fetching domains (a lightweight endpoint)
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const status: ConnectionStatus = {
        connected: true,
        message: 'API key valid',
        lastTested: new Date().toISOString(),
      };
      connectionStatuses.set('resend', status);
      platformSettings.resend = { apiKey };
      logger.info('Resend test succeeded');
      return c.json({ success: true, message: 'Resend connected — API key is valid' });
    }

    const status: ConnectionStatus = {
      connected: false,
      message: `Invalid API key (${response.status})`,
      lastTested: new Date().toISOString(),
    };
    connectionStatuses.set('resend', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('resend', {
      connected: false,
      message,
      lastTested: new Date().toISOString(),
    });
    return c.json({ success: false, message });
  }
});

// ── POST /admin/test/anthropic — Test Claude API key ─────────────────────

admin.post('/test/anthropic', async (c) => {
  const rawBody = await c.req.json();
  const parsed = apiKeySchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      { success: false, message: 'API key is required', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const { apiKey } = parsed.data;

  try {
    // Send a minimal message to verify the key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    });

    if (response.ok) {
      const status: ConnectionStatus = {
        connected: true,
        message: 'Claude API key valid',
        lastTested: new Date().toISOString(),
      };
      connectionStatuses.set('anthropic', status);
      platformSettings.anthropic = { apiKey };
      logger.info('Anthropic test succeeded');
      return c.json({ success: true, message: 'Anthropic connected — Claude is ready' });
    }

    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = typeof errData.error === 'object' && errData.error !== null
      ? (errData.error as Record<string, string>).message ?? `Status ${response.status}`
      : `Status ${response.status}`;

    const status: ConnectionStatus = {
      connected: false,
      message: errMsg,
      lastTested: new Date().toISOString(),
    };
    connectionStatuses.set('anthropic', status);
    return c.json({ success: false, message: status.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    connectionStatuses.set('anthropic', {
      connected: false,
      message,
      lastTested: new Date().toISOString(),
    });
    return c.json({ success: false, message });
  }
});

// ── GET /admin/stats — Platform-wide statistics ──────────────────────────

admin.get('/stats', async (c) => {
  // In a real app, this would query the database.
  // For now, return placeholders that the dashboard can display.
  return c.json({
    totalOrgs: 1,
    totalPhoneNumbers: 0,
    totalEmailsSent: 0,
    totalAiCalls: 0,
    mrr: 0,
  });
});

export const adminRoutes = admin;
