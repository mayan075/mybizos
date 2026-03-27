import Stripe from "stripe";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StripeConfig {
  secretKey: string;
}

export interface CreateConnectAccountOptions {
  email: string;
  businessName: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectAccountResult {
  accountId: string;
  email: string;
  type: string;
}

export interface CreateAccountLinkResult {
  url: string;
  expiresAt: number;
}

export interface ConnectAccountStatus {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  email: string;
  businessProfile: {
    name: string | null;
  };
}

export interface CreateCustomerOptions {
  email: string;
  name: string;
  metadata?: Record<string, string>;
  phone?: string;
}

export interface CustomerResult {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
}

export interface InvoiceLineItem {
  description: string;
  amount: number; // in cents
  quantity: number;
}

export interface CreateInvoiceOptions {
  customerId: string;
  lineItems: InvoiceLineItem[];
  dueDate?: Date;
  metadata?: Record<string, string>;
  stripeAccountId?: string;
}

export interface InvoiceResult {
  id: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  dueDate: number | null;
  customerEmail: string | null;
}

export interface CreatePaymentLinkOptions {
  amount: number; // in cents
  currency?: string;
  description: string;
  stripeAccountId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentLinkResult {
  id: string;
  url: string;
  active: boolean;
}

export interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface SubscriptionResult {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  productId: string;
}

export interface BillingPortalResult {
  url: string;
}

export interface CreateCheckoutSessionOptions {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Stripe client wrapper for payment processing with Stripe Connect.
 * Supports multi-tenant payment handling where each business (org) has
 * their own Stripe Connect Express account.
 */
export class StripeClient {
  private stripe: Stripe;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }

  // ─── Stripe Connect ────────────────────────────────────────────────────

  /**
   * Create a Stripe Connect Express account for a business.
   * Each org in MyBizOS gets their own Connect account.
   */
  async createConnectAccount(
    options: CreateConnectAccountOptions,
  ): Promise<CreateConnectAccountResult> {
    const account = await this.stripe.accounts.create({
      type: "express",
      email: options.email,
      business_profile: {
        name: options.businessName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: options.metadata,
    });

    return {
      accountId: account.id,
      email: account.email ?? options.email,
      type: account.type ?? "express",
    };
  }

  /**
   * Create an account link for Connect onboarding.
   * Redirect the business owner to this URL to complete Stripe setup.
   */
  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<CreateAccountLinkResult> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });

    return {
      url: link.url,
      expiresAt: link.expires_at,
    };
  }

  /**
   * Get the status of a Stripe Connect account.
   * Check chargesEnabled and payoutsEnabled to know if the account is fully set up.
   */
  async getAccount(accountId: string): Promise<ConnectAccountStatus> {
    const account = await this.stripe.accounts.retrieve(accountId);

    return {
      id: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      email: account.email ?? "",
      businessProfile: {
        name: account.business_profile?.name ?? null,
      },
    };
  }

  // ─── Customers ─────────────────────────────────────────────────────────

  /**
   * Create a Stripe customer for a contact.
   */
  async createCustomer(options: CreateCustomerOptions): Promise<CustomerResult> {
    const customer = await this.stripe.customers.create({
      email: options.email,
      name: options.name,
      phone: options.phone,
      metadata: options.metadata,
    });

    return {
      id: customer.id,
      email: customer.email ?? options.email,
      name: customer.name ?? options.name,
      metadata: (customer.metadata as Record<string, string>) ?? {},
    };
  }

  /**
   * Retrieve a customer by ID.
   */
  async getCustomer(
    customerId: string,
  ): Promise<CustomerResult> {
    const customer = await this.stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error(`Customer ${customerId} has been deleted`);
    }

    return {
      id: customer.id,
      email: customer.email ?? "",
      name: customer.name ?? "",
      metadata: (customer.metadata as Record<string, string>) ?? {},
    };
  }

  // ─── Invoices ──────────────────────────────────────────────────────────

  /**
   * Create a draft invoice with line items.
   * Optionally create on behalf of a connected account.
   */
  async createInvoice(options: CreateInvoiceOptions): Promise<InvoiceResult> {
    const stripeOptions: Stripe.RequestOptions = options.stripeAccountId
      ? { stripeAccount: options.stripeAccountId }
      : {};

    // Create the invoice
    const invoice = await this.stripe.invoices.create(
      {
        customer: options.customerId,
        collection_method: "send_invoice",
        due_date: options.dueDate
          ? Math.floor(options.dueDate.getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days default
        metadata: options.metadata,
        auto_advance: false,
      },
      stripeOptions,
    );

    // Add line items to the invoice
    for (const item of options.lineItems) {
      await this.stripe.invoiceItems.create(
        {
          customer: options.customerId,
          invoice: invoice.id,
          description: item.description,
          unit_amount: item.amount,
          quantity: item.quantity,
          currency: "usd",
        },
        stripeOptions,
      );
    }

    // Retrieve the updated invoice with line items totaled
    const updatedInvoice = await this.stripe.invoices.retrieve(
      invoice.id,
      stripeOptions,
    );

    return this.formatInvoice(updatedInvoice);
  }

  /**
   * Finalize a draft invoice and send it to the customer.
   */
  async finalizeInvoice(
    invoiceId: string,
    stripeAccountId?: string,
  ): Promise<InvoiceResult> {
    const stripeOptions: Stripe.RequestOptions = stripeAccountId
      ? { stripeAccount: stripeAccountId }
      : {};

    const invoice = await this.stripe.invoices.finalizeInvoice(
      invoiceId,
      {},
      stripeOptions,
    );

    // Send the invoice
    const sentInvoice = await this.stripe.invoices.sendInvoice(
      invoiceId,
      stripeOptions,
    );

    return this.formatInvoice(sentInvoice);
  }

  /**
   * Void an open invoice. Cannot be undone.
   */
  async voidInvoice(
    invoiceId: string,
    stripeAccountId?: string,
  ): Promise<InvoiceResult> {
    const stripeOptions: Stripe.RequestOptions = stripeAccountId
      ? { stripeAccount: stripeAccountId }
      : {};

    const invoice = await this.stripe.invoices.voidInvoice(
      invoiceId,
      stripeOptions,
    );

    return this.formatInvoice(invoice);
  }

  // ─── Payment Links ────────────────────────────────────────────────────

  /**
   * Create a reusable payment link for a fixed amount.
   * Useful for quick payment collection without a full invoice.
   */
  async createPaymentLink(
    options: CreatePaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    const stripeOptions: Stripe.RequestOptions = options.stripeAccountId
      ? { stripeAccount: options.stripeAccountId }
      : {};

    // Create a one-time price for the payment link
    const price = await this.stripe.prices.create(
      {
        unit_amount: options.amount,
        currency: options.currency ?? "usd",
        product_data: {
          name: options.description,
        },
      },
      stripeOptions,
    );

    const paymentLink = await this.stripe.paymentLinks.create(
      {
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: options.metadata,
      },
      stripeOptions,
    );

    return {
      id: paymentLink.id,
      url: paymentLink.url,
      active: paymentLink.active,
    };
  }

  // ─── Subscriptions ────────────────────────────────────────────────────

  /**
   * Create a subscription for a customer.
   */
  async createSubscription(
    options: CreateSubscriptionOptions,
  ): Promise<SubscriptionResult> {
    const sub = await this.stripe.subscriptions.create({
      customer: options.customerId,
      items: [{ price: options.priceId }],
      trial_period_days: options.trialDays,
      metadata: options.metadata,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
    return this.formatSubscription(sub);
  }

  /**
   * Retrieve a subscription by ID.
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    return this.formatSubscription(sub);
  }

  /**
   * Cancel a subscription, either immediately or at end of billing period.
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately = false,
  ): Promise<SubscriptionResult> {
    if (immediately) {
      const sub = await this.stripe.subscriptions.cancel(subscriptionId);
      return this.formatSubscription(sub);
    }
    const sub = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return this.formatSubscription(sub);
  }

  /**
   * Create a Stripe Checkout session for subscription purchases.
   * Redirects the customer to Stripe-hosted checkout page.
   */
  async createCheckoutSession(
    options: CreateCheckoutSessionOptions,
  ): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer: options.customerId,
      mode: "subscription",
      line_items: [{ price: options.priceId, quantity: 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      allow_promotion_codes: true,
      ...(options.trialDays
        ? {
            subscription_data: {
              trial_period_days: options.trialDays,
              metadata: options.metadata,
            },
          }
        : { subscription_data: { metadata: options.metadata } }),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create a Stripe Billing Portal session for self-service management.
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<BillingPortalResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  /**
   * List invoices for a customer.
   */
  async listInvoices(
    customerId: string,
    limit = 10,
  ): Promise<InvoiceResult[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data.map((inv) => this.formatInvoice(inv));
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────

  /**
   * Verify a Stripe webhook signature and construct the event.
   * Call this in your webhook handler to ensure the payload is authentic.
   */
  constructEvent(
    body: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(body, signature, secret);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private formatInvoice(invoice: Stripe.Invoice): InvoiceResult {
    return {
      id: invoice.id,
      status: invoice.status ?? "draft",
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      dueDate: invoice.due_date,
      customerEmail: invoice.customer_email ?? null,
    };
  }

  private formatSubscription(sub: Stripe.Subscription): SubscriptionResult {
    const item = sub.items.data[0];
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceId: item?.price?.id ?? "",
      productId:
        typeof item?.price?.product === "string"
          ? item.price.product
          : item?.price?.product?.id ?? "",
    };
  }
}
