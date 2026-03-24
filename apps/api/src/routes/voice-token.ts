import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { db, organizations } from '@mybizos/db';

const voiceToken = new Hono();

voiceToken.use('*', authMiddleware, orgScopeMiddleware);

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

// ── GET /token — Generate a Twilio Voice access token for the browser ──────

voiceToken.get('/token', async (c) => {
  const orgId = c.get('orgId');
  const user = c.get('user');

  // Load org settings to get Twilio credentials + voice config
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
        error: 'Phone system not connected. Go to Settings > Phone System to connect your Twilio account.',
        code: 'NO_PHONE_CONFIG',
        status: 400,
      },
      400,
    );
  }

  if (!phone.voice?.twimlAppSid || !phone.voice?.apiKeySid || !phone.voice?.apiKeySecret) {
    return c.json(
      {
        error: 'Browser calling not set up. Run voice setup first.',
        code: 'NO_VOICE_CONFIG',
        status: 400,
        needsSetup: true,
      },
      400,
    );
  }

  try {
    const twilio = await import('twilio');
    const AccessToken = twilio.default.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Identity for this browser session — use the user's ID
    const identity = `user_${user.id}`;

    const token = new AccessToken(
      phone.accountSid,
      phone.voice.apiKeySid,
      phone.voice.apiKeySecret,
      { identity },
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: phone.voice.twimlAppSid,
      incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    logger.info('Voice token generated', {
      orgId,
      userId: user.id,
      identity,
    });

    return c.json({
      token: token.toJwt(),
      identity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to generate voice token', { orgId, error: message });

    return c.json(
      { error: 'Failed to generate voice token. Check your Twilio configuration.', code: 'TOKEN_ERROR', status: 500 },
      500,
    );
  }
});

export { voiceToken as voiceTokenRoutes };
