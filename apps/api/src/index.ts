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
import { dashboardRoutes } from './routes/dashboard.js';
import { phoneSystemRoutes } from './routes/phone-system.js';
import { twilioWebhookRoutes } from './routes/webhooks/twilio.js';
import { emailWebhookRoutes } from './routes/webhooks/email.js';
import { vapiWebhookRoutes } from './routes/webhooks/vapi.js';
import { stripeWebhookRoutes } from './routes/webhooks/stripe.js';
import { integrationRoutes } from './routes/integrations.js';
import { voiceTokenRoutes } from './routes/voice-token.js';
import { voiceSetupRoutes } from './routes/voice-setup.js';
import { voiceTwimlRoutes } from './routes/voice-twiml.js';
import { adminRoutes } from './routes/admin.js';
import { callsRoutes } from './routes/calls.js';
import { assistantRoutes } from './routes/assistant.js';
import { aiContentRoutes } from './routes/ai-content.js';
import { billingRoutes } from './routes/billing.js';
import { walletRoutes } from './routes/wallet.js';
import { formRoutes, publicFormRoutes } from './routes/forms.js';
import { activityRoutes } from './routes/activities.js';
import { teamRoutes } from './routes/team.js';
import { analyticsRoutes } from './routes/analytics.js';
import { invoiceRoutes } from './routes/invoices.js';
import { estimateRoutes } from './routes/estimates.js';
import { notificationRoutes } from './routes/notifications.js';
import { socialRoutes } from './routes/social.js';
import { startScheduler } from './scheduler.js';

const app = new Hono();

// ── Global Middleware ──

app.use('*', cors({
  origin: (origin) => {
    // Build allowed origins from config
    const allowed: string[] = [
      'http://localhost:3000',
      'http://localhost:3002',
      config.CORS_ORIGIN,
    ];

    // Add explicitly allowed origins from env (e.g., your Vercel deployment URL)
    if (config.ALLOWED_ORIGINS) {
      allowed.push(...config.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()).filter(Boolean));
    }

    if (origin && allowed.includes(origin)) {
      return origin;
    }

    // In dev mode only, allow all origins for local testing
    if (config.NODE_ENV === 'development') {
      return origin || '*';
    }

    return allowed[0] as string;
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', requestLogger);

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-XSS-Protection', '1; mode=block');
});

app.onError(errorHandler);

// ── Health Check ──

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    name: 'hararai-api',
    version: '0.1.0',
  });
});

app.get('/health', async (c) => {
  let dbStatus = 'unknown';
  try {
    const { db } = await import('@hararai/db');
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`SELECT 1 as ok`);
    dbStatus = Array.isArray(result) && result.length > 0 ? 'connected' : 'no-result';
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  return c.json({
    status: isHealthy ? 'ok' : 'down',
    timestamp: new Date().toISOString(),
  }, isHealthy ? 200 : 503);
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
app.route('/orgs/:orgId/dashboard', dashboardRoutes);
app.route('/orgs/:orgId/campaigns', campaignRoutes);
app.route('/orgs/:orgId/reviews', reviewRoutes);
app.route('/orgs/:orgId/sequences', sequenceRoutes);
app.route('/orgs/:orgId', aiRoutes);
app.route('/orgs/:orgId/phone-system', phoneSystemRoutes);
app.route('/orgs/:orgId/integrations', integrationRoutes);
app.route('/orgs/:orgId/voice', voiceTokenRoutes);
app.route('/orgs/:orgId/voice', voiceSetupRoutes);
app.route('/orgs/:orgId/calls', callsRoutes);
app.route('/orgs/:orgId/assistant', assistantRoutes);
app.route('/orgs/:orgId/ai', aiContentRoutes);
app.route('/orgs/:orgId/billing', billingRoutes);
app.route('/orgs/:orgId/wallet', walletRoutes);
app.route('/orgs/:orgId/forms', formRoutes);
app.route('/orgs/:orgId/activities', activityRoutes);
app.route('/orgs/:orgId/team', teamRoutes);
app.route('/orgs/:orgId/analytics', analyticsRoutes);
app.route('/orgs/:orgId/invoices', invoiceRoutes);
app.route('/orgs/:orgId/estimates', estimateRoutes);
app.route('/orgs/:orgId/notifications', notificationRoutes);
app.route('/orgs/:orgId/social', socialRoutes);

// Scheduling and forms have both authenticated and public routes
app.route('/', schedulingRoutes);
app.route('/', publicFormRoutes);

// Admin routes (no org prefix — platform-level)
app.route('/admin', adminRoutes);

// Webhooks (no auth — called by third-party services)
app.route('/voice', voiceTwimlRoutes);
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

logger.info(`Starting HararAI API server`, {
  port: String(port),
  environment: config.NODE_ENV,
  corsOrigin: config.CORS_ORIGIN,
});

serve({
  fetch: app.fetch,
  port,
});

logger.info(`HararAI API server running on http://localhost:${port}`);

// ── Start Background Job Scheduler ──

const stopScheduler = startScheduler();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  stopScheduler();
  process.exit(0);
});

export default app;
export type AppType = typeof app;
