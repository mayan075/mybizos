import { Hono } from 'hono';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';
import { db, organizations } from '@mybizos/db';
import { sql } from 'drizzle-orm';

const voiceTwiml = new Hono();

// ── Helper: XML-escape ─────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twimlResponse(c: { text: (data: string, status?: number, headers?: Record<string, string>) => Response }, twiml: string) {
  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
}

// ── Types ──────────────────────────────────────────────────────────────────

interface PhoneSettings {
  provider: string;
  accountSid: string;
  authToken: string;
  accountName: string;
  connectedAt: string;
  voice?: {
    twimlAppSid: string;
    apiKeySid: string;
    apiKeySecret: string;
    setupAt: string;
  };
  routing?: Record<string, unknown>;
}

interface MybizosPhoneSettings {
  subaccountSid: string;
  subaccountAuthToken: string;
  friendlyName: string;
  setupAt: string;
  numbers: Array<{
    sid: string;
    phoneNumber: string;
    friendlyName: string;
    capabilities: Record<string, boolean>;
  }>;
}

interface OrgSettings {
  phone?: PhoneSettings;
  mybizosPhone?: MybizosPhoneSettings;
  [key: string]: unknown;
}

// ── Helper: Find caller ID for an org ──────────────────────────────────────

async function findCallerIdForOrg(accountSid: string): Promise<string | null> {
  try {
    // Find the org that has this Twilio account SID
    const result = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(
        sql`settings->'phone'->>'accountSid' = ${accountSid}`,
      );

    if (result.length === 0) return null;

    const settings = result[0]?.settings as OrgSettings | null;

    // Try BYO Twilio numbers first — look for first purchased number
    // from the phone.routing config or from mybizosPhone.numbers
    const mybizos = settings?.mybizosPhone;
    if (mybizos?.numbers && mybizos.numbers.length > 0) {
      const firstNumber = mybizos.numbers[0];
      if (firstNumber) return firstNumber.phoneNumber;
    }

    return null;
  } catch (err) {
    logger.warn('Failed to look up caller ID for org', {
      accountSid,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return null;
  }
}

// ── POST /twiml — TwiML App voice URL ──────────────────────────────────────
//
// When the browser SDK initiates a call via device.connect(), Twilio
// hits this URL with the call parameters. We return TwiML that dials
// the destination phone number.
//
// This is an unauthenticated webhook — Twilio calls it directly.

voiceTwiml.post('/twiml', async (c) => {
  try {
    // Twilio sends form-encoded POST body
    const body = await c.req.text();
    const params = new URLSearchParams(body);

    const to = params.get('To') ?? '';
    const from = params.get('From') ?? '';
    const accountSid = params.get('AccountSid') ?? '';
    const callSid = params.get('CallSid') ?? '';

    logger.info('Voice TwiML webhook received', {
      to,
      from,
      accountSid: accountSid.substring(0, 10) + '...',
      callSid,
    });

    // ── Browser-initiated outbound call ─────────────────────────────────
    // From is "client:user_xxx" (browser SDK identity)
    // To is a phone number like "+61404576080"
    if (from.startsWith('client:') && to && !to.startsWith('client:')) {
      // Find the org's Twilio phone number to use as caller ID
      let callerId = config.TWILIO_PHONE_NUMBER || '';

      if (accountSid) {
        const orgCallerId = await findCallerIdForOrg(accountSid);
        if (orgCallerId) {
          callerId = orgCallerId;
        }
      }

      // If still no caller ID, try to fetch the first number from this Twilio account
      if (!callerId && accountSid) {
        try {
          // Look up BYO Twilio numbers
          const result = await db
            .select({ settings: organizations.settings })
            .from(organizations)
            .where(sql`settings->'phone'->>'accountSid' = ${accountSid}`);

          if (result.length > 0) {
            const settings = result[0]?.settings as OrgSettings | null;
            if (settings?.phone?.accountSid && settings?.phone?.authToken) {
              const twilio = await import('twilio');
              const client = twilio.default(settings.phone.accountSid, settings.phone.authToken);
              const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
              if (numbers.length > 0 && numbers[0]) {
                callerId = numbers[0].phoneNumber;
              }
            }
          }
        } catch (err) {
          logger.warn('Failed to auto-detect caller ID', {
            error: err instanceof Error ? err.message : 'Unknown',
          });
        }
      }

      if (!callerId) {
        logger.error('No caller ID available for outbound call', { accountSid, from, to });
        const twiml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<Response>',
          '  <Say>Sorry, no phone number is configured for outbound calls. Please set up a phone number in settings.</Say>',
          '</Response>',
        ].join('\n');
        return twimlResponse(c, twiml);
      }

      // Build the Dial TwiML
      // Twilio requires a publicly accessible URL for callbacks (not localhost).
      const PRODUCTION_API_URL = 'https://mybizos-production.up.railway.app';
      const webhookBase = config.APP_URL.includes('localhost') ? PRODUCTION_API_URL : config.APP_URL;
      const statusCallbackUrl = `${webhookBase}/webhooks/twilio/status`;
      const twiml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        `  <Dial callerId="${escapeXml(callerId)}" timeout="30" record="record-from-ringing-dual" action="${escapeXml(statusCallbackUrl)}">`,
        `    <Number statusCallback="${escapeXml(statusCallbackUrl)}" statusCallbackEvent="initiated ringing answered completed">${escapeXml(to)}</Number>`,
        '  </Dial>',
        '</Response>',
      ].join('\n');

      logger.info('Returning outbound Dial TwiML', { to, callerId, callSid });
      return twimlResponse(c, twiml);
    }

    // ── Incoming call from PSTN to a Twilio number ──────────────────────
    // This handles calls coming IN to the org's Twilio number.
    // For now, ring the browser client. In the future, this would go
    // through the AI phone agent or ring groups.
    if (!from.startsWith('client:') && to) {
      logger.info('Incoming PSTN call, routing to browser client', { from, to });

      // Ring the browser client for this org
      const twiml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        '  <Dial timeout="30">',
        '    <Client>browser-user</Client>',
        '  </Dial>',
        '  <Say>No one is available to take your call. Please try again later.</Say>',
        '</Response>',
      ].join('\n');

      return twimlResponse(c, twiml);
    }

    // ── Fallback ────────────────────────────────────────────────────────
    logger.warn('Unhandled voice webhook scenario', { to, from });
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Say>Sorry, this call cannot be completed.</Say>',
      '</Response>',
    ].join('\n');
    return twimlResponse(c, twiml);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Voice TwiML webhook error', { error: message });

    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred processing this call.</Say></Response>';
    return twimlResponse(c, twiml);
  }
});

export { voiceTwiml as voiceTwimlRoutes };
