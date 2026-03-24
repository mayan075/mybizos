import Stripe from "stripe";
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
    amount: number;
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
    amount: number;
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
/**
 * Stripe client wrapper for payment processing with Stripe Connect.
 * Supports multi-tenant payment handling where each business (org) has
 * their own Stripe Connect Express account.
 */
export declare class StripeClient {
    private stripe;
    constructor(config: StripeConfig);
    /**
     * Create a Stripe Connect Express account for a business.
     * Each org in MyBizOS gets their own Connect account.
     */
    createConnectAccount(options: CreateConnectAccountOptions): Promise<CreateConnectAccountResult>;
    /**
     * Create an account link for Connect onboarding.
     * Redirect the business owner to this URL to complete Stripe setup.
     */
    createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<CreateAccountLinkResult>;
    /**
     * Get the status of a Stripe Connect account.
     * Check chargesEnabled and payoutsEnabled to know if the account is fully set up.
     */
    getAccount(accountId: string): Promise<ConnectAccountStatus>;
    /**
     * Create a Stripe customer for a contact.
     */
    createCustomer(options: CreateCustomerOptions): Promise<CustomerResult>;
    /**
     * Retrieve a customer by ID.
     */
    getCustomer(customerId: string): Promise<CustomerResult>;
    /**
     * Create a draft invoice with line items.
     * Optionally create on behalf of a connected account.
     */
    createInvoice(options: CreateInvoiceOptions): Promise<InvoiceResult>;
    /**
     * Finalize a draft invoice and send it to the customer.
     */
    finalizeInvoice(invoiceId: string, stripeAccountId?: string): Promise<InvoiceResult>;
    /**
     * Void an open invoice. Cannot be undone.
     */
    voidInvoice(invoiceId: string, stripeAccountId?: string): Promise<InvoiceResult>;
    /**
     * Create a reusable payment link for a fixed amount.
     * Useful for quick payment collection without a full invoice.
     */
    createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLinkResult>;
    /**
     * Verify a Stripe webhook signature and construct the event.
     * Call this in your webhook handler to ensure the payload is authentic.
     */
    constructEvent(body: string | Buffer, signature: string, secret: string): Stripe.Event;
    private formatInvoice;
}
//# sourceMappingURL=index.d.ts.map