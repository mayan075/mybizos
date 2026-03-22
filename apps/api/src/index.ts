import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger, logger } from './middleware/logger.js';
import { authRoutes } from './routes/auth.js';
import { orgRoutes } from './routes/organizations.js';
import { contactRoutes } from './routes/contacts.js';
import { pipelineRoutes } from './routes/pipelines.js';
import { dealRoutes } from './routes/deals.js';
import { conversationRoutes } from './routes/conversations.js';
import { schedulingRoutes } from './routes/scheduling.js';
import { aiRoutes } from './routes/ai.js';
import { campaignRoutes } from './routes/campaigns.js';
import { reviewRoutes } from './routes/reviews.js';
import { sequenceRoutes } from './routes/sequences.js';
import { twilioWebhookRoutes } from './routes/webhooks/twilio.js';
import { emailWebhookRoutes } from './routes/webhooks/email.js';
import { vapiWebhookRoutes } from './routes/webhooks/vapi.js';
import { stripeWebhookRoutes } from './routes/webhooks/stripe.js';

const app = new Hono();

// ── Global Middleware ──

app.use('*', cors({
  origin: config.CORS_ORIGIN,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', requestLogger);

app.onError(errorHandler);

// ── Health Check ──

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: config.NODE_ENV,
  });
});

// ── API Routes ──

// Auth (no org prefix)
app.route('/auth', authRoutes);

// Organization-scoped routes
app.route('/orgs', orgRoutes);
app.route('/orgs/:orgId/contacts', contactRoutes);
app.route('/orgs/:orgId/pipelines', pipelineRoutes);
app.route('/orgs/:orgId/deals', dealRoutes);
app.route('/orgs/:orgId/conversations', conversationRoutes);
app.route('/orgs/:orgId/campaigns', campaignRoutes);
app.route('/orgs/:orgId/reviews', reviewRoutes);
app.route('/orgs/:orgId/sequences', sequenceRoutes);
app.route('/orgs/:orgId', aiRoutes);

// Scheduling has both authenticated and public routes
app.route('/', schedulingRoutes);

// Webhooks (no auth — called by third-party services)
app.route('/webhooks/twilio', twilioWebhookRoutes);
app.route('/webhooks/email', emailWebhookRoutes);
app.route('/webhooks/vapi', vapiWebhookRoutes);
app.route('/webhooks/stripe', stripeWebhookRoutes);

// ── 404 Catch-all ──

app.notFound((c) => {
  return c.json(
    { error: 'Not found', code: 'NOT_FOUND', status: 404 },
    404,
  );
});

// ── Start Server ──

const port = config.PORT;

logger.info(`Starting MyBizOS API server`, {
  port: String(port),
  environment: config.NODE_ENV,
  corsOrigin: config.CORS_ORIGIN,
});

serve({
  fetch: app.fetch,
  port,
});

logger.info(`MyBizOS API server running on http://localhost:${port}`);

export default app;
export type AppType = typeof app;
