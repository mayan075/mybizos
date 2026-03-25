import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';

const vapiWebhooks = new Hono();

const vapiCallEndedSchema = z.object({
  call: z.object({
    id: z.string(),
    status: z.string(),
  }).passthrough(),
}).passthrough();

const vapiToolCallSchema = z.object({
  message: z.object({
    toolCallList: z.array(z.object({
      id: z.string(),
      function: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()).optional(),
      }),
    })).optional(),
  }).passthrough(),
}).passthrough();

/**
 * Vapi webhook routes -- in dev mode without a database, these just
 * log the request and return acknowledgment. In production with a DB,
 * the full call processing pipeline runs.
 */

vapiWebhooks.post('/call-ended', async (c) => {
  const raw = await c.req.json();
  const parsed = vapiCallEndedSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('Invalid Vapi call-ended payload', { error: parsed.error.message });
    return c.json({ error: 'Invalid payload', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }
  logger.info('Vapi call-ended webhook received (dev mode - no processing)', { callId: parsed.data.call.id });
  return c.json({ received: true });
});

vapiWebhooks.post('/tool-call', async (c) => {
  const raw = await c.req.json();
  const parsed = vapiToolCallSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('Invalid Vapi tool-call payload', { error: parsed.error.message });
    return c.json({ error: 'Invalid payload', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }
  logger.info('Vapi tool-call webhook received (dev mode - no processing)');
  return c.json({
    results: [
      {
        toolCallId: 'dev-mode',
        result: 'This system is in development mode. Tool calls are not processed.',
      },
    ],
  });
});

export { vapiWebhooks as vapiWebhookRoutes };
