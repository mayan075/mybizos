import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const phoneSystem = new Hono();

phoneSystem.use('*', authMiddleware, orgScopeMiddleware);

/**
 * Phone system routes -- all return mock/placeholder data when DB/Twilio
 * are unavailable (dev mode without external services).
 */

phoneSystem.post('/connect', async (c) => {
  const body = await c.req.json();
  logger.info('Phone system connect requested (mock mode)', { body });
  return c.json({
    error: 'Phone system requires Twilio credentials and database. Not available in dev mock mode.',
    code: 'NOT_CONFIGURED',
    status: 400,
  }, 400);
});

phoneSystem.post('/waitlist', async (c) => {
  const body = await c.req.json();
  logger.info('Phone waitlist signup (mock mode)', { body });
  return c.json({ success: true, message: 'You have been added to the waitlist (mock mode).' });
});

phoneSystem.get('/numbers', async (c) => {
  return c.json({ numbers: [] });
});

phoneSystem.post('/numbers/:numberSid/configure', async (c) => {
  return c.json({ success: true, message: 'Number configured (mock mode)' });
});

phoneSystem.delete('/disconnect', async (c) => {
  return c.json({ success: true });
});

phoneSystem.get('/status', async (c) => {
  return c.json({ connected: false, provider: null });
});

export { phoneSystem as phoneSystemRoutes };
