import Stripe from "stripe";
// ─── Client ──────────────────────────────────────────────────────────────────
/**
 * Stripe client wrapper for payment processing with Stripe Connect.
 * Supports multi-tenant payment handling where each business (org) has
 * their own Stripe Connect Express account.
 */
export class StripeClient {
    stripe;
    constructor(config) {
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
    async createConnectAccount(options) {
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
    async createAccountLink(accountId, returnUrl, refreshUrl) {
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
    async getAccount(accountId) {
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
    async createCustomer(options) {
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
            metadata: customer.metadata ?? {},
        };
    }
    /**
     * Retrieve a customer by ID.
     */
    async getCustomer(customerId) {
        const customer = await this.stripe.customers.retrieve(customerId);
        if (customer.deleted) {
            throw new Error(`Customer ${customerId} has been deleted`);
        }
        return {
            id: customer.id,
            email: customer.email ?? "",
            name: customer.name ?? "",
            metadata: customer.metadata ?? {},
        };
    }
    // ─── Invoices ──────────────────────────────────────────────────────────
    /**
     * Create a draft invoice with line items.
     * Optionally create on behalf of a connected account.
     */
    async createInvoice(options) {
        const stripeOptions = options.stripeAccountId
            ? { stripeAccount: options.stripeAccountId }
            : {};
        // Create the invoice
        const invoice = await this.stripe.invoices.create({
            customer: options.customerId,
            collection_method: "send_invoice",
            due_date: options.dueDate
                ? Math.floor(options.dueDate.getTime() / 1000)
                : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days default
            metadata: options.metadata,
            auto_advance: false,
        }, stripeOptions);
        // Add line items to the invoice
        for (const item of options.lineItems) {
            await this.stripe.invoiceItems.create({
                customer: options.customerId,
                invoice: invoice.id,
                description: item.description,
                unit_amount: item.amount,
                quantity: item.quantity,
                currency: "usd",
            }, stripeOptions);
        }
        // Retrieve the updated invoice with line items totaled
        const updatedInvoice = await this.stripe.invoices.retrieve(invoice.id, stripeOptions);
        return this.formatInvoice(updatedInvoice);
    }
    /**
     * Finalize a draft invoice and send it to the customer.
     */
    async finalizeInvoice(invoiceId, stripeAccountId) {
        const stripeOptions = stripeAccountId
            ? { stripeAccount: stripeAccountId }
            : {};
        const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId, {}, stripeOptions);
        // Send the invoice
        const sentInvoice = await this.stripe.invoices.sendInvoice(invoiceId, stripeOptions);
        return this.formatInvoice(sentInvoice);
    }
    /**
     * Void an open invoice. Cannot be undone.
     */
    async voidInvoice(invoiceId, stripeAccountId) {
        const stripeOptions = stripeAccountId
            ? { stripeAccount: stripeAccountId }
            : {};
        const invoice = await this.stripe.invoices.voidInvoice(invoiceId, stripeOptions);
        return this.formatInvoice(invoice);
    }
    // ─── Payment Links ────────────────────────────────────────────────────
    /**
     * Create a reusable payment link for a fixed amount.
     * Useful for quick payment collection without a full invoice.
     */
    async createPaymentLink(options) {
        const stripeOptions = options.stripeAccountId
            ? { stripeAccount: options.stripeAccountId }
            : {};
        // Create a one-time price for the payment link
        const price = await this.stripe.prices.create({
            unit_amount: options.amount,
            currency: options.currency ?? "usd",
            product_data: {
                name: options.description,
            },
        }, stripeOptions);
        const paymentLink = await this.stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: options.metadata,
        }, stripeOptions);
        return {
            id: paymentLink.id,
            url: paymentLink.url,
            active: paymentLink.active,
        };
    }
    // ─── Webhooks ──────────────────────────────────────────────────────────
    /**
     * Verify a Stripe webhook signature and construct the event.
     * Call this in your webhook handler to ensure the payload is authentic.
     */
    constructEvent(body, signature, secret) {
        return this.stripe.webhooks.constructEvent(body, signature, secret);
    }
    // ─── Private Helpers ─────────────────────────────────────────────────────
    formatInvoice(invoice) {
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
}
//# sourceMappingURL=index.js.map