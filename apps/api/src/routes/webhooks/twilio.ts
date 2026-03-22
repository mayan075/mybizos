import { Hono } from 'hono';
import { logger } from '../../middleware/logger.js';

const twilioWebhooks = new Hono();

/**
 * Twilio webhook routes -- in dev mode without a database, these just
 * log the request and return empty responses. In production with a DB,
 * the full processing pipeline runs.
 */

function emptyTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>';
}

twilioWebhooks.post('/sms', async (c) => {
  logger.info('Twilio SMS webhook received (dev mode - no processing)');
  return c.text(emptyTwiml(), 200, { 'Content-Type': 'text/xml' });
});

twilioWebhooks.post('/voice', async (c) => {
  logger.info('Twilio voice webhook received (dev mode - no processing)');
  const twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response><Say voice="alice">Thank you for calling. This system is in development mode. Goodbye.</Say><Hangup/></Response>';
  return c.text(twiml, 200, { 'Content-Type': 'text/xml' });
});

twilioWebhooks.post('/status', async (c) => {
  logger.info('Twilio status webhook received (dev mode)');
  return c.json({ received: true });
});

export { twilioWebhooks as twilioWebhookRoutes };
