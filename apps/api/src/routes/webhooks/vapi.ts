import { Hono } from 'hono';
import { logger } from '../../middleware/logger.js';

const vapiWebhooks = new Hono();

/**
 * Vapi webhook routes -- in dev mode without a database, these just
 * log the request and return acknowledgment. In production with a DB,
 * the full call processing pipeline runs.
 */

vapiWebhooks.post('/call-ended', async (c) => {
  logger.info('Vapi call-ended webhook received (dev mode - no processing)');
  return c.json({ received: true });
});

vapiWebhooks.post('/tool-call', async (c) => {
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
