import { Hono } from 'hono';
import type Stripe from 'stripe';
import {
  db,
  organizations,
  activities,
  withOrgScope,
} from '@mybizos/db';
import { eq, sql } from 'drizzle-orm';
import { StripeClient } from '@mybizos/integrations';
import { TwilioClient } from '@mybizos/integrations';
import { config } from '../../config.js';
import { logger } from '../../middleware/logger.js';
import { activityService } from '../../services/activity-service.js';

const stripeWebhooks = new Hono();

// ── Shared Clients ──

function getStripeClient(): StripeClient {
  return new StripeClient({ secretKey: config.STRIPE_SECRET_KEY });
}

function getTwilioClient(): TwilioClient {
  return new TwilioClient({
    accountSid: config.TWILIO_ACCOUNT_SID,
    authToken: config.TWILIO_AUTH_TOKEN,
    defaultFromNumber: config.TWILIO_PHONE_NUMBER,
  });
}

// ── Helpers ──

/** Find the org that owns a given Stripe Connect account. */
async function findOrgByStripeAccountId(stripeAccountId: string) {
  // The org stores its Stripe account ID in the settings JSONB field
  const [org] = await db
    .select()
    .from(organizations)
    .where(sql`${organizations.settings}->>'stripeAccountId' = ${stripeAccountId}`);

  return org ?? null;
}

/** Find the org that owns a given Stripe customer via their settings. */
async function findOrgByStripeMetadata(metadata: Stripe.Metadata | null) {
  if (!metadata) return null;
  const orgId = metadata['orgId'];
  if (!orgId) return null;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  return org ?? null;
}

/** Get the org owner's phone for alerts. */
async function getOwnerPhone(orgId: string): Promise<string | null> {
  const [org] = await db
    .select({ phone: organizations.phone })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return org?.phone ?? null;
}

// ── Route ──

/**
 * POST /webhooks/stripe -- Stripe webhook handler
 *
 * Verifies Stripe webhook signature, then handles:
 * - invoice.paid -> update invoice status, log payment, create activity
 * - invoice.payment_failed -> alert owner, trigger reminder
 * - checkout.session.completed -> mark payment link used
 * - account.updated -> update org Stripe connection status
 */
stripeWebhooks.post('/', async (c) => {
  const stripe = getStripeClient();

  // Read raw body as text for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header('Stripe-Signature') ?? '';

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Invalid Stripe webhook signature', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'Invalid signature' }, 400);
  }

  logger.info('Stripe webhook received', {
    type: event.type,
    id: event.id,
  });

  switch (event.type) {
    case 'invoice.paid': {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    }
    case 'invoice.payment_failed': {
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    }
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    }
    case 'account.updated': {
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    }
    default: {
      logger.info('Unhandled Stripe event type', { type: event.type });
    }
  }

  return c.json({ received: true });
});

// ── Event Handlers ──

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  logger.info('Invoice paid', {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    customerEmail: invoice.customer_email,
  });

  const org = await findOrgByStripeMetadata(invoice.metadata);
  if (!org) {
    logger.warn('No org found for paid invoice', { invoiceId: invoice.id });
    return;
  }

  // Find the contact by the customer email
  const contactId = invoice.metadata?.['contactId'] ?? null;

  // Log payment activity
  await activityService.logActivity(org.id, {
    contactId,
    type: 'payment_received',
    title: `Payment received: $${(invoice.amount_paid / 100).toFixed(2)}`,
    description: `Invoice ${invoice.number ?? invoice.id} paid by ${invoice.customer_email ?? 'unknown'}`,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      customerEmail: invoice.customer_email,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    },
  });

  logger.info('Payment activity logged', { orgId: org.id, invoiceId: invoice.id });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.warn('Invoice payment failed', {
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
    customerEmail: invoice.customer_email,
    attemptCount: invoice.attempt_count,
  });

  const org = await findOrgByStripeMetadata(invoice.metadata);
  if (!org) {
    logger.warn('No org found for failed invoice', { invoiceId: invoice.id });
    return;
  }

  const contactId = invoice.metadata?.['contactId'] ?? null;

  // Log failed payment activity
  await activityService.logActivity(org.id, {
    contactId,
    type: 'payment_received',
    title: `Payment failed: $${(invoice.amount_due / 100).toFixed(2)}`,
    description: `Invoice ${invoice.number ?? invoice.id} payment failed (attempt ${invoice.attempt_count}). Customer: ${invoice.customer_email ?? 'unknown'}`,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amountDue: invoice.amount_due,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt,
    },
  });

  // Alert owner via SMS
  try {
    const ownerPhone = await getOwnerPhone(org.id);
    if (ownerPhone) {
      const twilio = getTwilioClient();
      await twilio.sendSms(
        ownerPhone,
        `Payment failed for invoice $${(invoice.amount_due / 100).toFixed(2)} from ${invoice.customer_email ?? 'unknown customer'}. Attempt #${invoice.attempt_count}. Check your Stripe dashboard.`,
      );
      logger.info('Owner alerted about failed payment', { orgId: org.id });
    }
  } catch (err) {
    logger.error('Failed to send payment failure alert', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  logger.info('Checkout session completed', {
    sessionId: session.id,
    amountTotal: session.amount_total,
    customerEmail: session.customer_email,
    paymentStatus: session.payment_status,
  });

  const org = await findOrgByStripeMetadata(session.metadata);
  if (!org) {
    logger.warn('No org found for checkout session', { sessionId: session.id });
    return;
  }

  const contactId = session.metadata?.['contactId'] ?? null;

  // Log checkout completion activity
  await activityService.logActivity(org.id, {
    contactId,
    type: 'payment_received',
    title: `Payment received via payment link: $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
    description: `Checkout completed by ${session.customer_email ?? 'unknown'}. Payment status: ${session.payment_status}`,
    metadata: {
      sessionId: session.id,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_email,
      paymentLinkId: session.payment_link,
      paymentStatus: session.payment_status,
    },
  });

  logger.info('Checkout activity logged', { orgId: org.id, sessionId: session.id });
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  logger.info('Stripe Connect account updated', {
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });

  const org = await findOrgByStripeAccountId(account.id);
  if (!org) {
    logger.warn('No org found for Stripe account', { accountId: account.id });
    return;
  }

  // Update org settings with latest Stripe status
  const currentSettings = (org.settings ?? {}) as Record<string, unknown>;
  const updatedSettings = {
    ...currentSettings,
    stripeAccountId: account.id,
    stripeChargesEnabled: account.charges_enabled,
    stripePayoutsEnabled: account.payouts_enabled,
    stripeDetailsSubmitted: account.details_submitted,
    stripeLastUpdated: new Date().toISOString(),
  };

  await db
    .update(organizations)
    .set({
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id));

  logger.info('Org Stripe connection status updated', {
    orgId: org.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });

  // Notify owner if account just became fully active
  if (account.charges_enabled && account.payouts_enabled && !currentSettings['stripeChargesEnabled']) {
    try {
      const ownerPhone = await getOwnerPhone(org.id);
      if (ownerPhone) {
        const twilio = getTwilioClient();
        await twilio.sendSms(
          ownerPhone,
          `Great news! Your Stripe account for ${org.name} is now fully set up. You can start accepting payments!`,
        );
      }
    } catch (err) {
      logger.error('Failed to send Stripe activation notification', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export { stripeWebhooks as stripeWebhookRoutes };
