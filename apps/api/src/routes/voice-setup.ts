import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

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
  routing?: Record<string, { voiceUrl: string; smsUrl: string; configuredAt: string }>;
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

// ── Helper: Load phone settings with DB + cache fallback ────────────────────

async function loadPhoneSettings(orgId: string): Promise<{ phone: PhoneSettings | null; orgFound: boolean }> {
  try {
    const { db, organizations, withOrgScope } = await import('@mybizos/db');

    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(withOrgScope(organizations.id, orgId));

    if (!org) {
      logger.warn('Org not found in DB for voice-setup, trying phone-system cache', { orgId });
      // Fall back to phone-system's in-memory cache
      const { getPhoneSettingsFromCache } = await import('./phone-system.js');
      const cached = getPhoneSettingsFromCache(orgId);
      if (cached) {
        return { phone: cached, orgFound: true };
      }
      return { phone: null, orgFound: false };
    }

    const settings = org.settings as OrgSettings | null;
    return { phone: settings?.phone ?? null, orgFound: true };
  } catch (err) {
    logger.warn('DB query failed for voice-setup, trying phone-system cache', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    // DB unavailable — fall back to phone-system's in-memory cache
    try {
      const { getPhoneSettingsFromCache } = await import('./phone-system.js');
      const cached = getPhoneSettingsFromCache(orgId);
      if (cached) {
        return { phone: cached, orgFound: true };
      }
    } catch {
      // phone-system module not available
    }
    return { phone: null, orgFound: false };
  }
}

// ── Helper: Save voice config to DB + cache ─────────────────────────────────

async function saveVoiceConfig(orgId: string, updatedPhone: PhoneSettings): Promise<void> {
  // Always update the phone-system cache so voice-token can find it
  try {
    const { updatePhoneSettingsCache } = await import('./phone-system.js');
    updatePhoneSettingsCache(orgId, updatedPhone);
  } catch {
    // phone-system module not available — continue
  }

  try {
    const { db, organizations, withOrgScope } = await import('@mybizos/db');

    await db
      .update(organizations)
      .set({
        settings: sql`jsonb_set(COALESCE(settings, '{}'), '{phone}', ${JSON.stringify(updatedPhone)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(withOrgScope(organizations.id, orgId));
  } catch (err) {
    logger.warn('DB write failed for voice config, data saved to cache only', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── POST /setup — Create TwiML App + API Key for browser calling ───────────

voiceSetup.post('/setup', async (c) => {
  const orgId = c.get('orgId');

  logger.info('Voice setup requested', { orgId });

  // Load org's Twilio credentials (DB with cache fallback)
  const { phone, orgFound } = await loadPhoneSettings(orgId);

  if (!orgFound && !phone) {
    return c.json(
      { error: `Organization '${orgId}' not found. Make sure you are logged in correctly.`, code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

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
    // Twilio requires a publicly accessible URL for webhooks (not localhost).
    // Use APP_URL in production, or the Railway URL as fallback for dev.
    const PRODUCTION_API_URL = 'https://mybizos-production.up.railway.app';
    const webhookBaseUrl = config.APP_URL.includes('localhost') ? PRODUCTION_API_URL : config.APP_URL;
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

    await saveVoiceConfig(orgId, updatedPhone);

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
        error: `Failed to set up browser calling: ${message}`,
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

  const { phone } = await loadPhoneSettings(orgId);

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
