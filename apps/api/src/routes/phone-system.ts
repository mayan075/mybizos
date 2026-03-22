import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { TwilioClient } from '@mybizos/integrations';

const phoneSystem = new Hono();

phoneSystem.use('*', authMiddleware, orgScopeMiddleware);

// ── In-memory credential store (per org) ──────────────────────────────────

interface StoredCredentials {
  accountSid: string;
  authToken: string;
  provider: string;
  accountName: string;
  connectedAt: string;
}

interface NumberRouting {
  voiceUrl: string;
  smsUrl: string;
  configuredAt: string;
}

const credentialStore = new Map<string, StoredCredentials>();
const routingStore = new Map<string, Map<string, NumberRouting>>();

// ── Zod Schemas ───────────────────────────────────────────────────────────

const connectSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required').startsWith('AC', 'Account SID must start with AC'),
  authToken: z.string().min(1, 'Auth Token is required'),
  provider: z.enum(['byo-twilio']).default('byo-twilio'),
});

const configureSchema = z.object({
  voiceUrl: z.string().url().optional(),
  smsUrl: z.string().url().optional(),
  routingMode: z.enum(['ai-first', 'ring-first', 'forward']).optional(),
  forwardTo: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * POST /connect — Validate Twilio credentials and store them.
 */
phoneSystem.post('/connect', async (c) => {
  const orgId = c.get('orgId');
  const rawBody = await c.req.json();

  const parsed = connectSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: issues },
      400,
    );
  }

  const { accountSid, authToken, provider } = parsed.data;

  try {
    // Actually call Twilio to validate the credentials
    const accountInfo = await TwilioClient.validateCredentials(accountSid, authToken);

    // Store credentials in memory for this org
    credentialStore.set(orgId, {
      accountSid,
      authToken,
      provider,
      accountName: accountInfo.friendlyName,
      connectedAt: new Date().toISOString(),
    });

    logger.info('Phone system connected', {
      orgId,
      provider,
      accountName: accountInfo.friendlyName,
      accountStatus: accountInfo.status,
    });

    return c.json({
      success: true,
      accountName: accountInfo.friendlyName,
      provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('Twilio credential validation failed', { orgId, error: message });

    return c.json(
      {
        error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.',
        code: 'INVALID_CREDENTIALS',
        status: 400,
      },
      400,
    );
  }
});

/**
 * POST /waitlist — Join the MyBizOS managed phone waitlist.
 */
phoneSystem.post('/waitlist', async (c) => {
  const body = await c.req.json();
  logger.info('Phone waitlist signup', { body });
  return c.json({ success: true, message: 'You have been added to the waitlist!' });
});

/**
 * GET /numbers — Fetch real phone numbers from Twilio.
 */
phoneSystem.get('/numbers', async (c) => {
  const orgId = c.get('orgId');
  const creds = credentialStore.get(orgId);

  if (!creds) {
    return c.json(
      { error: 'Phone system not connected. Connect your Twilio account first.', code: 'NOT_CONNECTED', status: 400 },
      400,
    );
  }

  try {
    const numbers = await TwilioClient.listPhoneNumbers(creds.accountSid, creds.authToken);

    return c.json({
      numbers: numbers.map((num) => ({
        sid: num.sid,
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        smsEnabled: num.smsEnabled,
        voiceEnabled: num.voiceEnabled,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to fetch Twilio numbers', { orgId, error: message });

    return c.json(
      { error: 'Failed to fetch phone numbers from Twilio', code: 'TWILIO_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * POST /numbers/:numberSid/configure — Update Twilio number webhooks.
 */
phoneSystem.post('/numbers/:numberSid/configure', async (c) => {
  const orgId = c.get('orgId');
  const numberSid = c.req.param('numberSid');
  const creds = credentialStore.get(orgId);

  if (!creds) {
    return c.json(
      { error: 'Phone system not connected', code: 'NOT_CONNECTED', status: 400 },
      400,
    );
  }

  const rawBody = await c.req.json();
  const parsed = configureSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      { error: 'Invalid configuration', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const voiceUrl = parsed.data.voiceUrl ?? 'https://api.mybizos.com/webhooks/twilio/voice';
  const smsUrl = parsed.data.smsUrl ?? 'https://api.mybizos.com/webhooks/twilio/sms';

  try {
    await TwilioClient.configureWebhooks(
      creds.accountSid,
      creds.authToken,
      numberSid,
      voiceUrl,
      smsUrl,
    );

    // Store routing config
    if (!routingStore.has(orgId)) {
      routingStore.set(orgId, new Map());
    }
    routingStore.get(orgId)!.set(numberSid, {
      voiceUrl,
      smsUrl,
      configuredAt: new Date().toISOString(),
    });

    logger.info('Number configured', { orgId, numberSid, voiceUrl, smsUrl });

    return c.json({ success: true, message: 'Phone number webhooks configured!' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to configure number', { orgId, numberSid, error: message });

    return c.json(
      { error: 'Failed to configure phone number on Twilio', code: 'TWILIO_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * GET /status — Check if this org has a connected phone system.
 */
phoneSystem.get('/status', async (c) => {
  const orgId = c.get('orgId');
  const creds = credentialStore.get(orgId);

  if (!creds) {
    return c.json({ connected: false });
  }

  // Optionally verify credentials are still valid by getting number count
  let numberCount = 0;
  try {
    const numbers = await TwilioClient.listPhoneNumbers(creds.accountSid, creds.authToken);
    numberCount = numbers.length;
  } catch {
    // If we can't reach Twilio, still report as connected but with 0 numbers
    logger.warn('Could not reach Twilio to verify status', { orgId });
  }

  return c.json({
    connected: true,
    provider: creds.provider,
    accountName: creds.accountName,
    numberCount,
  });
});

/**
 * DELETE /disconnect — Remove stored credentials for this org.
 */
phoneSystem.delete('/disconnect', async (c) => {
  const orgId = c.get('orgId');

  credentialStore.delete(orgId);
  routingStore.delete(orgId);

  logger.info('Phone system disconnected', { orgId });

  return c.json({ success: true });
});

export { phoneSystem as phoneSystemRoutes };
