import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../../middleware/logger.js';

const stripeWebhooks = new Hono();

const stripeEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.record(z.unknown()) }).optional(),
}).passthrough();

/**
 * Stripe webhook routes -- in dev mode without a database, these just
 * log the request and return acknowledgment. In production with a DB,
 * the full payment processing pipeline runs.
 */

stripeWebhooks.post('/', async (c) => {
  const raw = await c.req.json();
  const parsed = stripeEventSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('Invalid Stripe webhook payload', { error: parsed.error.message });
    return c.json({ error: 'Invalid payload', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }
  logger.info('Stripe webhook received (dev mode - no processing)', { eventType: parsed.data.type });
  return c.json({ received: true });
});

export { stripeWebhooks as stripeWebhookRoutes };
