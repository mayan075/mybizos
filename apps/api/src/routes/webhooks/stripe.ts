import { Hono } from 'hono';
import { logger } from '../../middleware/logger.js';
import { config } from '../../config.js';

const stripeWebhooks = new Hono();

/**
 * Stripe webhook handler — processes subscription lifecycle events.
 * CRITICAL: Must read raw body BEFORE JSON parsing for signature verification.
 */
stripeWebhooks.post('/', async (c) => {
  try {
    const { StripeClient } = await import('@hararai/integrations');
    const { db, organizations } = await import('@hararai/db');
    const { eq, sql } = await import('drizzle-orm');

    if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) {
      logger.info('Stripe webhook received but Stripe not configured');
      return c.json({ received: true });
    }

    const stripe = new StripeClient({ secretKey: config.STRIPE_SECRET_KEY });

    // Must get raw body for signature verification
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      logger.warn('Stripe webhook missing signature header');
      return c.json({ error: 'Missing signature', code: 'INVALID_SIGNATURE', status: 400 }, 400);
    }

    let event;
    try {
      event = stripe.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return c.json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE', status: 400 }, 400);
    }

    logger.info('Stripe webhook event received', { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { metadata?: Record<string, string>; customer?: string; subscription?: string; amount_total?: number; payment_intent?: string };
        const orgId = session.metadata?.orgId;

        if (!orgId) {
          logger.warn('checkout.session.completed missing orgId in metadata');
          break;
        }

        // Handle wallet top-up payments
        if (session.metadata?.type === 'wallet_topup') {
          try {
            const { walletService } = await import('../../services/wallet-service.js');
            const { walletTransactions } = await import('@hararai/db');

            // Idempotency check: skip if this payment intent was already credited
            const paymentIntentId = session.payment_intent as string;
            if (paymentIntentId) {
              const [existing] = await db
                .select({ id: walletTransactions.id })
                .from(walletTransactions)
                .where(eq(walletTransactions.stripePaymentIntentId, paymentIntentId));
              if (existing) {
                logger.info('Wallet top-up already credited (idempotency check)', { orgId, paymentIntentId });
                break;
              }
            }

            const amountDollars = (session.amount_total ?? 0) / 100;

            await walletService.credit(orgId, {
              amount: amountDollars,
              category: 'topup',
              description: 'Stripe wallet top-up',
              stripePaymentIntentId: session.payment_intent as string,
            });

            logger.info('Wallet top-up credited', { orgId, amount: amountDollars });
          } catch (topupErr) {
            logger.error('Failed to credit wallet top-up', {
              orgId,
              error: topupErr instanceof Error ? topupErr.message : String(topupErr),
            });
          }
          break;
        }

        // Handle subscription checkout
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId));

        if (!org) {
          logger.warn('checkout.session.completed org not found', { orgId });
          break;
        }

        // Determine plan from checkout metadata (preferred) or fallback to amount
        const plan = session.metadata?.plan
          || ((session.amount_total ?? 0) <= 5000 ? 'starter' : 'pro');

        const settings = (org.settings ?? {}) as Record<string, unknown>;
        const updatedSettings = {
          ...settings,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          plan,
          subscriptionStatus: 'active',
        };

        await db
          .update(organizations)
          .set({ settings: updatedSettings })
          .where(eq(organizations.id, orgId));

        logger.info('Organization upgraded via checkout', { orgId, subscriptionId: session.subscription });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as { id: string; status: string; cancel_at_period_end: boolean; metadata?: Record<string, string> };
        const orgId = subscription.metadata?.orgId;

        // Find the org — by metadata orgId or by subscription ID in settings JSON
        const [targetOrg] = orgId
          ? await db.select().from(organizations).where(eq(organizations.id, orgId))
          : await db.select().from(organizations).where(
              sql`${organizations.settings}->>'stripeSubscriptionId' = ${subscription.id}`,
            );

        if (targetOrg) {
          const settings = (targetOrg.settings ?? {}) as Record<string, unknown>;

          // Determine plan from the subscription's items
          const sub = event.data.object as { id: string; status: string; cancel_at_period_end: boolean; metadata?: Record<string, string>; items?: { data: Array<{ price?: { unit_amount?: number; product?: string } }> } };
          let plan = settings.plan as string | undefined;
          const firstItem = sub.items?.data?.[0];
          if (firstItem?.price?.unit_amount !== undefined) {
            const amountCents = firstItem.price.unit_amount;
            plan = amountCents <= 5000 ? 'starter' : 'pro';
          }

          const updatedSettings = {
            ...settings,
            subscriptionStatus: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            ...(plan ? { plan } : {}),
          };
          await db
            .update(organizations)
            .set({ settings: updatedSettings })
            .where(eq(organizations.id, targetOrg.id));
          logger.info('Subscription updated', { orgId: targetOrg.id, status: subscription.status });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { id: string; metadata?: Record<string, string> };

        // Find org by subscription ID using indexed JSON query
        const [matchingOrg] = await db.select().from(organizations).where(
          sql`${organizations.settings}->>'stripeSubscriptionId' = ${subscription.id}`,
        );

        if (matchingOrg) {
          const settings = (matchingOrg.settings ?? {}) as Record<string, unknown>;
          const updatedSettings = {
            ...settings,
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          };
          await db
            .update(organizations)
            .set({ settings: updatedSettings })
            .where(eq(organizations.id, matchingOrg.id));
          logger.info('Subscription canceled, org downgraded to free', { orgId: matchingOrg.id });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { customer: string; amount_due: number };
        logger.error('Invoice payment failed', {
          customer: invoice.customer,
          amount: invoice.amount_due,
        });
        // TODO(next-session): Send alert email to org owner via notificationService
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as { customer: string; amount_paid: number };
        logger.info('Invoice paid', {
          customer: invoice.customer,
          amount: invoice.amount_paid,
        });
        break;
      }

      default:
        logger.info('Unhandled Stripe event', { type: event.type });
    }

    return c.json({ received: true });
  } catch (err) {
    logger.error('Stripe webhook handler error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 to Stripe to prevent retries on our errors
    return c.json({ received: true });
  }
});

export { stripeWebhooks as stripeWebhookRoutes };
