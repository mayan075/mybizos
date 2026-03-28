import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { TwilioClient } from '@mybizos/integrations';
import { db, organizations, withOrgScope } from '@mybizos/db';
import type { PurchasedNumber } from '@mybizos/integrations';

const phoneSystem = new Hono();

phoneSystem.use('*', authMiddleware, orgScopeMiddleware);

// ── Types for settings JSONB ─────────────────────────────────────────────

interface PhoneSettings {
  provider: string;
  accountSid: string;
  authToken: string;
  accountName: string;
  connectedAt: string;
  routing?: Record<string, NumberRouting>;
}

interface NumberRouting {
  voiceUrl: string;
  smsUrl: string;
  configuredAt: string;
}

interface MybizosPhoneSettings {
  subaccountSid: string;
  subaccountAuthToken: string;
  friendlyName: string;
  setupAt: string;
  numbers: PurchasedNumber[];
}

interface OrgSettings {
  phone?: PhoneSettings;
  mybizosPhone?: MybizosPhoneSettings;
  [key: string]: unknown;
}

// ── In-memory cache (fallback if DB is unavailable) ──────────────────────

const credentialCache = new Map<string, PhoneSettings>();
const mybizosCache = new Map<string, MybizosPhoneSettings>();

// ── Database helpers ─────────────────────────────────────────────────────

/**
 * Read phone settings from the database for an org.
 * Falls back to in-memory cache if DB is unavailable.
 */
async function getPhoneSettings(orgId: string): Promise<PhoneSettings | null> {
  try {
    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(withOrgScope(organizations.id, orgId));

    if (!org) return credentialCache.get(orgId) ?? null;

    const settings = org.settings as OrgSettings | null;
    const phone = settings?.phone ?? null;

    // Sync cache
    if (phone) {
      credentialCache.set(orgId, phone);
    } else {
      credentialCache.delete(orgId);
    }

    return phone;
  } catch (err) {
    logger.warn('DB read failed for phone settings, using cache', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return credentialCache.get(orgId) ?? null;
  }
}

/**
 * Write phone settings to the database for an org.
 * Also updates the in-memory cache.
 */
async function setPhoneSettings(orgId: string, phone: PhoneSettings): Promise<void> {
  // Always update cache immediately
  credentialCache.set(orgId, phone);

  try {
    await db
      .update(organizations)
      .set({
        settings: sql`jsonb_set(COALESCE(settings, '{}'), '{phone}', ${JSON.stringify(phone)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(withOrgScope(organizations.id, orgId));
  } catch (err) {
    logger.error('DB write failed for phone settings, data in cache only', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Remove phone settings from the database for an org.
 */
async function deletePhoneSettings(orgId: string): Promise<void> {
  credentialCache.delete(orgId);

  try {
    await db
      .update(organizations)
      .set({
        settings: sql`COALESCE(settings, '{}') - 'phone'`,
        updatedAt: new Date(),
      })
      .where(withOrgScope(organizations.id, orgId));
  } catch (err) {
    logger.error('DB write failed for phone settings delete', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Read MyBizOS phone settings from the database for an org.
 * Falls back to in-memory cache if DB is unavailable.
 */
async function getMybizosSettings(orgId: string): Promise<MybizosPhoneSettings | null> {
  try {
    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(withOrgScope(organizations.id, orgId));

    if (!org) return mybizosCache.get(orgId) ?? null;

    const settings = org.settings as OrgSettings | null;
    const mybizosPhone = settings?.mybizosPhone ?? null;

    // Sync cache
    if (mybizosPhone) {
      mybizosCache.set(orgId, mybizosPhone);
    } else {
      mybizosCache.delete(orgId);
    }

    return mybizosPhone;
  } catch (err) {
    logger.warn('DB read failed for mybizos phone settings, using cache', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return mybizosCache.get(orgId) ?? null;
  }
}

/**
 * Write MyBizOS phone settings to the database for an org.
 * Also updates the in-memory cache.
 */
async function setMybizosSettings(orgId: string, data: MybizosPhoneSettings): Promise<void> {
  mybizosCache.set(orgId, data);

  try {
    await db
      .update(organizations)
      .set({
        settings: sql`jsonb_set(COALESCE(settings, '{}'), '{mybizosPhone}', ${JSON.stringify(data)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(withOrgScope(organizations.id, orgId));
  } catch (err) {
    logger.error('DB write failed for mybizos phone settings, data in cache only', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Remove MyBizOS phone settings from the database for an org.
 */
async function deleteMybizosSettings(orgId: string): Promise<void> {
  mybizosCache.delete(orgId);

  try {
    await db
      .update(organizations)
      .set({
        settings: sql`COALESCE(settings, '{}') - 'mybizosPhone'`,
        updatedAt: new Date(),
      })
      .where(withOrgScope(organizations.id, orgId));
  } catch (err) {
    logger.error('DB write failed for mybizos phone settings delete', {
      orgId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

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
 * POST /connect — Validate Twilio credentials and persist them.
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

    // Persist credentials to database (with in-memory cache fallback)
    await setPhoneSettings(orgId, {
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
  const creds = await getPhoneSettings(orgId);

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
  const creds = await getPhoneSettings(orgId);

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

    // Persist routing config inside the phone settings
    const routing = creds.routing ?? {};
    routing[numberSid] = {
      voiceUrl,
      smsUrl,
      configuredAt: new Date().toISOString(),
    };

    await setPhoneSettings(orgId, { ...creds, routing });

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
  const creds = await getPhoneSettings(orgId);

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

  await deletePhoneSettings(orgId);

  logger.info('Phone system disconnected', { orgId });

  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
//  MODEL B: MyBizOS Managed Phone Provisioning
//  Uses the MASTER Twilio account (from env) to manage subaccounts.
//  Customers never see Twilio credentials.
// ══════════════════════════════════════════════════════════════════════════

const mybizosSetupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
});

const searchNumbersSchema = z.object({
  countryCode: z.string().length(2, 'Country code must be 2 characters (e.g., AU, US)'),
  type: z.enum(['local', 'mobile', 'tollFree']),
  areaCode: z.string().optional(),
});

const purchaseNumberSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required').startsWith('+', 'Phone number must be in E.164 format'),
});

/**
 * Helper: get master Twilio credentials from env config.
 * Returns null if not configured.
 */
function getMasterCredentials(): { sid: string; authToken: string } | null {
  const sid = config.TWILIO_ACCOUNT_SID;
  const authToken = config.TWILIO_AUTH_TOKEN;
  if (!sid || !authToken || !sid.startsWith('AC')) {
    return null;
  }
  return { sid, authToken };
}

/**
 * POST /mybizos/setup — Create a Twilio subaccount for this org.
 */
phoneSystem.post('/mybizos/setup', async (c) => {
  const orgId = c.get('orgId');
  const rawBody = await c.req.json();

  const parsed = mybizosSetupSchema.safeParse(rawBody);
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

  const master = getMasterCredentials();
  if (!master) {
    return c.json(
      { error: 'Phone provisioning is not configured. Contact support.', code: 'NOT_CONFIGURED', status: 503 },
      503,
    );
  }

  // Check if this org already has a subaccount
  const existing = await getMybizosSettings(orgId);
  if (existing) {
    return c.json({
      success: true,
      subaccountSid: existing.subaccountSid,
      message: 'Subaccount already exists for this organization.',
    });
  }

  try {
    const friendlyName = `MyBizOS - ${parsed.data.businessName} (${orgId})`;
    const subaccount = await TwilioClient.createSubaccount(
      master.sid,
      master.authToken,
      friendlyName,
    );

    await setMybizosSettings(orgId, {
      subaccountSid: subaccount.sid,
      subaccountAuthToken: subaccount.authToken,
      friendlyName: subaccount.friendlyName,
      setupAt: new Date().toISOString(),
      numbers: [],
    });

    logger.info('MyBizOS subaccount created', {
      orgId,
      subaccountSid: subaccount.sid,
      friendlyName: subaccount.friendlyName,
    });

    return c.json({
      success: true,
      subaccountSid: subaccount.sid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to create subaccount', { orgId, error: message });

    return c.json(
      { error: 'Failed to create phone system account. Please try again.', code: 'SUBACCOUNT_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * GET /mybizos/status — Check if this org has a MyBizOS phone setup.
 */
phoneSystem.get('/mybizos/status', async (c) => {
  const orgId = c.get('orgId');
  const orgData = await getMybizosSettings(orgId);

  if (!orgData) {
    return c.json({ setup: false });
  }

  return c.json({
    setup: true,
    subaccountSid: orgData.subaccountSid,
    friendlyName: orgData.friendlyName,
    numberCount: orgData.numbers.length,
    numbers: orgData.numbers.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      capabilities: n.capabilities,
    })),
  });
});

/**
 * GET /mybizos/available-numbers — Search available numbers from Twilio.
 */
phoneSystem.get('/mybizos/available-numbers', async (c) => {
  const orgId = c.get('orgId');

  const query = searchNumbersSchema.safeParse({
    countryCode: c.req.query('countryCode'),
    type: c.req.query('type'),
    areaCode: c.req.query('areaCode') || undefined,
  });

  if (!query.success) {
    const issues = query.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json(
      { error: 'Invalid search parameters', code: 'VALIDATION_ERROR', status: 400, details: issues },
      400,
    );
  }

  const master = getMasterCredentials();
  if (!master) {
    return c.json(
      { error: 'Phone provisioning is not configured. Contact support.', code: 'NOT_CONFIGURED', status: 503 },
      503,
    );
  }

  try {
    const numbers = await TwilioClient.searchAvailableNumbers(
      master.sid,
      master.authToken,
      query.data.countryCode,
      query.data.type,
      query.data.areaCode,
    );

    logger.info('Available numbers searched', {
      orgId,
      countryCode: query.data.countryCode,
      type: query.data.type,
      resultCount: numbers.length,
    });

    return c.json({ numbers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to search available numbers', { orgId, error: message });

    // Twilio returns 404 when no numbers are available for a country/type
    if (message.includes('404') || message.includes('not found') || message.includes('No phone numbers')) {
      return c.json({
        numbers: [],
        message: 'No numbers available for this country and type. Try a different type or area code.',
      });
    }

    return c.json(
      { error: 'Failed to search available numbers. Please try again.', code: 'TWILIO_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * POST /mybizos/purchase — Buy a number and assign to the org's subaccount.
 */
phoneSystem.post('/mybizos/purchase', async (c) => {
  const orgId = c.get('orgId');
  const rawBody = await c.req.json();

  const parsed = purchaseNumberSchema.safeParse(rawBody);
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

  const master = getMasterCredentials();
  if (!master) {
    return c.json(
      { error: 'Phone provisioning is not configured. Contact support.', code: 'NOT_CONFIGURED', status: 503 },
      503,
    );
  }

  // Ensure org has a subaccount (auto-create if needed)
  let orgData = await getMybizosSettings(orgId);
  if (!orgData) {
    try {
      const friendlyName = `MyBizOS - Org ${orgId}`;
      const subaccount = await TwilioClient.createSubaccount(
        master.sid,
        master.authToken,
        friendlyName,
      );

      orgData = {
        subaccountSid: subaccount.sid,
        subaccountAuthToken: subaccount.authToken,
        friendlyName: subaccount.friendlyName,
        setupAt: new Date().toISOString(),
        numbers: [],
      };
      await setMybizosSettings(orgId, orgData);

      logger.info('Auto-created subaccount for purchase', {
        orgId,
        subaccountSid: subaccount.sid,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to auto-create subaccount', { orgId, error: message });
      return c.json(
        { error: 'Failed to set up phone system. Please try again.', code: 'SUBACCOUNT_ERROR', status: 500 },
        500,
      );
    }
  }

  try {
    const webhookBaseUrl = config.APP_URL;
    const purchased = await TwilioClient.purchaseNumber(
      master.sid,
      master.authToken,
      parsed.data.phoneNumber,
      orgData.subaccountSid,
      webhookBaseUrl,
    );

    // Add number to the stored list and persist
    orgData.numbers.push(purchased);
    await setMybizosSettings(orgId, orgData);

    logger.info('Number purchased and assigned', {
      orgId,
      phoneNumber: purchased.phoneNumber,
      numberSid: purchased.sid,
      subaccountSid: orgData.subaccountSid,
    });

    return c.json({
      success: true,
      number: {
        sid: purchased.sid,
        phoneNumber: purchased.phoneNumber,
        friendlyName: purchased.friendlyName,
        capabilities: purchased.capabilities,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to purchase number', {
      orgId,
      phoneNumber: parsed.data.phoneNumber,
      error: message,
    });

    if (message.includes('already been purchased') || message.includes('not available')) {
      return c.json(
        { error: 'This number is no longer available. Please choose another.', code: 'NUMBER_UNAVAILABLE', status: 409 },
        409,
      );
    }

    return c.json(
      { error: 'Failed to purchase phone number. Please try again.', code: 'PURCHASE_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * DELETE /mybizos/numbers/:numberSid — Release a number from the org's subaccount.
 */
phoneSystem.delete('/mybizos/numbers/:numberSid', async (c) => {
  const orgId = c.get('orgId');
  const numberSid = c.req.param('numberSid');

  const master = getMasterCredentials();
  if (!master) {
    return c.json(
      { error: 'Phone provisioning is not configured.', code: 'NOT_CONFIGURED', status: 503 },
      503,
    );
  }

  const orgData = await getMybizosSettings(orgId);
  if (!orgData) {
    return c.json(
      { error: 'No phone system set up for this organization.', code: 'NOT_SETUP', status: 400 },
      400,
    );
  }

  // Verify the number belongs to this org
  const numberIndex = orgData.numbers.findIndex((n) => n.sid === numberSid);
  if (numberIndex === -1) {
    return c.json(
      { error: 'Number not found in this organization.', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  try {
    await TwilioClient.releaseNumber(
      master.sid,
      master.authToken,
      numberSid,
      orgData.subaccountSid,
    );

    // Remove from stored list and persist
    orgData.numbers.splice(numberIndex, 1);
    await setMybizosSettings(orgId, orgData);

    logger.info('Number released', {
      orgId,
      numberSid,
      subaccountSid: orgData.subaccountSid,
    });

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to release number', { orgId, numberSid, error: message });

    return c.json(
      { error: 'Failed to release phone number. Please try again.', code: 'RELEASE_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * GET /mybizos/numbers — List all numbers for this org's subaccount.
 */
phoneSystem.get('/mybizos/numbers', async (c) => {
  const orgId = c.get('orgId');

  const orgData = await getMybizosSettings(orgId);
  if (!orgData) {
    return c.json({ numbers: [] });
  }

  return c.json({
    numbers: orgData.numbers.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      capabilities: n.capabilities,
    })),
  });
});

// ── Cache accessors for voice-setup and voice-token routes ────────────────
// These allow other route files to access the in-memory phone settings cache
// without duplicating the cache or the DB read logic.

/**
 * Read phone settings directly from the in-memory cache.
 * Used by voice-setup.ts and voice-token.ts as a fallback when the DB query
 * fails (e.g., because the orgId is a mock ID that doesn't exist in the DB).
 */
export function getPhoneSettingsFromCache(orgId: string): PhoneSettings | null {
  return credentialCache.get(orgId) ?? null;
}

/**
 * Update the in-memory phone settings cache.
 * Called by voice-setup.ts after successfully creating TwiML App + API Key
 * so that voice-token.ts can immediately find the voice config.
 */
export function updatePhoneSettingsCache(orgId: string, phone: PhoneSettings): void {
  credentialCache.set(orgId, phone);
}

export { phoneSystem as phoneSystemRoutes };
