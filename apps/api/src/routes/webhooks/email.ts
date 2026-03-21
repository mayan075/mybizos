import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';

const emailWebhooks = new Hono();

// ── Validation Schema ──

const postmarkInboundSchema = z.object({
  From: z.string(),
  FromFull: z
    .object({
      Email: z.string().email(),
      Name: z.string(),
    })
    .optional(),
  To: z.string(),
  ToFull: z
    .array(
      z.object({
        Email: z.string().email(),
        Name: z.string(),
      }),
    )
    .optional(),
  Subject: z.string(),
  MessageID: z.string(),
  TextBody: z.string().optional().default(''),
  HtmlBody: z.string().optional().default(''),
  Date: z.string(),
  MailboxHash: z.string().optional().default(''),
  Tag: z.string().optional().default(''),
  Headers: z
    .array(
      z.object({
        Name: z.string(),
        Value: z.string(),
      }),
    )
    .optional()
    .default([]),
  Attachments: z
    .array(
      z.object({
        Name: z.string(),
        ContentType: z.string(),
        ContentLength: z.number(),
      }),
    )
    .optional()
    .default([]),
});

// ── Routes ──
// This webhook endpoint does NOT use auth middleware since it is called
// by Postmark's infrastructure. In production, requests will be validated
// using Postmark's webhook signature or source IP allowlist.

/**
 * POST /webhooks/email/inbound — Postmark inbound email webhook
 *
 * Processes incoming emails, creates/updates conversations,
 * and optionally routes to AI for auto-reply.
 */
emailWebhooks.post('/inbound', async (c) => {
  const body = await c.req.json();
  const parsed = postmarkInboundSchema.parse(body);

  const fromEmail = parsed.FromFull?.Email || parsed.From;
  const fromName = parsed.FromFull?.Name || parsed.From;

  logger.info('Inbound email received', {
    messageId: parsed.MessageID,
    from: fromEmail,
    to: parsed.To,
    subject: parsed.Subject,
    hasAttachments: parsed.Attachments.length > 0,
  });

  // In production:
  // 1. Look up org by the "To" email address / mailbox hash
  // 2. Find or create contact by sender email
  // 3. Find or create conversation (thread by Subject / In-Reply-To header)
  // 4. Store the inbound email as a message
  // 5. Check if AI email agent is enabled and should auto-reply
  // 6. Process attachments (store in object storage)

  // Extract the org identifier from the recipient address
  // e.g., inbox+org_01@inbound.mybizos.com -> org_01
  const mailboxHash = parsed.MailboxHash;
  const orgId = mailboxHash || 'org_01'; // Fallback for development

  // Check for emergency keywords in subject or body
  const emergencyKeywords = ['flooding', 'gas leak', 'fire', 'emergency', 'burst pipe', 'urgent'];
  const content = `${parsed.Subject} ${parsed.TextBody}`.toLowerCase();
  const hasEmergency = emergencyKeywords.some((kw) => content.includes(kw));

  if (hasEmergency) {
    logger.warn('Emergency keyword detected in inbound email', {
      from: fromEmail,
      subject: parsed.Subject,
      orgId,
    });
    // In production: trigger immediate owner alert via SMS/push notification
  }

  // Mock: create a conversation record for the inbound email
  const result = {
    messageId: parsed.MessageID,
    conversationId: `conv_email_${Date.now()}`,
    contactEmail: fromEmail,
    contactName: fromName,
    subject: parsed.Subject,
    processed: true,
    aiAutoReply: false,
    emergencyDetected: hasEmergency,
  };

  return c.json({ data: result });
});

export { emailWebhooks as emailWebhookRoutes };
