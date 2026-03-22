import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { TwilioClient } from '@mybizos/integrations';
import { db, organizations, withOrgScope } from '@mybizos/db';
import { eq } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

const phoneSystem = new Hono();

// Apply auth + org scope to all routes
phoneSystem.use('*', authMiddleware, orgScopeMiddleware);

// ── Zod Schemas ──

const connectSchema = z.object({
  accountSid: z
    .string()
    .min(1, 'Account SID is required')
    .startsWith('AC', 'Account SID must start with "AC"'),
  authToken: z
    .string()
    .min(1, 'Auth Token is required')
    .min(32, 'Auth Token must be at least 32 characters'),
});

const configureNumberSchema = z.object({
  routingMode: z.enum(['ai-first', 'ring-first', 'forward']).optional(),
  aiConfig: z
    .object({
      voice: z.string().optional(),
      greeting: z.string().optional(),
      transferReasons: z.array(z.string()).optional(),
      transferNumber: z.string().optional(),
    })
    .optional(),
  businessHours: z
    .object({
      enabled: z.boolean(),
      schedule: z
        .array(
          z.object({
            day: z.string(),
            enabled: z.boolean(),
            start: z.string(),
            end: z.string(),
          }),
        )
        .optional(),
      duringHoursRouting: z.enum(['ai-first', 'ring-first', 'forward']).optional(),
      afterHoursRouting: z.enum(['ai-first', 'ring-first', 'forward']).optional(),
    })
    .optional(),
  forwardTo: z.string().optional(),
  ringDuration: z.number().min(10).max(60).optional(),
  noAnswerAction: z.enum(['ai', 'voicemail', 'forward']).optional(),
  recordCalls: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsAutoRespond: z.boolean().optional(),
  afterHoursReply: z.string().optional(),
});

// ── Helpers ──

interface OrgPhoneSettings {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioAccountName?: string;
  phoneNumbers?: Record<
    string,
    z.infer<typeof configureNumberSchema>
  >;
}

/**
 * Read the Twilio-related fields from the org's settings JSONB column.
 */
async function getPhoneSettings(orgId: string): Promise<OrgPhoneSettings> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(withOrgScope(organizations.orgId, orgId));

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  return {
    twilioAccountSid: settings['twilioAccountSid'] as string | undefined,
    twilioAuthToken: settings['twilioAuthToken'] as string | undefined,
    twilioAccountName: settings['twilioAccountName'] as string | undefined,
    phoneNumbers: settings['phoneNumbers'] as OrgPhoneSettings['phoneNumbers'] | undefined,
  };
}

/**
 * Merge phone-system keys into the existing settings JSONB.
 */
async function updatePhoneSettings(
  orgId: string,
  updates: Partial<OrgPhoneSettings>,
): Promise<void> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(withOrgScope(organizations.orgId, orgId));

  const existing = (org?.settings ?? {}) as Record<string, unknown>;
  const merged = { ...existing, ...updates };

  await db
    .update(organizations)
    .set({ settings: merged })
    .where(eq(organizations.id, orgId));
}

/**
 * Remove all Twilio-related keys from org settings.
 */
async function clearPhoneSettings(orgId: string): Promise<void> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(withOrgScope(organizations.orgId, orgId));

  const existing = (org?.settings ?? {}) as Record<string, unknown>;

  delete existing['twilioAccountSid'];
  delete existing['twilioAuthToken'];
  delete existing['twilioAccountName'];
  delete existing['phoneNumbers'];

  await db
    .update(organizations)
    .set({ settings: existing })
    .where(eq(organizations.id, orgId));
}

// ── Routes ──

/**
 * POST /phone-system/connect
 *
 * Validates Twilio credentials and stores them in org settings.
 */
phoneSystem.post('/connect', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = connectSchema.parse(body);

  try {
    const accountInfo = await TwilioClient.validateCredentials(
      parsed.accountSid,
      parsed.authToken,
    );

    await updatePhoneSettings(orgId, {
      twilioAccountSid: parsed.accountSid,
      twilioAuthToken: parsed.authToken,
      twilioAccountName: accountInfo.friendlyName,
    });

    logger.info('Twilio account connected', {
      orgId,
      accountSid: parsed.accountSid,
      accountName: accountInfo.friendlyName,
    });

    return c.json({
      success: true,
      accountName: accountInfo.friendlyName,
    });
  } catch (err) {
    logger.warn('Invalid Twilio credentials provided', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });

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
 * GET /phone-system/numbers
 *
 * Lists all incoming phone numbers from the connected Twilio account.
 */
phoneSystem.get('/numbers', async (c) => {
  const orgId = c.get('orgId');
  const settings = await getPhoneSettings(orgId);

  if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
    return c.json(
      {
        error: 'Twilio account not connected. Connect your account first.',
        code: 'NOT_CONNECTED',
        status: 400,
      },
      400,
    );
  }

  try {
    const numbers = await TwilioClient.listPhoneNumbers(
      settings.twilioAccountSid,
      settings.twilioAuthToken,
    );

    return c.json({ numbers });
  } catch (err) {
    logger.error('Failed to list Twilio phone numbers', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });

    return c.json(
      {
        error: 'Failed to fetch phone numbers from Twilio. Your credentials may have expired.',
        code: 'TWILIO_ERROR',
        status: 502,
      },
      502,
    );
  }
});

/**
 * POST /phone-system/numbers/:numberSid/configure
 *
 * Updates webhooks on a Twilio number and stores routing config.
 */
phoneSystem.post('/numbers/:numberSid/configure', async (c) => {
  const orgId = c.get('orgId');
  const numberSid = c.req.param('numberSid');
  const body = await c.req.json();
  const parsed = configureNumberSchema.parse(body);

  const settings = await getPhoneSettings(orgId);

  if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
    return c.json(
      {
        error: 'Twilio account not connected.',
        code: 'NOT_CONNECTED',
        status: 400,
      },
      400,
    );
  }

  try {
    // Point webhooks to our API
    const voiceUrl = `${config.APP_URL}/webhooks/twilio/voice`;
    const smsUrl = `${config.APP_URL}/webhooks/twilio/sms`;

    await TwilioClient.configureWebhooks(
      settings.twilioAccountSid,
      settings.twilioAuthToken,
      numberSid,
      voiceUrl,
      smsUrl,
    );

    // Store routing config in org settings keyed by number SID
    const phoneNumbers = settings.phoneNumbers ?? {};
    phoneNumbers[numberSid] = parsed;

    await updatePhoneSettings(orgId, { phoneNumbers });

    logger.info('Phone number configured', {
      orgId,
      numberSid,
      routingMode: parsed.routingMode,
    });

    return c.json({ success: true });
  } catch (err) {
    logger.error('Failed to configure Twilio number', {
      orgId,
      numberSid,
      error: err instanceof Error ? err.message : String(err),
    });

    return c.json(
      {
        error: 'Failed to configure phone number. Please try again.',
        code: 'CONFIGURE_FAILED',
        status: 502,
      },
      502,
    );
  }
});

/**
 * DELETE /phone-system/disconnect
 *
 * Removes Twilio credentials from org settings.
 */
phoneSystem.delete('/disconnect', async (c) => {
  const orgId = c.get('orgId');

  await clearPhoneSettings(orgId);

  logger.info('Twilio account disconnected', { orgId });

  return c.json({ success: true });
});

/**
 * GET /phone-system/status
 *
 * Returns the connection status of the Twilio integration.
 */
phoneSystem.get('/status', async (c) => {
  const orgId = c.get('orgId');
  const settings = await getPhoneSettings(orgId);

  if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
    return c.json({ connected: false });
  }

  // Try to get a live number count
  try {
    const numbers = await TwilioClient.listPhoneNumbers(
      settings.twilioAccountSid,
      settings.twilioAuthToken,
    );

    return c.json({
      connected: true,
      accountName: settings.twilioAccountName ?? null,
      numberCount: numbers.length,
    });
  } catch {
    // Credentials may have been revoked
    return c.json({
      connected: true,
      accountName: settings.twilioAccountName ?? null,
      numberCount: null,
    });
  }
});

export { phoneSystem as phoneSystemRoutes };
