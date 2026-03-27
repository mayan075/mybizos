import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import {
  db,
  conversations,
  contacts,
  appointments,
  deals,
  pipelines,
  pipelineStages,
  withOrgScope,
} from '@mybizos/db';
import { logger } from '../../middleware/logger.js';
import { config } from '../../config.js';
import { ClaudeClient } from '@mybizos/ai';
import type { ClaudeMessage } from '@mybizos/ai';
import { getPhoneAgentPrompt, getSmsAgentPrompt } from '@mybizos/ai';
import { TwilioClient } from '@mybizos/integrations';
import type { Vertical } from '@mybizos/shared';
import { resolveOrgByPhoneNumber, type ResolvedOrg } from '../../services/phone-routing-service.js';
import { resolveContact } from '../../services/contact-resolution-service.js';
import { conversationService } from '../../services/conversation-service.js';
import { activityService } from '../../services/activity-service.js';
import { notificationService } from '../../services/notification-service.js';

const twilioWebhooks = new Hono();

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_CONVERSATION_TURNS = 10;
const VOICE_MODEL = 'claude-sonnet-4-20250514';
const GATHER_TIMEOUT_SECONDS = 5;
const SPEECH_TIMEOUT = 'auto';

/**
 * Resolve business config from the org's settings in the database.
 * Falls back to defaults if org settings aren't configured.
 */
const VALID_VERTICALS: Set<string> = new Set([
  'rubbish_removals', 'moving_company', 'plumbing', 'hvac', 'electrical',
  'roofing', 'landscaping', 'pest_control', 'cleaning', 'general_contractor',
]);

async function getBusinessConfig(calledNumber: string): Promise<{
  name: string;
  vertical: Vertical;
  agentName: string;
  orgId: string | null;
}> {
  try {
    const resolved = await resolveOrgByPhoneNumber(calledNumber);
    if (resolved) {
      const { db, organizations } = await import('@mybizos/db');
      const { eq: eqOp } = await import('drizzle-orm');
      const [org] = await db
        .select()
        .from(organizations)
        .where(eqOp(organizations.id, resolved.orgId));
      if (org) {
        const settings = (org.settings ?? {}) as Record<string, unknown>;
        const onboarding = (settings['onboarding'] ?? {}) as Record<string, unknown>;
        const rawVertical = (org as Record<string, unknown>).vertical as string || 'general_contractor';
        const vertical = (VALID_VERTICALS.has(rawVertical) ? rawVertical : 'general_contractor') as Vertical;
        return {
          name: org.name || 'our business',
          vertical,
          agentName: typeof onboarding['agentName'] === 'string' ? onboarding['agentName'] : 'the AI assistant',
          orgId: org.id,
        };
      }
    }
  } catch (err) {
    logger.warn('Failed to resolve business config from DB', {
      calledNumber,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  // Fallback defaults
  return { name: 'our business', vertical: 'general_contractor' as Vertical, agentName: 'the AI assistant', orgId: null };
}

/** @deprecated — use getBusinessConfig() for dynamic resolution */
const DEFAULT_BUSINESS = {
  name: 'Northern Removals',
  vertical: 'rubbish_removals' as const,
  agentName: 'Sam',
};

// ── In-memory conversation store (per call SID) ─────────────────────────────

interface ConversationEntry {
  messages: ClaudeMessage[];
  callerPhone: string;
  calledNumber: string;
  startedAt: string;
  turnCount: number;
}

const callConversations = new Map<string, ConversationEntry>();

/**
 * Auto-clean stale conversations older than 30 minutes.
 * Prevents unbounded memory growth.
 */
function cleanStaleConversations(): void {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  for (const [callSid, entry] of callConversations) {
    if (new Date(entry.startedAt).getTime() < thirtyMinutesAgo) {
      callConversations.delete(callSid);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanStaleConversations, 5 * 60 * 1000);

// ── In-memory SMS conversation store (per phone number) ─────────────────────

interface SmsConversationEntry {
  messages: ClaudeMessage[];
  lastMessageAt: string;
}

const smsConversations = new Map<string, SmsConversationEntry>();

/**
 * Auto-clean SMS conversations older than 2 hours.
 */
function cleanStaleSmsConversations(): void {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, entry] of smsConversations) {
    if (new Date(entry.lastMessageAt).getTime() < twoHoursAgo) {
      smsConversations.delete(key);
    }
  }
}

setInterval(cleanStaleSmsConversations, 10 * 60 * 1000);

// ── In-memory call log store ────────────────────────────────────────────────

interface CallLog {
  callSid: string;
  callerPhone: string;
  calledNumber: string;
  startedAt: string;
  endedAt: string;
  turnCount: number;
  summary: string;
  transcript: ClaudeMessage[];
}

const callLogs: CallLog[] = [];

// ── Lazy Claude client singleton ────────────────────────────────────────────

let claudeClientInstance: ClaudeClient | null = null;

function getClaudeClient(): ClaudeClient {
  if (!claudeClientInstance) {
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    claudeClientInstance = new ClaudeClient({
      apiKey: config.ANTHROPIC_API_KEY,
      model: VOICE_MODEL,
      maxTokens: 300,
    });
  }
  return claudeClientInstance;
}

// ── Lazy Twilio client singleton (for sending SMS replies) ──────────────────

let twilioClientInstance: TwilioClient | null = null;

function getTwilioClient(): TwilioClient | null {
  if (!twilioClientInstance) {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      return null;
    }
    twilioClientInstance = new TwilioClient({
      accountSid: config.TWILIO_ACCOUNT_SID,
      authToken: config.TWILIO_AUTH_TOKEN,
      defaultFromNumber: config.TWILIO_PHONE_NUMBER || '',
    });
  }
  return twilioClientInstance;
}

// ── Helper: XML-escape text for TwiML ───────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Helper: Build TwiML for saying text + gathering more speech ─────────────

function buildSayAndGatherTwiml(
  sayText: string,
  actionUrl: string,
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Gather input="speech" timeout="${GATHER_TIMEOUT_SECONDS}" speechTimeout="${SPEECH_TIMEOUT}" action="${escapeXml(actionUrl)}" method="POST">`,
    `    <Say voice="Polly.Joanna">${escapeXml(sayText)}</Say>`,
    '  </Gather>',
    // If caller doesn't say anything, prompt them
    '  <Say voice="Polly.Joanna">I didn\'t catch that. Could you please repeat?</Say>',
    `  <Redirect method="POST">${escapeXml(actionUrl)}</Redirect>`,
    '</Response>',
  ].join('\n');
}

// ── Helper: Build goodbye TwiML ─────────────────────────────────────────────

function buildGoodbyeTwiml(sayText: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Say voice="Polly.Joanna">${escapeXml(sayText)}</Say>`,
    '  <Hangup/>',
    '</Response>',
  ].join('\n');
}

// ── Helper: detect end-of-conversation ──────────────────────────────────────

function shouldEndConversation(aiResponse: string): boolean {
  const lower = aiResponse.toLowerCase();
  const endPhrases = [
    'have a great day',
    'goodbye',
    'thank you for calling',
    'thanks for calling',
    'take care',
    'bye for now',
  ];
  return endPhrases.some((phrase) => lower.includes(phrase));
}

// ── Zod schemas for Twilio webhook payloads ─────────────────────────────────

const twilioVoicePayloadSchema = z.object({
  CallSid: z.string(),
  From: z.string().optional().default('unknown'),
  To: z.string().optional().default('unknown'),
  CallStatus: z.string().optional().default('ringing'),
  SpeechResult: z.string().optional(),
  Confidence: z.string().optional(),
}).passthrough();

const twilioSmsPayloadSchema = z.object({
  MessageSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.string().optional().default('0'),
}).passthrough();

const twilioStatusPayloadSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /voice — Initial voice webhook: greeting + first <Gather>
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.post('/voice', async (c) => {
  const body = await c.req.parseBody();
  const parsed = twilioVoicePayloadSchema.safeParse(body);

  if (!parsed.success) {
    logger.error('Invalid Twilio voice payload', {
      errors: parsed.error.issues.map((i) => i.message).join(', '),
    });
    return c.text(buildGoodbyeTwiml('Sorry, there was an error. Please try again later.'), 200, {
      'Content-Type': 'text/xml',
    });
  }

  const { CallSid, From, To } = parsed.data;

  logger.info('Inbound call received', {
    callSid: CallSid,
    from: From,
    to: To,
  });

  // Initialize conversation state
  callConversations.set(CallSid, {
    messages: [],
    callerPhone: From,
    calledNumber: To,
    startedAt: new Date().toISOString(),
    turnCount: 0,
  });

  // Resolve business config dynamically from DB
  const bizConfig = await getBusinessConfig(To);

  // Build the webhook URL for processing caller's speech
  const baseUrl = config.APP_URL;
  const respondUrl = `${baseUrl}/webhooks/twilio/voice/respond`;

  // AI disclosure greeting
  const greeting = `Hi, this is ${bizConfig.name}'s AI assistant. This call may be recorded. How can I help you today?`;

  const twiml = buildSayAndGatherTwiml(greeting, respondUrl);

  // Store the greeting as the assistant's first message
  const conversation = callConversations.get(CallSid);
  if (conversation) {
    conversation.messages.push({
      role: 'assistant',
      content: greeting,
    });
  }

  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /voice/respond — Process caller's speech and get Claude's response
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.post('/voice/respond', async (c) => {
  const body = await c.req.parseBody();
  const parsed = twilioVoicePayloadSchema.safeParse(body);

  if (!parsed.success) {
    logger.error('Invalid Twilio voice/respond payload', {
      errors: parsed.error.issues.map((i) => i.message).join(', '),
    });
    return c.text(buildGoodbyeTwiml('Sorry, there was a system error. Goodbye.'), 200, {
      'Content-Type': 'text/xml',
    });
  }

  const { CallSid, SpeechResult } = parsed.data;
  const callerText = SpeechResult ?? '';

  logger.info('Caller speech received', {
    callSid: CallSid,
    speechResult: callerText,
    confidence: parsed.data.Confidence,
  });

  // Get or initialize the conversation
  let conversation = callConversations.get(CallSid);
  if (!conversation) {
    // Call might have been restarted or conversation cleaned up
    conversation = {
      messages: [],
      callerPhone: parsed.data.From,
      calledNumber: parsed.data.To,
      startedAt: new Date().toISOString(),
      turnCount: 0,
    };
    callConversations.set(CallSid, conversation);
  }

  // If no speech was detected (empty gather), re-prompt
  if (!callerText.trim()) {
    const baseUrl = config.APP_URL;
    const respondUrl = `${baseUrl}/webhooks/twilio/voice/respond`;
    const twiml = buildSayAndGatherTwiml(
      "I'm sorry, I didn't catch that. Could you please tell me how I can help you?",
      respondUrl,
    );
    return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
  }

  // Check turn limit
  conversation.turnCount++;
  if (conversation.turnCount > MAX_CONVERSATION_TURNS) {
    logger.info('Max conversation turns reached', { callSid: CallSid, turns: conversation.turnCount });
    const bizConfig = await getBusinessConfig(conversation.calledNumber);
    const farewell = `Thank you for calling ${bizConfig.name}. We've been chatting for a while, so let me have a team member follow up with you. Have a great day!`;
    conversation.messages.push({ role: 'user', content: callerText });
    conversation.messages.push({ role: 'assistant', content: farewell });
    return c.text(buildGoodbyeTwiml(farewell), 200, { 'Content-Type': 'text/xml' });
  }

  // Add the caller's message to history
  conversation.messages.push({ role: 'user', content: callerText });

  // Resolve business config dynamically
  const bizConfig = await getBusinessConfig(conversation.calledNumber);

  // Call Claude to get the AI response
  let aiResponseText: string;

  try {
    const claude = getClaudeClient();
    const systemPrompt = getPhoneAgentPrompt({
      businessName: bizConfig.name,
      vertical: bizConfig.vertical,
      agentName: bizConfig.agentName,
    });

    // Add phone-specific instructions for TTS-friendly output
    const enhancedSystemPrompt = `${systemPrompt}

VOICE CALL RULES:
- Keep responses concise (2-3 sentences max). The caller is listening, not reading.
- Do NOT use markdown, bullet points, asterisks, or formatting. Speak naturally.
- Do NOT use abbreviations like "e.g." — say "for example" instead.
- Say numbers clearly: "one hundred fifty to two hundred fifty dollars" not "$150-$250".
- Use conversational Australian English where appropriate.
- Ask ONE question at a time, then wait for the caller's response.
- When you have enough info to book, confirm the details and offer to schedule.`;

    const response = await claude.chat(enhancedSystemPrompt, conversation.messages, {
      maxTokens: 300,
      temperature: 0.7,
    });

    aiResponseText = response.content;

    logger.info('Claude response generated', {
      callSid: CallSid,
      turn: conversation.turnCount,
      responseLength: String(aiResponseText.length),
      inputTokens: String(response.usage.inputTokens),
      outputTokens: String(response.usage.outputTokens),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Claude API error during voice call', {
      callSid: CallSid,
      error: message,
    });

    // Graceful fallback — don't hang up, give the caller a helpful message
    aiResponseText = "I'm sorry, I'm having a bit of trouble right now. Could you please call back in a moment, or I can have someone from the team get back to you?";
  }

  // Add the AI response to conversation history
  conversation.messages.push({ role: 'assistant', content: aiResponseText });

  // Check if the AI is ending the conversation
  if (shouldEndConversation(aiResponseText)) {
    logger.info('AI ended conversation naturally', { callSid: CallSid });
    return c.text(buildGoodbyeTwiml(aiResponseText), 200, { 'Content-Type': 'text/xml' });
  }

  // Continue the conversation: say the response + listen for more
  const baseUrl = config.APP_URL;
  const respondUrl = `${baseUrl}/webhooks/twilio/voice/respond`;
  const twiml = buildSayAndGatherTwiml(aiResponseText, respondUrl);

  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /sms — Inbound SMS webhook: process message and reply via TwiML
//
//  Full flow: parse SMS → resolve org → find/create contact → find/create
//  conversation → persist inbound message → call Claude → persist AI reply →
//  log activity → return TwiML.
//
//  DB writes for messages + activity are fire-and-forget so we don't block
//  the TwiML response that Twilio needs quickly.
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.post('/sms', async (c) => {
  const body = await c.req.parseBody();
  const parsed = twilioSmsPayloadSchema.safeParse(body);

  if (!parsed.success) {
    logger.error('Invalid Twilio SMS payload', {
      errors: parsed.error.issues.map((i) => i.message).join(', '),
    });
    return c.text('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>', 200, {
      'Content-Type': 'text/xml',
    });
  }

  const { MessageSid, From, To, Body } = parsed.data;

  logger.info('Inbound SMS received', {
    messageSid: MessageSid,
    from: From,
    to: To,
    bodyLength: String(Body.length),
  });

  // Skip empty messages
  if (!Body.trim()) {
    return c.text('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>', 200, {
      'Content-Type': 'text/xml',
    });
  }

  // ── Step 1: Resolve org from the Twilio "To" number ─────────────────────
  let resolvedOrg: ResolvedOrg | null = null;
  let businessName = DEFAULT_BUSINESS.name;
  let businessVertical: string = DEFAULT_BUSINESS.vertical;
  let agentName = DEFAULT_BUSINESS.agentName;

  logger.info('[SMS DB] Step 1: Resolving org for number', { to: To });

  try {
    resolvedOrg = await resolveOrgByPhoneNumber(To);
    if (resolvedOrg) {
      businessName = resolvedOrg.orgName;
      businessVertical = resolvedOrg.vertical;
      // Use agent name from settings if available, else default
      agentName = (resolvedOrg.settings as Record<string, unknown>)?.agentName as string ?? DEFAULT_BUSINESS.agentName;
      logger.info('[SMS DB] Step 1 OK: Org resolved', {
        orgId: resolvedOrg.orgId,
        orgName: resolvedOrg.orgName,
      });
    } else {
      logger.error('[SMS DB] Step 1 FAILED: No org found for Twilio number', { to: To });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[SMS DB] Step 1 FAILED: Org resolution threw error', { to: To, error: msg });
  }

  // ── Step 2: Resolve contact (find or create) ───────────────────────────
  let contactId: string | null = null;
  let orgId: string | null = resolvedOrg?.orgId ?? null;

  if (orgId) {
    logger.info('[SMS DB] Step 2: Resolving contact', { orgId, from: From });
    try {
      const contact = await resolveContact(orgId, From, 'sms');
      contactId = contact.id;
      logger.info('[SMS DB] Step 2 OK: Contact resolved', { contactId, orgId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SMS DB] Step 2 FAILED: Contact resolution error', { orgId, from: From, error: msg });
    }
  } else {
    logger.error('[SMS DB] Step 2 SKIPPED: No orgId — contact resolution impossible');
  }

  // ── Step 3: Find or create conversation ─────────────────────────────────
  let conversationId: string | null = null;

  if (orgId && contactId) {
    logger.info('[SMS DB] Step 3: Finding/creating conversation', { orgId, contactId });
    try {
      // Look for an existing open/snoozed SMS conversation with this contact
      const [existingConvo] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(
          withOrgScope(conversations.orgId, orgId),
          eq(conversations.contactId, contactId),
          eq(conversations.channel, 'sms'),
        ))
        .orderBy(desc(conversations.createdAt))
        .limit(1);

      if (existingConvo) {
        conversationId = existingConvo.id;
        logger.info('[SMS DB] Step 3 OK: Using existing conversation', { conversationId });
      } else {
        // Create a new conversation
        const newConvo = await conversationService.create(orgId, {
          contactId,
          channel: 'sms',
        });
        conversationId = newConvo.id;
        logger.info('[SMS DB] Step 3 OK: New conversation created', { conversationId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SMS DB] Step 3 FAILED: Conversation find/create error', { orgId, contactId, error: msg });
    }
  } else {
    logger.error('[SMS DB] Step 3 SKIPPED: Missing orgId or contactId', { orgId, contactId });
  }

  // ── Step 4: Persist inbound message (AWAITED — must succeed) ────────────
  if (orgId && conversationId) {
    logger.info('[SMS DB] Step 4: Persisting inbound message', { orgId, conversationId });
    try {
      const inboundMsg = await conversationService.createMessage(orgId, conversationId, {
        direction: 'inbound',
        channel: 'sms',
        senderType: 'contact',
        senderId: contactId,
        body: Body,
        metadata: { messageSid: MessageSid, from: From, to: To },
      });
      logger.info('[SMS DB] Step 4 OK: Inbound message saved', { messageId: inboundMsg.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SMS DB] Step 4 FAILED: Could not persist inbound message', { conversationId, error: msg });
    }
  } else {
    logger.error('[SMS DB] Step 4 SKIPPED: No orgId or conversationId', { orgId, conversationId });
  }

  // ── Step 5: Get or initialize in-memory conversation for Claude context ─
  const conversationKey = `${From}:${To}`;
  let smsConvo = smsConversations.get(conversationKey);
  if (!smsConvo) {
    smsConvo = {
      messages: [],
      lastMessageAt: new Date().toISOString(),
    };
    smsConversations.set(conversationKey, smsConvo);
  }

  smsConvo.lastMessageAt = new Date().toISOString();
  smsConvo.messages.push({ role: 'user', content: Body });

  // ── Step 6: Call Claude for the SMS response ────────────────────────────
  let replyText: string;

  try {
    const claude = getClaudeClient();
    const systemPrompt = getSmsAgentPrompt({
      businessName,
      vertical: businessVertical as Parameters<typeof getSmsAgentPrompt>[0]['vertical'],
      agentName,
    });

    const response = await claude.chat(systemPrompt, smsConvo.messages, {
      maxTokens: 200,
      temperature: 0.7,
    });

    replyText = response.content;

    logger.info('Claude SMS response generated', {
      messageSid: MessageSid,
      from: From,
      responseLength: String(replyText.length),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Claude API error during SMS', {
      messageSid: MessageSid,
      error: message,
    });

    replyText = `Thanks for your message. We'll get back to you shortly.`;
  }

  // Store the AI reply in in-memory conversation history
  smsConvo.messages.push({ role: 'assistant', content: replyText });

  // ── Step 7: Persist AI response message (AWAITED) ───────────────────────
  if (orgId && conversationId) {
    logger.info('[SMS DB] Step 7: Persisting AI reply', { orgId, conversationId });
    try {
      const outboundMsg = await conversationService.createMessage(orgId, conversationId, {
        direction: 'outbound',
        channel: 'sms',
        senderType: 'ai',
        body: replyText,
        metadata: { messageSid: MessageSid, inReplyTo: From },
      });
      logger.info('[SMS DB] Step 7 OK: AI reply saved', { messageId: outboundMsg.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SMS DB] Step 7 FAILED: Could not persist AI reply', { conversationId, error: msg });
    }
  } else {
    logger.error('[SMS DB] Step 7 SKIPPED: No orgId or conversationId', { orgId, conversationId });
  }

  // ── Step 8: Log activity (fire-and-forget — non-critical) ──────────────
  if (orgId) {
    activityService.logActivity(orgId, {
      contactId,
      type: 'sms',
      title: 'Inbound SMS',
      description: Body.length > 200 ? Body.substring(0, 200) + '...' : Body,
      metadata: {
        messageSid: MessageSid,
        from: From,
        to: To,
        aiReplied: true,
        conversationId,
      },
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SMS DB] Step 8 FAILED: Activity log error', { orgId, error: msg });
    });
  }

  // ── Step 9: Return TwiML with AI response ───────────────────────────────
  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Message>${escapeXml(replyText)}</Message>`,
    '</Response>',
  ].join('\n');

  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /status — Call status callback: log and generate summary when complete
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.post('/status', async (c) => {
  const body = await c.req.parseBody();
  const parsed = twilioStatusPayloadSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn('Invalid Twilio status payload');
    return c.json({ received: true });
  }

  const { CallSid, CallStatus, CallDuration } = parsed.data;

  logger.info('Call status update', {
    callSid: CallSid,
    status: CallStatus,
    duration: CallDuration ?? 'unknown',
  });

  // Only process when the call is completed
  if (CallStatus !== 'completed') {
    return c.json({ received: true });
  }

  const conversation = callConversations.get(CallSid);
  if (!conversation || conversation.messages.length === 0) {
    logger.info('No conversation data for completed call', { callSid: CallSid });
    callConversations.delete(CallSid);
    return c.json({ received: true });
  }

  // Generate a call summary using Claude
  try {
    const claude = getClaudeClient();

    const transcript = conversation.messages
      .map((m) => `${m.role === 'user' ? 'CALLER' : 'AI'}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `You are a call summary assistant. Analyze this phone call transcript and provide a brief JSON summary.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "callerIntent": "What the caller wanted (1 sentence)",
  "outcome": "What happened — did they book, get info, or leave? (1 sentence)",
  "appointmentDetails": "Date/time/address if an appointment was discussed, or null",
  "urgency": "low|medium|high",
  "followUpNeeded": true/false,
  "followUpReason": "Why follow-up is needed, or null"
}`;

    const summaryText = await claude.complete(summaryPrompt, transcript, {
      maxTokens: 300,
      temperature: 0.2,
    });

    logger.info('Call summary generated', {
      callSid: CallSid,
      summary: summaryText,
    });

    // Store in call logs (in-memory for quick access)
    callLogs.push({
      callSid: CallSid,
      callerPhone: conversation.callerPhone,
      calledNumber: conversation.calledNumber,
      startedAt: conversation.startedAt,
      endedAt: new Date().toISOString(),
      turnCount: conversation.turnCount,
      summary: summaryText,
      transcript: [...conversation.messages],
    });

    // Keep only the last 100 call logs in memory
    if (callLogs.length > 100) {
      callLogs.splice(0, callLogs.length - 100);
    }

    // Persist call as activity in database (fire-and-forget to not block TwiML response)
    (async () => {
      try {
        const bizConfig = await getBusinessConfig(conversation.calledNumber);
        if (bizConfig.orgId) {
          // Resolve or create contact from caller phone
          const contact = await resolveContact(bizConfig.orgId, conversation.callerPhone, 'phone');
          if (contact) {
            await activityService.logActivity(bizConfig.orgId, {
              contactId: contact.id,
              type: 'call',
              title: `AI phone call (${conversation.turnCount} turns)`,
              description: summaryText,
              metadata: {
                callSid: CallSid,
                callerPhone: conversation.callerPhone,
                durationEstimate: conversation.turnCount * 30,
                transcript: conversation.messages,
              },
            });
          }
        }
      } catch (dbErr) {
        logger.warn('Failed to persist call activity to DB', {
          callSid: CallSid,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }
    })();

    // ── Post-Call Auto-Actions (fire-and-forget) ─────────────────────────
    processPostCallActions(
      summaryText,
      conversation.callerPhone,
      conversation.calledNumber,
      CallSid,
    ).catch((actionErr) => {
      logger.error('Post-call auto-actions failed', {
        callSid: CallSid,
        error: actionErr instanceof Error ? actionErr.message : String(actionErr),
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to generate call summary', {
      callSid: CallSid,
      error: message,
    });
  }

  // Clean up the active conversation
  callConversations.delete(CallSid);

  return c.json({ received: true });
});

// ── Post-Call Auto-Actions Helper ────────────────────────────────────────────

interface CallSummaryJson {
  callerIntent: string;
  outcome: string;
  appointmentDetails: string | null;
  urgency: string;
  followUpNeeded: boolean;
  followUpReason: string | null;
}

/**
 * After a call is summarized by Claude, parse the summary and take automatic
 * actions: create appointments, follow-up tasks, deals, and update lead scores.
 */
async function processPostCallActions(
  summaryText: string,
  callerPhone: string,
  calledNumber: string,
  callSid: string,
): Promise<void> {
  // Try to parse the summary JSON
  let summary: CallSummaryJson;
  try {
    const cleanJson = summaryText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    summary = JSON.parse(cleanJson) as CallSummaryJson;
  } catch {
    logger.warn('Could not parse call summary JSON for auto-actions', { callSid });
    return;
  }

  // Resolve the org from the called number
  let resolvedOrg: ResolvedOrg | null = null;
  try {
    resolvedOrg = await resolveOrgByPhoneNumber(calledNumber);
  } catch {
    logger.warn('Could not resolve org for post-call actions', { calledNumber });
    return;
  }

  if (!resolvedOrg) {
    logger.debug('No org resolved for post-call actions, skipping', { calledNumber });
    return;
  }

  const orgId = resolvedOrg.orgId;

  // Resolve the contact
  let contactId: string | null = null;
  try {
    const contact = await resolveContact(orgId, callerPhone, 'phone');
    contactId = contact.id;
  } catch (err) {
    logger.warn('Could not resolve contact for post-call actions', {
      orgId,
      callerPhone,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // Determine call outcome type
  const outcomeLower = summary.outcome.toLowerCase();
  const hasAppointment = summary.appointmentDetails !== null
    && summary.appointmentDetails !== 'null'
    && summary.appointmentDetails.trim() !== '';
  const isQualified = outcomeLower.includes('qualif') || outcomeLower.includes('interest');
  const isSpam = outcomeLower.includes('spam') || outcomeLower.includes('wrong number') || outcomeLower.includes('robo');

  // ── Update contact's aiScore ─────────────────────────────────────────
  let scoreAdjustment = 0;
  if (hasAppointment) scoreAdjustment = 30;
  else if (isQualified) scoreAdjustment = 20;
  else if (isSpam) scoreAdjustment = -50;

  if (scoreAdjustment !== 0 && contactId) {
    try {
      const { sql: sqlTag } = await import('drizzle-orm');
      await db
        .update(contacts)
        .set({
          aiScore: sqlTag`GREATEST(0, LEAST(100, ${contacts.aiScore} + ${scoreAdjustment}))`,
          updatedAt: new Date(),
        })
        .where(and(
          withOrgScope(contacts.orgId, orgId),
          eq(contacts.id, contactId),
        ));

      logger.info('Contact aiScore updated from call', {
        contactId,
        adjustment: String(scoreAdjustment),
        callSid,
      });
    } catch (err) {
      logger.error('Failed to update contact aiScore', {
        contactId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Create appointment if details found ──────────────────────────────
  if (hasAppointment && contactId) {
    try {
      // Default to tomorrow 9am if we can't parse exact date from summary
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(10, 0, 0, 0);

      const [newAppointment] = await db
        .insert(appointments)
        .values({
          orgId,
          contactId,
          title: summary.callerIntent || 'Appointment from AI call',
          description: `Auto-created from AI call (${callSid}). Details: ${summary.appointmentDetails}`,
          startTime: tomorrow,
          endTime,
          status: 'scheduled',
          location: null,
          notes: `AI-booked. Summary: ${summary.outcome}`,
        })
        .returning();

      if (newAppointment) {
        logger.info('Appointment auto-created from AI call', {
          appointmentId: newAppointment.id,
          contactId,
          orgId,
          callSid,
        });

        // Log activity
        await activityService.logActivity(orgId, {
          contactId,
          type: 'appointment_booked',
          title: 'AI booked appointment from call',
          description: `AI automatically booked an appointment. Details: ${summary.appointmentDetails}`,
          metadata: { callSid, appointmentId: newAppointment.id },
        });

        // Send confirmation SMS + email to caller (fire-and-forget)
        notificationService.sendAppointmentConfirmation(orgId, newAppointment.id).catch((err) => {
          logger.error('Failed to send appointment confirmation after AI call', {
            appointmentId: newAppointment.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch (err) {
      logger.error('Failed to auto-create appointment from AI call', {
        callSid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Create follow-up activity if needed ──────────────────────────────
  if (summary.followUpNeeded && contactId) {
    try {
      await activityService.logActivity(orgId, {
        contactId,
        type: 'task',
        title: 'Follow-up needed from AI call',
        description: summary.followUpReason ?? `AI flagged this call for follow-up. Caller intent: ${summary.callerIntent}`,
        metadata: { callSid, urgency: summary.urgency, source: 'ai_call_auto_action' },
      });

      logger.info('Follow-up activity created from AI call', {
        contactId,
        orgId,
        callSid,
        reason: summary.followUpReason,
      });

      // Notify owner if urgency is high
      if (summary.urgency === 'high') {
        notificationService.sendOwnerNotification(
          orgId,
          `Urgent follow-up needed: ${summary.callerIntent}. Caller: ${callerPhone}. Reason: ${summary.followUpReason ?? 'AI flagged as high priority.'}`,
          { subject: 'Urgent: Follow-up needed from AI call' },
        ).catch((err) => {
          logger.error('Failed to send urgent follow-up notification', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch (err) {
      logger.error('Failed to create follow-up activity', {
        callSid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Create deal if lead is qualified (and no appointment already) ────
  if (isQualified && contactId && !hasAppointment) {
    try {
      // Find the default pipeline and its "new_lead" stage
      const [defaultPipeline] = await db
        .select()
        .from(pipelines)
        .where(and(
          withOrgScope(pipelines.orgId, orgId),
          eq(pipelines.isDefault, true),
        ))
        .limit(1);

      if (defaultPipeline) {
        const [newLeadStage] = await db
          .select()
          .from(pipelineStages)
          .where(and(
            eq(pipelineStages.pipelineId, defaultPipeline.id),
            eq(pipelineStages.slug, 'new_lead'),
          ))
          .limit(1);

        if (newLeadStage) {
          const [newDeal] = await db
            .insert(deals)
            .values({
              orgId,
              pipelineId: defaultPipeline.id,
              stageId: newLeadStage.id,
              contactId,
              title: summary.callerIntent || 'Lead from AI call',
              value: '0',
              currency: 'AUD',
              metadata: { source: 'ai_call', callSid, urgency: summary.urgency },
            })
            .returning();

          if (newDeal) {
            logger.info('Deal auto-created from qualified AI call', {
              dealId: newDeal.id,
              contactId,
              orgId,
              callSid,
            });

            await activityService.logActivity(orgId, {
              contactId,
              dealId: newDeal.id,
              type: 'deal_stage_change',
              title: 'New deal from AI call',
              description: `AI qualified this lead and created a deal. Intent: ${summary.callerIntent}`,
              metadata: { callSid },
            });
          }
        } else {
          logger.warn('No "new_lead" stage found in default pipeline', { orgId, pipelineId: defaultPipeline.id });
        }
      } else {
        logger.warn('No default pipeline found for auto-deal creation', { orgId });
      }
    } catch (err) {
      logger.error('Failed to auto-create deal from AI call', {
        callSid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /call-logs — View recent call logs (for debugging/admin)
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.get('/call-logs', async (c) => {
  return c.json({
    count: callLogs.length,
    logs: callLogs.slice(-20).reverse().map((log) => ({
      callSid: log.callSid,
      callerPhone: log.callerPhone,
      calledNumber: log.calledNumber,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      turnCount: log.turnCount,
      summary: log.summary,
      messageCount: log.transcript.length,
    })),
    activeConversations: callConversations.size,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /configure-numbers — One-time setup: point Twilio numbers to our webhooks
//  This calls Twilio API to update the voice/SMS URLs on all numbers.
// ═══════════════════════════════════════════════════════════════════════════════

const configureNumbersSchema = z.object({
  accountSid: z.string().startsWith('AC').optional(),
  authToken: z.string().min(1).optional(),
  numberSids: z.array(z.string()).optional(),
});

twilioWebhooks.post('/configure-numbers', async (c) => {
  const rawBody = await c.req.json();
  const parsed = configureNumbersSchema.safeParse(rawBody);

  if (!parsed.success) {
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  // Use provided credentials or fall back to env vars
  const accountSid = parsed.data.accountSid ?? config.TWILIO_ACCOUNT_SID;
  const authToken = parsed.data.authToken ?? config.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return c.json(
      { error: 'Twilio credentials not available. Provide accountSid + authToken or configure env vars.', code: 'NO_CREDENTIALS', status: 400 },
      400,
    );
  }

  const baseUrl = config.APP_URL;
  const voiceUrl = `${baseUrl}/webhooks/twilio/voice`;
  const smsUrl = `${baseUrl}/webhooks/twilio/sms`;
  const statusUrl = `${baseUrl}/webhooks/twilio/status`;

  try {
    // Get all numbers on the account
    const numbers = await TwilioClient.listPhoneNumbers(accountSid, authToken);

    if (numbers.length === 0) {
      return c.json({ error: 'No phone numbers found on this Twilio account.', code: 'NO_NUMBERS', status: 404 }, 404);
    }

    // If specific SIDs provided, filter to those; otherwise configure all
    const targetNumbers = parsed.data.numberSids
      ? numbers.filter((n) => parsed.data.numberSids!.includes(n.sid))
      : numbers;

    const results: Array<{ phoneNumber: string; sid: string; status: string }> = [];

    for (const num of targetNumbers) {
      try {
        await TwilioClient.configureWebhooks(accountSid, authToken, num.sid, voiceUrl, smsUrl);
        results.push({ phoneNumber: num.phoneNumber, sid: num.sid, status: 'configured' });
        logger.info('Number webhook configured', { phoneNumber: num.phoneNumber, sid: num.sid, voiceUrl, smsUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ phoneNumber: num.phoneNumber, sid: num.sid, status: `error: ${message}` });
        logger.error('Failed to configure number webhook', { phoneNumber: num.phoneNumber, sid: num.sid, error: message });
      }
    }

    return c.json({
      success: true,
      webhookUrls: { voiceUrl, smsUrl, statusUrl },
      numbers: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to configure Twilio webhooks', { error: message });

    return c.json(
      { error: `Failed to configure webhooks: ${message}`, code: 'TWILIO_ERROR', status: 500 },
      500,
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /health — Quick check that the voice system is ready
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.get('/health', async (c) => {
  const hasAnthropicKey = Boolean(config.ANTHROPIC_API_KEY);
  const hasTwilioCredentials = Boolean(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN);

  return c.json({
    status: hasAnthropicKey ? 'ready' : 'missing_anthropic_key',
    anthropicConfigured: hasAnthropicKey,
    twilioConfigured: hasTwilioCredentials,
    appUrl: config.APP_URL,
    voiceWebhook: `${config.APP_URL}/webhooks/twilio/voice`,
    smsWebhook: `${config.APP_URL}/webhooks/twilio/sms`,
    activeVoiceConversations: callConversations.size,
    activeSmsConversations: smsConversations.size,
    totalCallLogs: callLogs.length,
  });
});

// ── In-memory outbound call status store ────────────────────────────────────

interface OutboundCallStatus {
  callSid: string;
  to: string;
  from: string;
  status: string;
  duration: number;
  startedAt: string;
  updatedAt: string;
}

const outboundCallStatusStore = new Map<string, OutboundCallStatus>();

/**
 * Auto-clean outbound call statuses older than 1 hour.
 */
function cleanStaleOutboundStatuses(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [callSid, entry] of outboundCallStatusStore) {
    if (new Date(entry.startedAt).getTime() < oneHourAgo) {
      outboundCallStatusStore.delete(callSid);
    }
  }
}

setInterval(cleanStaleOutboundStatuses, 10 * 60 * 1000);

// ── Helper: look up org's Twilio numbers ────────────────────────────────────

async function getOrgTwilioNumbers(
  accountSid: string,
  authToken: string,
): Promise<Array<{ sid: string; phoneNumber: string; friendlyName: string }>> {
  try {
    const numbers = await TwilioClient.listPhoneNumbers(accountSid, authToken);
    return numbers.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
    }));
  } catch {
    return [];
  }
}

// ── Outbound Call (DEPRECATED) ──────────────────────────────────────────────
// This endpoint is DEPRECATED. Browser calling now uses the Twilio Voice SDK
// (device.connect) which goes through the /voice/twiml TwiML App webhook.
// This REST API approach creates a SECOND call leg, causing the "double call"
// bug. Kept only for backwards compatibility — frontend should NOT call this.

const outboundCallSchema = z.object({
  to: z.string().min(10, 'Destination number is required'),
  from: z.string().min(10).optional(),
});

twilioWebhooks.post('/outbound-call', async (c) => {
  logger.warn('DEPRECATED: /outbound-call endpoint called. Use Voice SDK (device.connect) instead.');
  const body = await c.req.json();
  const parsed = outboundCallSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: 'Invalid phone number. Please enter a valid number to call.', code: 'VALIDATION_ERROR', status: 400 },
      400,
    );
  }

  const { to } = parsed.data;
  let { from } = parsed.data;

  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
    return c.json(
      { error: 'Twilio not configured. Add credentials in Settings > Phone System.', code: 'NO_TWILIO_CONFIG', status: 400 },
      400,
    );
  }

  // If no "from" number provided, auto-detect from the account's Twilio numbers
  if (!from) {
    // First try env var
    if (config.TWILIO_PHONE_NUMBER) {
      from = config.TWILIO_PHONE_NUMBER;
      logger.info('Using TWILIO_PHONE_NUMBER from env', { from });
    } else {
      // Look up numbers from Twilio API
      const twilioNumbers = await getOrgTwilioNumbers(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_AUTH_TOKEN,
      );

      if (twilioNumbers.length === 0) {
        return c.json(
          {
            error: 'No Twilio phone number configured. Go to Settings > Phone System to set up a number.',
            code: 'NO_TWILIO_NUMBER',
            status: 400,
          },
          400,
        );
      }

      const firstNumber = twilioNumbers[0];
      if (!firstNumber) {
        return c.json(
          { error: 'No Twilio phone number found on account.', code: 'NO_TWILIO_NUMBER', status: 400 },
          400,
        );
      }
      from = firstNumber.phoneNumber;
      logger.info('Auto-detected Twilio number for outbound call', {
        from,
        friendlyName: firstNumber.friendlyName,
      });
    }
  } else {
    // Verify the provided "from" number is actually owned by this Twilio account
    const twilioNumbers = await getOrgTwilioNumbers(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN,
    );

    const isValidFrom = twilioNumbers.some((n) => n.phoneNumber === from);
    // Also allow the env-configured number
    const isEnvNumber = config.TWILIO_PHONE_NUMBER && from === config.TWILIO_PHONE_NUMBER;

    if (!isValidFrom && !isEnvNumber) {
      logger.warn('Outbound call attempted with non-Twilio from number', { from, to });
      return c.json(
        {
          error: `The number ${from} is not a verified Twilio number on your account. Please select a valid Twilio number.`,
          code: 'INVALID_FROM_NUMBER',
          status: 400,
        },
        400,
      );
    }
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    // Build proper TwiML: Dial the destination number
    const twimlStr = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Dial callerId="${escapeXml(from)}" timeout="30">`,
      `    <Number>${escapeXml(to)}</Number>`,
      '  </Dial>',
      '</Response>',
    ].join('\n');

    // Status callback URL for tracking call progress
    const statusCallbackUrl = `${config.APP_URL}/webhooks/twilio/outbound-status`;

    const call = await client.calls.create({
      to,
      from,
      twiml: twimlStr,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    // Store initial status
    outboundCallStatusStore.set(call.sid, {
      callSid: call.sid,
      to,
      from,
      status: call.status || 'queued',
      duration: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info('Outbound call initiated', { callSid: call.sid, to, from, status: call.status });
    return c.json({ success: true, callSid: call.sid, status: call.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Call failed';
    logger.error('Outbound call failed', { error: message, to, from });

    // Parse common Twilio errors into user-friendly messages
    if (message.includes('not verified') || message.includes('not a valid phone number')) {
      return c.json(
        { error: `The source number ${from} is not verified with Twilio. Check your phone setup.`, code: 'UNVERIFIED_NUMBER', status: 400 },
        400,
      );
    }
    if (message.includes('not a valid') || message.includes('invalid')) {
      return c.json(
        { error: 'Invalid phone number format. Make sure numbers are in E.164 format (e.g., +61404576080).', code: 'INVALID_NUMBER', status: 400 },
        400,
      );
    }

    return c.json({ error: message, code: 'CALL_FAILED', status: 500 }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /outbound-status — Status callback for outbound calls
// ═══════════════════════════════════════════════════════════════════════════════

const outboundStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
}).passthrough();

twilioWebhooks.post('/outbound-status', async (c) => {
  const body = await c.req.parseBody();
  const parsed = outboundStatusSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn('Invalid outbound status payload');
    return c.json({ received: true });
  }

  const { CallSid, CallStatus, CallDuration } = parsed.data;

  logger.info('Outbound call status update', {
    callSid: CallSid,
    status: CallStatus,
    duration: CallDuration ?? '0',
  });

  // Update stored status
  const existing = outboundCallStatusStore.get(CallSid);
  if (existing) {
    existing.status = CallStatus;
    existing.duration = CallDuration ? parseInt(CallDuration, 10) : 0;
    existing.updatedAt = new Date().toISOString();
  } else {
    outboundCallStatusStore.set(CallSid, {
      callSid: CallSid,
      to: parsed.data.To ?? '',
      from: parsed.data.From ?? '',
      status: CallStatus,
      duration: CallDuration ? parseInt(CallDuration, 10) : 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return c.json({ received: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /call-status/:callSid — Frontend polls this to get real call status
// ═══════════════════════════════════════════════════════════════════════════════

twilioWebhooks.get('/call-status/:callSid', async (c) => {
  const callSid = c.req.param('callSid');

  // Check our in-memory store first (updated by status callbacks)
  const stored = outboundCallStatusStore.get(callSid);
  if (stored) {
    return c.json({
      callSid: stored.callSid,
      status: stored.status,
      duration: stored.duration,
      from: stored.from,
      to: stored.to,
    });
  }

  // If not in store, try fetching live from Twilio
  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
    try {
      const { default: twilio } = await import('twilio');
      const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      const call = await client.calls(callSid).fetch();

      return c.json({
        callSid: call.sid,
        status: call.status,
        duration: call.duration ? parseInt(call.duration, 10) : 0,
        from: call.from,
        to: call.to,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.warn('Failed to fetch call status from Twilio', { callSid, error: message });
    }
  }

  return c.json(
    { error: 'Call not found', code: 'NOT_FOUND', status: 404 },
    404,
  );
});

export { twilioWebhooks as twilioWebhookRoutes };
