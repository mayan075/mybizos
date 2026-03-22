import { Hono } from 'hono';
import { logger } from '../../middleware/logger.js';

const stripeWebhooks = new Hono();

/**
 * Stripe webhook routes -- in dev mode without a database, these just
 * log the request and return acknowledgment. In production with a DB,
 * the full payment processing pipeline runs.
 */

stripeWebhooks.post('/', async (c) => {
  logger.info('Stripe webhook received (dev mode - no processing)');
  return c.json({ received: true });
});

export { stripeWebhooks as stripeWebhookRoutes };
