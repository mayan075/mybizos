import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';

const twilioWebhooks = new Hono();

// ── Validation Schemas ──

const voiceWebhookSchema = z.object({
  CallSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  CallStatus: z.string(),
  Direction: z.string().optional(),
  CallerName: z.string().optional(),
  CallerCity: z.string().optional(),
  CallerState: z.string().optional(),
});

const smsWebhookSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.coerce.number().optional(),
});

const statusWebhookSchema = z.object({
  MessageSid: z.string().optional(),
  CallSid: z.string().optional(),
  MessageStatus: z.string().optional(),
  CallStatus: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

// ── Routes ──
// These webhook endpoints do NOT use auth middleware since they are called
// by Twilio's infrastructure. In production, requests will be validated
// using Twilio's request signature verification.

/**
 * POST /webhooks/twilio/voice — inbound voice call handler
 *
 * When a call comes in, this logs the event and returns TwiML
 * to route the call to the Vapi AI voice agent.
 */
twilioWebhooks.post('/voice', async (c) => {
  const body = await c.req.parseBody();
  const parsed = voiceWebhookSchema.parse(body);

  logger.info('Inbound voice call received', {
    callSid: parsed.CallSid,
    from: parsed.From,
    to: parsed.To,
    status: parsed.CallStatus,
  });

  // Look up which org owns this phone number
  // In production: query DB for org by Twilio phone number
  const orgId = 'org_01'; // Mock lookup

  // Return TwiML to connect to Vapi AI agent
  // In production, this will redirect to the Vapi endpoint for the org's AI agent
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you to our assistant.</Say>
  <Redirect>https://api.vapi.ai/twilio/inbound?orgId=${orgId}</Redirect>
</Response>`;

  return c.text(twiml, 200, {
    'Content-Type': 'text/xml',
  });
});

/**
 * POST /webhooks/twilio/sms — inbound SMS handler
 *
 * Processes incoming SMS messages, logs them, and routes
 * to the appropriate conversation/AI agent.
 */
twilioWebhooks.post('/sms', async (c) => {
  const body = await c.req.parseBody();
  const parsed = smsWebhookSchema.parse(body);

  logger.info('Inbound SMS received', {
    messageSid: parsed.MessageSid,
    from: parsed.From,
    to: parsed.To,
    bodyLength: parsed.Body.length,
  });

  // In production:
  // 1. Look up org by the "To" phone number
  // 2. Find or create contact by the "From" phone number
  // 3. Find or create conversation
  // 4. Store the inbound message
  // 5. Route to AI SMS agent for auto-reply if enabled
  // 6. Check for emergency keywords

  const emergencyKeywords = ['flooding', 'gas leak', 'fire', 'emergency', 'burst pipe'];
  const hasEmergency = emergencyKeywords.some((kw) =>
    parsed.Body.toLowerCase().includes(kw),
  );

  if (hasEmergency) {
    logger.warn('Emergency keyword detected in SMS', {
      from: parsed.From,
      messageSid: parsed.MessageSid,
    });
    // In production: trigger immediate owner alert
  }

  // Return TwiML acknowledgment
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for your message! We'll get back to you shortly.</Message>
</Response>`;

  return c.text(twiml, 200, {
    'Content-Type': 'text/xml',
  });
});

/**
 * POST /webhooks/twilio/status — delivery status callback
 *
 * Twilio calls this when the status of a sent message/call changes.
 */
twilioWebhooks.post('/status', async (c) => {
  const body = await c.req.parseBody();
  const parsed = statusWebhookSchema.parse(body);

  const sid = parsed.MessageSid || parsed.CallSid || 'unknown';
  const status = parsed.MessageStatus || parsed.CallStatus || 'unknown';

  logger.info('Twilio status callback', {
    sid,
    status,
    errorCode: parsed.ErrorCode,
    errorMessage: parsed.ErrorMessage,
  });

  // In production: update the message/call record status in DB
  if (parsed.ErrorCode) {
    logger.error('Twilio delivery error', {
      sid,
      errorCode: parsed.ErrorCode,
      errorMessage: parsed.ErrorMessage,
    });
  }

  return c.json({ received: true });
});

export { twilioWebhooks as twilioWebhookRoutes };
