import { Hono } from 'hono';
import { z } from 'zod';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const topupSchema = z.object({
  amount: z.number().min(5).max(1000),
});

const autoRechargeSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(5).optional(),
  amount: z.number().min(10).optional(),
});

const wallet = new Hono();

wallet.use('*', authMiddleware, orgScopeMiddleware);

// GET / — Get wallet balance + recent transactions
wallet.get('/', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { walletService } = await import('../services/wallet-service.js');

    const walletData = await walletService.getOrCreateWallet(orgId);
    const transactions = await walletService.getTransactions(orgId, { limit: 10 });

    return c.json({
      data: {
        balance: walletData.balance,
        currency: walletData.currency,
        autoRechargeEnabled: walletData.autoRechargeEnabled,
        autoRechargeThreshold: walletData.autoRechargeThreshold,
        autoRechargeAmount: walletData.autoRechargeAmount,
        transactions,
      },
    });
  } catch (err) {
    logger.error('Failed to get wallet', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 },
      503,
    );
  }
});

// POST /topup — Add credits via Stripe Checkout (payment mode)
wallet.post('/topup', async (c) => {
  const orgId = c.get('orgId');

  try {
    const body = topupSchema.parse(await c.req.json());
    const { StripeClient } = await import('@hararai/integrations');
    const { db, organizations, withOrgScope } = await import('@hararai/db');
    const { eq, sql } = await import('drizzle-orm');

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
      .where(withOrgScope(organizations.id, orgId));

    if (!org) {
      return c.json(
        { error: 'Organization not found', code: 'NOT_FOUND', status: 404 },
        404,
      );
    }

    const settings = (org.settings ?? {}) as Record<string, unknown>;
    let stripeCustomerId = typeof settings['stripeCustomerId'] === 'string'
      ? settings['stripeCustomerId']
      : null;

    // Create Stripe customer if one doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.createCustomer({
        email: (org as Record<string, unknown>).email as string || 'unknown@hararai.com',
        name: org.name || 'Unknown Business',
        metadata: { orgId },
      });
      stripeCustomerId = customer.id;

      const updatedSettings = { ...settings, stripeCustomerId };
      await db
        .update(organizations)
        .set({ settings: updatedSettings })
        .where(withOrgScope(organizations.id, orgId));
    }

    // Use Stripe SDK directly for payment-mode checkout (StripeClient only supports subscription mode)
    const stripeSDK = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    const session = await stripeSDK.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: body.amount * 100,
            product_data: {
              name: 'Wallet Top-up',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.CORS_ORIGIN}/dashboard/settings?tab=billing&topup=success`,
      cancel_url: `${config.CORS_ORIGIN}/dashboard/settings?tab=billing`,
      metadata: {
        orgId,
        type: 'wallet_topup',
      },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return c.json({
      data: {
        url: session.url,
        sessionId: session.id,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR', status: 400 },
        400,
      );
    }
    logger.error('Failed to create wallet top-up session', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Failed to create top-up session', code: 'BILLING_ERROR', status: 500 },
      500,
    );
  }
});

// POST /auto-recharge — Configure auto-recharge settings
wallet.post('/auto-recharge', async (c) => {
  const orgId = c.get('orgId');

  try {
    const body = autoRechargeSchema.parse(await c.req.json());
    const { walletService } = await import('../services/wallet-service.js');

    await walletService.updateAutoRecharge(orgId, {
      enabled: body.enabled,
      threshold: body.threshold,
      amount: body.amount,
    });

    return c.json({ data: { updated: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR', status: 400 },
        400,
      );
    }
    logger.error('Failed to update auto-recharge settings', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Failed to update auto-recharge settings', code: 'WALLET_ERROR', status: 500 },
      500,
    );
  }
});

// GET /transactions — Full paginated transaction history
wallet.get('/transactions', async (c) => {
  const orgId = c.get('orgId');

  try {
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 200);
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
    const validCategories = ['topup', 'ai_call', 'sms_outbound', 'sms_inbound', 'phone_number', 'refund', 'adjustment'] as const;
    const rawCategory = c.req.query('category');
    const category = rawCategory && validCategories.includes(rawCategory as typeof validCategories[number])
      ? rawCategory as typeof validCategories[number]
      : undefined;

    const { walletService } = await import('../services/wallet-service.js');

    const { transactions, total } = await walletService.getTransactions(orgId, {
      limit,
      offset,
      category,
    });

    return c.json({
      data: {
        transactions,
        total,
      },
    });
  } catch (err) {
    logger.error('Failed to get wallet transactions', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 },
      503,
    );
  }
});

// GET /rates — Get current usage rates for this org
wallet.get('/rates', async (c) => {
  const orgId = c.get('orgId');

  try {
    const { db } = await import('@hararai/db');
    const { sql } = await import('drizzle-orm');

    // Query usage_rates table: org-specific rates first, then platform defaults (orgId IS NULL)
    const rates = await db.execute(sql`
      SELECT DISTINCT ON (category, action)
        id, org_id, category, action, unit, cost_per_unit, description, created_at, updated_at
      FROM usage_rates
      WHERE org_id = ${orgId} OR org_id IS NULL
      ORDER BY category, action, org_id NULLS LAST
    `);

    return c.json({
      data: {
        rates: Array.isArray(rates) ? rates : [],
      },
    });
  } catch (err) {
    logger.error('Failed to get usage rates', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 },
      503,
    );
  }
});

export { wallet as walletRoutes };
