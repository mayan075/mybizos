import Stripe from "stripe";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface CreateCustomerOptions {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentLinkOptions {
  amount: number; // in cents
  currency?: string;
  description: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe client wrapper for payment processing.
 * Uses Stripe Connect for multi-tenant payment handling.
 */
export class StripeClient {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey);
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Create a Stripe customer for a contact.
   */
  async createCustomer(options: CreateCustomerOptions): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email: options.email,
      name: options.name,
      phone: options.phone,
      metadata: options.metadata,
    });
  }

  /**
   * Create a payment link for invoicing.
   */
  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<string> {
    const price = await this.stripe.prices.create({
      unit_amount: options.amount,
      currency: options.currency ?? "usd",
      product_data: {
        name: options.description,
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: options.customerEmail,
      metadata: options.metadata,
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
    });

    return session.url ?? "";
  }

  /**
   * Verify and construct a Stripe webhook event.
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  /**
   * Retrieve a customer by ID.
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(customerId);
  }

  /**
   * List payments for a customer.
   */
  async listPayments(customerId: string, limit = 10): Promise<Stripe.PaymentIntent[]> {
    const result = await this.stripe.paymentIntents.list({
      customer: customerId,
      limit,
    });
    return result.data;
  }
}
