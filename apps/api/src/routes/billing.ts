import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const billing = new Hono();

billing.use('*', authMiddleware, orgScopeMiddleware);

// GET /orgs/:orgId/billing — current subscription + usage
billing.get('/', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { StripeClient } = await import('@mybizos/integrations');
    const { db, organizations, withOrgScope } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');

    if (!config.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured');
    }

    const stripe = new StripeClient({ secretKey: config.STRIPE_SECRET_KEY });

    // Get org record
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return c.json(
        { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
        404,
      );
    }

    // The organizations table may store Stripe IDs in the settings JSONB column
    // since there are no dedicated stripeCustomerId/stripeSubscriptionId columns.
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const stripeCustomerId = typeof settings['stripeCustomerId'] === 'string'
      ? settings['stripeCustomerId']
      : null;
    const stripeSubscriptionId = typeof settings['stripeSubscriptionId'] === 'string'
      ? settings['stripeSubscriptionId']
      : null;

    if (!stripeCustomerId) {
      // No Stripe customer yet — return free tier defaults
      return c.json({
        data: {
          plan: 'free',
          status: 'active',
          subscription: null,
          usage: { aiMinutes: 0, aiMinutesLimit: 100, smsSent: 0, smsLimit: 50 },
          invoices: [],
        },
      });
    }

    // Get subscription
    let subscription = null;
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.getSubscription(stripeSubscriptionId);
      } catch {
        logger.warn('Failed to fetch subscription', {
          orgId,
          subscriptionId: stripeSubscriptionId,
        });
      }
    }

    // Get recent invoices
    const invoices = await stripe.listInvoices(stripeCustomerId, 5);

    // Get usage from DB
    const { count, and, gte } = await import('drizzle-orm');
    const { aiCallLogs, messages } = await import('@mybizos/db');
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    let aiMinutes = 0;
    let smsSent = 0;
    try {
      const [aiResult] = await db
        .select({ value: count() })
        .from(aiCallLogs)
        .where(and(withOrgScope(aiCallLogs.orgId, orgId), gte(aiCallLogs.createdAt, monthStart)));
      aiMinutes = (aiResult?.value ?? 0) * 3; // ~3 min avg per call
    } catch {
      /* table may not exist yet */
    }

    try {
      const [smsResult] = await db
        .select({ value: count() })
        .from(messages)
        .where(
          and(
            withOrgScope(messages.orgId, orgId),
            gte(messages.createdAt, monthStart),
            eq(messages.channel, 'sms'),
          ),
        );
      smsSent = smsResult?.value ?? 0;
    } catch {
      /* table may not exist yet */
    }

    const planName = subscription?.status === 'active' ? 'pro' : 'free';
    const limits =
      planName === 'pro'
        ? { aiMinutesLimit: 2000, smsLimit: 5000 }
        : { aiMinutesLimit: 100, smsLimit: 50 };

    return c.json({
      data: {
        plan: planName,
        status: subscription?.status ?? 'inactive',
        subscription,
        usage: { aiMinutes, ...limits, smsSent },
        invoices: invoices.map((inv) => ({
          id: inv.id,
          date: inv.dueDate
            ? new Date(inv.dueDate * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A',
          amount: `$${(inv.amountDue / 100).toFixed(2)}`,
          status: inv.status === 'paid' ? 'Paid' : inv.status,
          hostedUrl: inv.hostedInvoiceUrl,
          pdfUrl: inv.invoicePdf,
        })),
      },
    });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

// POST /orgs/:orgId/billing/portal — create Stripe billing portal session
billing.post('/portal', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { StripeClient } = await import('@mybizos/integrations');
    const { db, organizations } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');

    if (!config.STRIPE_SECRET_KEY) {
      return c.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED', status: 503 },
        503,
      );
    }

    const stripe = new StripeClient({ secretKey: config.STRIPE_SECRET_KEY });

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return c.json(
        { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
        404,
      );
    }

    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const stripeCustomerId = typeof settings['stripeCustomerId'] === 'string'
      ? settings['stripeCustomerId']
      : null;

    if (!stripeCustomerId) {
      return c.json(
        { error: 'No billing account found', code: 'NO_BILLING_ACCOUNT', status: 404 },
        404,
      );
    }

    const returnUrl = `${config.CORS_ORIGIN}/dashboard/settings?tab=billing`;
    const portal = await stripe.createBillingPortalSession(stripeCustomerId, returnUrl);

    return c.json({ data: { url: portal.url } });
  } catch (err) {
    logger.error('Failed to create billing portal session', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Failed to create billing portal', code: 'BILLING_ERROR', status: 500 },
      500,
    );
  }
});

export { billing as billingRoutes };
