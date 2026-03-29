import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';

const emailWebhooks = new Hono();

// ── Validation Schema ──

const resendInboundSchema = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  text: z.string().optional().default(''),
  html: z.string().optional().default(''),
  created_at: z.string().optional().default(''),
  headers: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      }),
    )
    .optional()
    .default([]),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content_type: z.string(),
        size: z.number(),
      }),
    )
    .optional()
    .default([]),
});

// ── Routes ──
// This webhook endpoint does NOT use auth middleware since it is called
// by Resend's infrastructure. In production, requests will be validated
// using Resend's webhook signature verification.

/**
 * POST /webhooks/email/inbound — Resend inbound email webhook
 *
 * Processes incoming emails, creates/updates conversations,
 * and optionally routes to AI for auto-reply.
 */
emailWebhooks.post('/inbound', async (c) => {
  const body = await c.req.json();
  const parsed = resendInboundSchema.parse(body);

  const fromEmail = parsed.from;
  const fromName = parsed.from;

  logger.info('Inbound email received', {
    from: fromEmail,
    to: parsed.to,
    subject: parsed.subject,
    hasAttachments: parsed.attachments.length > 0,
  });

  // In production:
  // 1. Look up org by the "To" email address / mailbox hash
  // 2. Find or create contact by sender email
  // 3. Find or create conversation (thread by Subject / In-Reply-To header)
  // 4. Store the inbound email as a message
  // 5. Check if AI email agent is enabled and should auto-reply
  // 6. Process attachments (store in object storage)

  // Extract the org identifier from the recipient address
  // e.g., inbox+org_01@inbound.hararai.com -> org_01
  const toAddress = parsed.to;
  const mailboxHash = toAddress.includes('+') ? toAddress.split('+')[1]?.split('@')[0] ?? '' : '';
  if (!mailboxHash) {
    logger.warn('Inbound email could not resolve org — no mailbox hash in address', {
      to: toAddress,
      from: fromEmail,
    });
    return c.json(
      { error: 'Could not determine target organization', code: 'NO_ORG_RESOLVED', status: 400 },
      400,
    );
  }
  const orgId = mailboxHash;

  // Check for emergency keywords in subject or body
  const emergencyKeywords = ['flooding', 'gas leak', 'fire', 'emergency', 'burst pipe', 'urgent'];
  const content = `${parsed.subject} ${parsed.text}`.toLowerCase();
  const hasEmergency = emergencyKeywords.some((kw) => content.includes(kw));

  if (hasEmergency) {
    logger.warn('Emergency keyword detected in inbound email', {
      from: fromEmail,
      subject: parsed.subject,
      orgId,
    });
    // In production: trigger immediate owner alert via SMS/push notification
  }

  // Mock: create a conversation record for the inbound email
  const result = {
    messageId: `resend_${Date.now()}`,
    conversationId: `conv_email_${Date.now()}`,
    contactEmail: fromEmail,
    contactName: fromName,
    subject: parsed.subject,
    processed: true,
    aiAutoReply: false,
    emergencyDetected: hasEmergency,
  };

  return c.json({ data: result });
});

export { emailWebhooks as emailWebhookRoutes };
