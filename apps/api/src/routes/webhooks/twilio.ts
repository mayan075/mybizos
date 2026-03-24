import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';
import { config } from '../../config.js';
import { ClaudeClient } from '@mybizos/ai';
import type { ClaudeMessage } from '@mybizos/ai';
import { getPhoneAgentPrompt, getSmsAgentPrompt } from '@mybizos/ai';
import { TwilioClient } from '@mybizos/integrations';

const twilioWebhooks = new Hono();

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_CONVERSATION_TURNS = 10;
const VOICE_MODEL = 'claude-sonnet-4-20250514';
const GATHER_TIMEOUT_SECONDS = 5;
const SPEECH_TIMEOUT = 'auto';

/**
 * Default business config — in production this would come from the org's
 * settings in the database. For now we hard-code for Northern Removals.
 */
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

  // Build the webhook URL for processing caller's speech
  const baseUrl = config.APP_URL;
  const respondUrl = `${baseUrl}/webhooks/twilio/voice/respond`;

  // AI disclosure greeting
  const greeting = `Hi, this is ${DEFAULT_BUSINESS.name}'s AI assistant. This call may be recorded. How can I help you today?`;

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
    const farewell = "Thank you for calling Northern Removals. We've been chatting for a while, so let me have a team member follow up with you. Have a great day!";
    conversation.messages.push({ role: 'user', content: callerText });
    conversation.messages.push({ role: 'assistant', content: farewell });
    return c.text(buildGoodbyeTwiml(farewell), 200, { 'Content-Type': 'text/xml' });
  }

  // Add the caller's message to history
  conversation.messages.push({ role: 'user', content: callerText });

  // Call Claude to get the AI response
  let aiResponseText: string;

  try {
    const claude = getClaudeClient();
    const systemPrompt = getPhoneAgentPrompt({
      businessName: DEFAULT_BUSINESS.name,
      vertical: DEFAULT_BUSINESS.vertical,
      agentName: DEFAULT_BUSINESS.agentName,
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

  // Get or initialize SMS conversation for this phone number
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

  // Call Claude for the SMS response
  let replyText: string;

  try {
    const claude = getClaudeClient();
    const systemPrompt = getSmsAgentPrompt({
      businessName: DEFAULT_BUSINESS.name,
      vertical: DEFAULT_BUSINESS.vertical,
      agentName: DEFAULT_BUSINESS.agentName,
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

    replyText = `Thanks for reaching out to ${DEFAULT_BUSINESS.name}! We're having a small technical issue. Please call us or try again shortly.`;
  }

  // Store the AI reply in conversation history
  smsConvo.messages.push({ role: 'assistant', content: replyText });

  // Respond using TwiML <Message> (Twilio sends the reply for us)
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

    // Store in call logs
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

// ── Outbound Call ───────────────────────────────────────────────────────────
// Makes a real outbound call via Twilio

const outboundCallSchema = z.object({
  to: z.string().min(10),
  from: z.string().min(10),
});

twilioWebhooks.post('/outbound-call', async (c) => {
  const body = await c.req.json();
  const parsed = outboundCallSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid phone numbers', details: parsed.error.flatten() }, 400);
  }

  const { to, from } = parsed.data;

  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
    return c.json({ error: 'Twilio not configured. Add credentials in Admin Settings.' }, 400);
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    const call = await client.calls.create({
      to,
      from,
      twiml: '<Response><Dial>' + to + '</Dial></Response>',
    });

    logger.info('Outbound call initiated', { callSid: call.sid, to, from });
    return c.json({ success: true, callSid: call.sid, status: call.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Call failed';
    logger.error('Outbound call failed', { error: message, to, from });
    return c.json({ error: message }, 500);
  }
});

export { twilioWebhooks as twilioWebhookRoutes };
