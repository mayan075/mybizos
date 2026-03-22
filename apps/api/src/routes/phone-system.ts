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
  logger.info('Phone system connect requested', { body });
  // In demo mode, simulate a successful connection
  return c.json({
    success: true,
    accountName: body.provider === 'mybizos' ? 'MyBizOS Managed' : 'Your Twilio Account',
    provider: body.provider || 'byo-twilio',
  });
});

phoneSystem.post('/waitlist', async (c) => {
  const body = await c.req.json();
  logger.info('Phone waitlist signup', { body });
  return c.json({ success: true, message: 'You have been added to the waitlist!' });
});

phoneSystem.get('/numbers', async (c) => {
  // Return demo numbers so the UI works without real Twilio
  return c.json({
    numbers: [
      {
        sid: 'PN_demo_1',
        phoneNumber: '+61291234567',
        friendlyName: 'Main Business Line',
        capabilities: { voice: true, sms: true, mms: false },
        isActive: true,
      },
      {
        sid: 'PN_demo_2',
        phoneNumber: '+61291234568',
        friendlyName: 'Marketing / Google Ads',
        capabilities: { voice: true, sms: true, mms: false },
        isActive: true,
      },
    ],
  });
});

phoneSystem.post('/numbers/:numberSid/configure', async (c) => {
  const config = await c.req.json();
  logger.info('Number configured', { numberSid: c.req.param('numberSid'), config });
  return c.json({ success: true, message: 'Phone number settings saved!' });
});

phoneSystem.delete('/disconnect', async (c) => {
  return c.json({ success: true });
});

phoneSystem.get('/status', async (c) => {
  // In demo mode, show as connected so the full UI is explorable
  return c.json({ connected: true, provider: 'byo-twilio', accountName: 'Demo Account', numberCount: 2 });
});

export { phoneSystem as phoneSystemRoutes };
