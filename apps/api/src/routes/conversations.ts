import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { getMockConversations, getMockMessages, getFrontendConversations, getFrontendMessages } from '../services/mock-service.js';
import { logger } from '../middleware/logger.js';

const conversations = new Hono();

conversations.use('*', authMiddleware, orgScopeMiddleware);

const listConversationsSchema = z.object({
  channel: z.enum(['sms', 'email', 'call', 'whatsapp', 'webchat']).optional(),
  status: z.enum(['open', 'closed', 'snoozed']).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  channel: z.enum(['sms', 'email']),
});

conversations.get('/', async (c) => {
  const filters = listConversationsSchema.parse({
    channel: c.req.query('channel'),
    status: c.req.query('status'),
  });
  try {
    const { conversationService } = await import('../services/conversation-service.js');
    const orgId = c.get('orgId');
    const result = await conversationService.list(orgId, filters);
    logger.info('Conversations list served from REAL DATABASE', { orgId, count: result.length });
    return c.json({ data: result, _source: 'database' });
  } catch (err) {
    logger.warn('DB unavailable for conversations list, using MOCK data', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ data: getFrontendConversations(filters), _source: 'mock' });
  }
});

conversations.get('/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  try {
    const { conversationService } = await import('../services/conversation-service.js');
    const orgId = c.get('orgId');
    const messages = await conversationService.getMessages(orgId, conversationId);
    logger.info('Messages served from REAL DATABASE', { orgId, conversationId, count: messages.length });
    return c.json({ data: messages, _source: 'database' });
  } catch (err) {
    logger.warn('DB unavailable for messages, using MOCK data', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ data: getFrontendMessages(conversationId), _source: 'mock' });
  }
});

conversations.post('/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  const body = await c.req.json();
  const parsed = sendMessageSchema.parse(body);
  try {
    const { conversationService } = await import('../services/conversation-service.js');
    const orgId = c.get('orgId');
    const message = await conversationService.createMessage(orgId, conversationId, {
      direction: 'outbound',
      channel: parsed.channel === 'sms' ? 'sms' : 'email',
      senderType: 'user',
      body: parsed.content,
    });
    logger.info('Message created in REAL DATABASE', { orgId, conversationId });
    return c.json({ data: message }, 201);
  } catch (err) {
    logger.warn('DB unavailable for message create, returning MOCK', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ data: { id: `msg_${Date.now()}`, conversationId, direction: 'outbound', channel: parsed.channel, body: parsed.content, createdAt: new Date().toISOString() } }, 201);
  }
});

export { conversations as conversationRoutes };
