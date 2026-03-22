import { Hono } from 'hono';
import { z } from 'zod';
import {
  db,
  organizations,
  contacts,
  conversations,
  messages,
  aiAgents,
  orgMembers,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, sql } from 'drizzle-orm';
import { TwilioClient } from '@mybizos/integrations';
import { ClaudeClient, SmsAgent } from '@mybizos/ai';
import { EMERGENCY_KEYWORDS } from '@mybizos/shared';
import { config } from '../../config.js';
import { logger } from '../../middleware/logger.js';
import { conversationService } from '../../services/conversation-service.js';
import { contactService } from '../../services/contact-service.js';
import { activityService } from '../../services/activity-service.js';

const twilioWebhooks = new Hono();

// ── Shared Clients ──

function getTwilioClient(): TwilioClient {
  return new TwilioClient({
    accountSid: config.TWILIO_ACCOUNT_SID,
    authToken: config.TWILIO_AUTH_TOKEN,
    defaultFromNumber: config.TWILIO_PHONE_NUMBER,
  });
}

function getClaudeClient(): ClaudeClient {
  return new ClaudeClient({ apiKey: config.ANTHROPIC_API_KEY });
}

// ── Validation Schemas ──

const smsWebhookSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.coerce.number().optional(),
});

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

const statusWebhookSchema = z.object({
  MessageSid: z.string().optional(),
  CallSid: z.string().optional(),
  MessageStatus: z.string().optional(),
  CallStatus: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

// ── Helpers ──

/** Look up which org owns a given Twilio phone number. */
async function findOrgByPhoneNumber(phoneNumber: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.phone, phoneNumber));

  return org ?? null;
}

/** Look up or create a contact by phone number within an org. */
async function findOrCreateContactByPhone(orgId: string, phone: string) {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(
      withOrgScope(contacts.orgId, orgId),
      eq(contacts.phone, phone),
    ));

  if (existing) {
    return existing;
  }

  // Create a new contact with minimal info (phone-sourced lead)
  const created = await contactService.create(orgId, {
    firstName: 'Unknown',
    lastName: phone,
    phone,
    source: 'sms',
  });

  logger.info('Auto-created contact from inbound SMS', {
    orgId,
    contactId: created.id,
    phone,
  });

  return created;
}

/** Find or create an SMS conversation for a contact. */
async function findOrCreateConversation(orgId: string, contactId: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(
      withOrgScope(conversations.orgId, orgId),
      eq(conversations.contactId, contactId),
      eq(conversations.channel, 'sms'),
    ));

  if (existing) {
    return existing;
  }

  const created = await conversationService.create(orgId, {
    contactId,
    channel: 'sms',
  });

  return created;
}

/** Check if a message contains STOP/opt-out keywords. */
function isOptOut(body: string): boolean {
  const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end'];
  const trimmed = body.trim().toLowerCase();
  return optOutKeywords.includes(trimmed);
}

/** Check if an SMS AI agent is enabled for the org. */
async function getSmsAgent(orgId: string) {
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(
      withOrgScope(aiAgents.orgId, orgId),
      eq(aiAgents.type, 'sms'),
      eq(aiAgents.isActive, true),
    ));

  return agent ?? null;
}

/** Find the org owner's phone number for alerts. */
async function getOwnerPhone(orgId: string): Promise<string | null> {
  const [ownerMember] = await db
    .select()
    .from(orgMembers)
    .where(and(
      withOrgScope(orgMembers.orgId, orgId),
      eq(orgMembers.role, 'owner'),
    ));

  if (!ownerMember) return null;

  // The owner's phone is the org phone for now; in production
  // this would come from the users table
  const [org] = await db
    .select({ phone: organizations.phone })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  return org?.phone ?? null;
}

// ── Routes ──

/**
 * POST /webhooks/twilio/sms -- inbound SMS handler
 *
 * Full processing pipeline:
 * 1. Validate Twilio signature
 * 2. Parse inbound SMS
 * 3. Look up org by receiving phone number
 * 4. Look up or create contact by sender phone
 * 5. Create/find conversation (channel: 'sms')
 * 6. Store inbound message
 * 7. If AI SMS agent enabled: generate reply, send via Twilio, store as AI message
 * 8. Check for emergency keywords -> alert owner via SMS
 * 9. Check for STOP -> mark contact opted out
 * 10. Return empty TwiML (reply sent via API, not TwiML)
 */
twilioWebhooks.post('/sms', async (c) => {
  const twilio = getTwilioClient();

  // Step 1: Validate Twilio signature
  const signature = c.req.header('X-Twilio-Signature') ?? '';
  const webhookUrl = `${config.APP_URL}/webhooks/twilio/sms`;
  const rawBody = await c.req.parseBody();
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawBody)) {
    if (typeof value === 'string') {
      params[key] = value;
    }
  }

  if (config.NODE_ENV === 'production') {
    const isValid = twilio.validateWebhook(signature, webhookUrl, params);
    if (!isValid) {
      logger.warn('Invalid Twilio webhook signature for SMS', { signature });
      return c.text('', 403);
    }
  }

  // Step 2: Parse inbound SMS
  const parsed = smsWebhookSchema.parse(rawBody);
  const inbound = twilio.parseInboundSms(params);

  logger.info('Inbound SMS received', {
    messageSid: inbound.messageSid,
    from: inbound.from,
    to: inbound.to,
    bodyLength: inbound.body.length,
  });

  // Step 3: Look up org by receiving phone number
  const org = await findOrgByPhoneNumber(inbound.to);
  if (!org) {
    logger.warn('No org found for receiving phone number', { to: inbound.to });
    return c.text(emptyTwiml(), 200, { 'Content-Type': 'text/xml' });
  }

  // Step 9 (early): Check for STOP/opt-out
  if (isOptOut(inbound.body)) {
    logger.info('Contact opted out via SMS', { from: inbound.from, orgId: org.id });

    // Update contact tags to mark as opted out
    const contact = await findOrCreateContactByPhone(org.id, inbound.from);
    const updatedTags = [...(contact.tags ?? []), 'sms_opted_out'];
    await contactService.update(org.id, contact.id, { tags: updatedTags });

    await activityService.logActivity(org.id, {
      contactId: contact.id,
      type: 'sms',
      title: 'Contact opted out of SMS',
      description: `Contact sent "${inbound.body}" to opt out of SMS communications.`,
    });

    return c.text(emptyTwiml(), 200, { 'Content-Type': 'text/xml' });
  }

  // Step 4: Look up or create contact
  const contact = await findOrCreateContactByPhone(org.id, inbound.from);

  // Step 5: Find or create conversation
  const conversation = await findOrCreateConversation(org.id, contact.id);

  // Step 6: Store inbound message
  await conversationService.createMessage(org.id, conversation.id, {
    direction: 'inbound',
    channel: 'sms',
    senderType: 'contact',
    senderId: contact.id,
    body: inbound.body,
    mediaUrls: inbound.mediaUrls,
    metadata: {
      messageSid: inbound.messageSid,
      from: inbound.from,
      to: inbound.to,
    },
  });

  // Step 8: Check for emergency keywords -> alert owner
  const bodyLower = inbound.body.toLowerCase();
  const detectedEmergency = EMERGENCY_KEYWORDS.find((kw) => bodyLower.includes(kw));

  if (detectedEmergency) {
    logger.warn('Emergency keyword detected in SMS', {
      from: inbound.from,
      keyword: detectedEmergency,
      orgId: org.id,
    });

    await activityService.logActivity(org.id, {
      contactId: contact.id,
      type: 'sms',
      title: `Emergency detected: ${detectedEmergency}`,
      description: `Inbound SMS contained emergency keyword "${detectedEmergency}". Owner alerted.`,
      metadata: { keyword: detectedEmergency, messageSid: inbound.messageSid },
    });

    // Alert owner via SMS
    const ownerPhone = await getOwnerPhone(org.id);
    if (ownerPhone && ownerPhone !== inbound.to) {
      try {
        await twilio.sendSms(
          ownerPhone,
          `EMERGENCY ALERT from ${contact.firstName} ${contact.lastName} (${inbound.from}): "${inbound.body}"`,
          inbound.to,
        );
        logger.info('Emergency alert sent to owner', { ownerPhone, orgId: org.id });
      } catch (err) {
        logger.error('Failed to send emergency alert SMS', {
          error: err instanceof Error ? err.message : String(err),
          orgId: org.id,
        });
      }
    }
  }

  // Step 7: If AI SMS agent enabled, generate and send reply
  const smsAgentConfig = await getSmsAgent(org.id);
  if (smsAgentConfig) {
    try {
      const claude = getClaudeClient();
      const smsAgent = new SmsAgent(claude, {
        vertical: org.vertical,
        businessName: org.name,
        agentName: smsAgentConfig.name,
      });

      // Get recent conversation history for context
      const recentMessages = await conversationService.getMessages(org.id, conversation.id);
      const conversationHistory = recentMessages
        .slice(-10) // Last 10 messages for context
        .map((msg) => ({
          role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.body,
        }));

      const result = await smsAgent.process(
        {
          orgId: org.id,
          orgName: org.name,
          vertical: org.vertical,
          contactName: `${contact.firstName} ${contact.lastName}`,
          contactPhone: contact.phone,
          conversationHistory: conversationHistory.slice(0, -1), // Exclude the latest message (it's the user message)
          metadata: {},
        },
        inbound.body,
      );

      const aiReplyText = result.response.content;

      if (aiReplyText) {
        // Send AI reply via Twilio
        const sendResult = await twilio.sendSms(inbound.from, aiReplyText, inbound.to);

        // Store AI reply as outbound message
        await conversationService.createMessage(org.id, conversation.id, {
          direction: 'outbound',
          channel: 'sms',
          senderType: 'ai',
          body: aiReplyText,
          metadata: {
            messageSid: sendResult.sid,
            aiAgentId: smsAgentConfig.id,
          },
        });

        // Mark conversation as AI-handled
        await db
          .update(conversations)
          .set({ aiHandled: true })
          .where(eq(conversations.id, conversation.id));

        logger.info('AI SMS reply sent', {
          orgId: org.id,
          contactId: contact.id,
          replySid: sendResult.sid,
        });
      }
    } catch (err) {
      logger.error('Failed to generate/send AI SMS reply', {
        error: err instanceof Error ? err.message : String(err),
        orgId: org.id,
        contactId: contact.id,
      });
    }
  }

  // Return empty TwiML -- reply is sent via API, not inline TwiML
  return c.text(emptyTwiml(), 200, { 'Content-Type': 'text/xml' });
});

/**
 * POST /webhooks/twilio/voice -- inbound voice call handler
 *
 * Validates signature, logs the call, and returns TwiML that either:
 * - Connects to Vapi assistant (if AI phone agent is configured)
 * - Returns a "thank you for calling" message (if no AI agent)
 */
twilioWebhooks.post('/voice', async (c) => {
  const twilio = getTwilioClient();

  // Validate Twilio signature
  const signature = c.req.header('X-Twilio-Signature') ?? '';
  const webhookUrl = `${config.APP_URL}/webhooks/twilio/voice`;
  const rawBody = await c.req.parseBody();
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawBody)) {
    if (typeof value === 'string') {
      params[key] = value;
    }
  }

  if (config.NODE_ENV === 'production') {
    const isValid = twilio.validateWebhook(signature, webhookUrl, params);
    if (!isValid) {
      logger.warn('Invalid Twilio webhook signature for voice', { signature });
      return c.text('', 403);
    }
  }

  const parsed = voiceWebhookSchema.parse(rawBody);
  const inbound = twilio.parseInboundCall(params);

  logger.info('Inbound voice call received', {
    callSid: inbound.callSid,
    from: inbound.from,
    to: inbound.to,
    status: inbound.callStatus,
  });

  // Look up org by phone number
  const org = await findOrgByPhoneNumber(inbound.to);
  if (!org) {
    logger.warn('No org found for receiving phone number (voice)', { to: inbound.to });
    const twiml = twilio.generateTwiml([
      { type: 'say', text: 'We are sorry, this number is not configured. Goodbye.', voice: 'alice' },
      { type: 'hangup' },
    ]);
    return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
  }

  // Log call activity
  const contact = await findOrCreateContactByPhone(org.id, inbound.from);
  await activityService.logActivity(org.id, {
    contactId: contact.id,
    type: 'call',
    title: 'Inbound phone call',
    description: `Inbound call from ${inbound.from}`,
    metadata: {
      callSid: inbound.callSid,
      from: inbound.from,
      to: inbound.to,
      callerName: parsed.CallerName ?? null,
      callerCity: parsed.CallerCity ?? null,
      callerState: parsed.CallerState ?? null,
    },
  });

  // Check if AI phone agent is configured
  const [phoneAgent] = await db
    .select()
    .from(aiAgents)
    .where(and(
      withOrgScope(aiAgents.orgId, org.id),
      eq(aiAgents.type, 'phone'),
      eq(aiAgents.isActive, true),
    ));

  if (phoneAgent) {
    // Connect to Vapi AI voice assistant
    const vapiSettings = phoneAgent.settings as Record<string, unknown>;
    const vapiAssistantId = vapiSettings['vapiAssistantId'] as string | undefined;

    if (vapiAssistantId) {
      // Redirect to Vapi's Twilio inbound handler
      const twiml = twilio.generateTwiml([
        { type: 'say', text: 'Please hold while we connect you to our assistant.', voice: 'alice' },
        { type: 'redirect', url: `https://api.vapi.ai/twilio/inbound?assistantId=${vapiAssistantId}` },
      ]);
      return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
    }
  }

  // No AI agent configured -- return a simple greeting
  const twiml = twilio.generateTwiml([
    {
      type: 'say',
      text: `Thank you for calling ${org.name}. We are unable to take your call right now. Please leave a message after the tone and we will get back to you as soon as possible.`,
      voice: 'alice',
    },
    { type: 'record', maxLength: 120, transcribe: true },
    { type: 'say', text: 'Thank you. Goodbye!', voice: 'alice' },
    { type: 'hangup' },
  ]);

  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});

/**
 * POST /webhooks/twilio/status -- delivery status callback
 *
 * Updates message delivery status (sent/delivered/failed).
 */
twilioWebhooks.post('/status', async (c) => {
  const twilio = getTwilioClient();

  // Validate signature
  const signature = c.req.header('X-Twilio-Signature') ?? '';
  const webhookUrl = `${config.APP_URL}/webhooks/twilio/status`;
  const rawBody = await c.req.parseBody();
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawBody)) {
    if (typeof value === 'string') {
      params[key] = value;
    }
  }

  if (config.NODE_ENV === 'production') {
    const isValid = twilio.validateWebhook(signature, webhookUrl, params);
    if (!isValid) {
      logger.warn('Invalid Twilio webhook signature for status', { signature });
      return c.text('', 403);
    }
  }

  const parsed = statusWebhookSchema.parse(rawBody);
  const messageSid = parsed.MessageSid;
  const messageStatus = parsed.MessageStatus;

  logger.info('Twilio status callback', {
    messageSid,
    messageStatus,
    callSid: parsed.CallSid,
    callStatus: parsed.CallStatus,
    errorCode: parsed.ErrorCode,
  });

  // Update message status in DB if this is a message status callback
  if (messageSid && messageStatus) {
    const statusMap: Record<string, typeof messages.status.enumValues[number]> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      undelivered: 'failed',
    };

    const dbStatus = statusMap[messageStatus];
    if (dbStatus) {
      // Update message status by matching messageSid in the JSONB metadata column
      await db.execute(
        sql`UPDATE messages SET status = ${dbStatus} WHERE metadata->>'messageSid' = ${messageSid}`,
      );

      logger.info('Message status updated', { messageSid, status: dbStatus });
    }
  }

  if (parsed.ErrorCode) {
    logger.error('Twilio delivery error', {
      messageSid,
      errorCode: parsed.ErrorCode,
      errorMessage: parsed.ErrorMessage,
    });
  }

  return c.json({ received: true });
});

// ── Helpers ──

function emptyTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>';
}

export { twilioWebhooks as twilioWebhookRoutes };
