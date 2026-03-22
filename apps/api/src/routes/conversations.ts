import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { conversationService } from '../services/conversation-service.js';

const conversations = new Hono();

conversations.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const listConversationsSchema = z.object({
  channel: z.enum(['sms', 'email', 'call', 'whatsapp', 'webchat']).optional(),
  status: z.enum(['open', 'closed', 'snoozed']).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  channel: z.enum(['sms', 'email']),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/conversations — list conversations (filterable by channel, status)
 */
conversations.get('/', async (c) => {
  const orgId = c.get('orgId');
  const filters = listConversationsSchema.parse({
    channel: c.req.query('channel'),
    status: c.req.query('status'),
  });

  const result = await conversationService.list(orgId, filters);
  return c.json({ data: result });
});

/**
 * GET /orgs/:orgId/conversations/:id/messages — get messages in a conversation
 */
conversations.get('/:id/messages', async (c) => {
  const orgId = c.get('orgId');
  const conversationId = c.req.param('id');

  const messages = await conversationService.getMessages(orgId, conversationId);
  return c.json({ data: messages });
});

/**
 * POST /orgs/:orgId/conversations/:id/messages — send a message (SMS/email)
 */
conversations.post('/:id/messages', async (c) => {
  const orgId = c.get('orgId');
  const conversationId = c.req.param('id');
  const body = await c.req.json();
  const parsed = sendMessageSchema.parse(body);

  const message = await conversationService.createMessage(orgId, conversationId, {
    direction: 'outbound',
    channel: parsed.channel === 'sms' ? 'sms' : 'email',
    senderType: 'user',
    body: parsed.content,
  });
  return c.json({ data: message }, 201);
});

export { conversations as conversationRoutes };
