import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { db, organizations } from '@mybizos/db';

const voiceSetup = new Hono();

voiceSetup.use('*', authMiddleware, orgScopeMiddleware);

// ── Types ──────────────────────────────────────────────────────────────────

interface VoiceSettings {
  twimlAppSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  setupAt: string;
}

interface PhoneSettings {
  provider: string;
  accountSid: string;
  authToken: string;
  accountName: string;
  connectedAt: string;
  voice?: VoiceSettings;
  routing?: Record<string, unknown>;
}

interface OrgSettings {
  phone?: PhoneSettings;
  [key: string]: unknown;
}

// ── Helper: XML-escape ─────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── POST /setup — Create TwiML App + API Key for browser calling ───────────

voiceSetup.post('/setup', async (c) => {
  const orgId = c.get('orgId');

  // Load org's Twilio credentials
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    return c.json(
      { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  const settings = org.settings as OrgSettings | null;
  const phone = settings?.phone;

  if (!phone?.accountSid || !phone?.authToken) {
    return c.json(
      {
        error: 'Phone system not connected. Connect your Twilio account first in Settings > Phone System.',
        code: 'NO_PHONE_CONFIG',
        status: 400,
      },
      400,
    );
  }

  // Check if already set up
  if (phone.voice?.twimlAppSid && phone.voice?.apiKeySid && phone.voice?.apiKeySecret) {
    logger.info('Voice already set up, returning existing config', { orgId });
    return c.json({
      success: true,
      twimlAppSid: phone.voice.twimlAppSid,
      message: 'Browser calling is already configured.',
    });
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(phone.accountSid, phone.authToken);

    // 1. Create TwiML App — voice URL points to our webhook
    const webhookBaseUrl = config.APP_URL;
    const voiceUrl = `${webhookBaseUrl}/voice/twiml`;
    const statusCallbackUrl = `${webhookBaseUrl}/webhooks/twilio/status`;

    logger.info('Creating TwiML App', { orgId, voiceUrl });

    const twimlApp = await client.applications.create({
      friendlyName: `MyBizOS Browser Calling - ${orgId}`,
      voiceMethod: 'POST',
      voiceUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
    });

    // 2. Create API Key + Secret (required for Voice SDK tokens)
    logger.info('Creating API Key', { orgId });

    const apiKey = await client.newKeys.create({
      friendlyName: `MyBizOS Voice SDK - ${orgId}`,
    });

    // 3. Store everything in org settings
    const voiceConfig: VoiceSettings = {
      twimlAppSid: twimlApp.sid,
      apiKeySid: apiKey.sid,
      apiKeySecret: apiKey.secret,
      setupAt: new Date().toISOString(),
    };

    const updatedPhone: PhoneSettings = {
      ...phone,
      voice: voiceConfig,
    };

    await db
      .update(organizations)
      .set({
        settings: sql`jsonb_set(COALESCE(settings, '{}'), '{phone}', ${JSON.stringify(updatedPhone)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    logger.info('Voice setup complete', {
      orgId,
      twimlAppSid: twimlApp.sid,
      apiKeySid: apiKey.sid,
    });

    return c.json({
      success: true,
      twimlAppSid: twimlApp.sid,
      message: 'Browser calling configured! You can now make calls from the dialer.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Voice setup failed', { orgId, error: message });

    return c.json(
      {
        error: 'Failed to set up browser calling. Check your Twilio account permissions.',
        code: 'SETUP_ERROR',
        status: 500,
      },
      500,
    );
  }
});

// ── GET /status — Check voice calling setup status ─────────────────────────

voiceSetup.get('/status', async (c) => {
  const orgId = c.get('orgId');

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    return c.json({ setup: false, phoneConnected: false });
  }

  const settings = org.settings as OrgSettings | null;
  const phone = settings?.phone;

  if (!phone?.accountSid) {
    return c.json({ setup: false, phoneConnected: false });
  }

  const hasVoice = !!(phone.voice?.twimlAppSid && phone.voice?.apiKeySid && phone.voice?.apiKeySecret);

  return c.json({
    setup: hasVoice,
    phoneConnected: true,
    twimlAppSid: hasVoice ? phone.voice?.twimlAppSid : null,
  });
});

export { voiceSetup as voiceSetupRoutes };
