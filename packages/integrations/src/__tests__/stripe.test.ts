import { describe, it, expect } from "vitest";
import {
  StripeClient,
  type StripeConfig,
  type CreateConnectAccountOptions,
  type CreateConnectAccountResult,
  type CreateAccountLinkResult,
  type ConnectAccountStatus,
  type CreateCustomerOptions,
  type CustomerResult,
  type InvoiceLineItem,
  type CreateInvoiceOptions,
  type InvoiceResult,
  type CreatePaymentLinkOptions,
  type PaymentLinkResult,
  type CreateSubscriptionOptions,
  type SubscriptionResult,
  type BillingPortalResult,
} from "../stripe/index.js";

describe("StripeClient", () => {
  it("constructor does not throw with a valid config", () => {
    expect(() => {
      new StripeClient({ secretKey: "sk_test_fake_key_for_testing" });
    }).not.toThrow();
  });

  it("constructor accepts StripeConfig interface", () => {
    const config: StripeConfig = { secretKey: "sk_test_123" };
    const client = new StripeClient(config);
    expect(client).toBeInstanceOf(StripeClient);
  });
});

describe("Stripe type exports", () => {
  it("StripeConfig type is usable", () => {
    const config: StripeConfig = { secretKey: "sk_test_abc" };
    expect(config.secretKey).toBe("sk_test_abc");
  });

  it("CreateConnectAccountOptions type is usable", () => {
    const opts: CreateConnectAccountOptions = {
      email: "test@example.com",
      businessName: "Acme Plumbing",
      metadata: { orgId: "org_123" },
    };
    expect(opts.email).toBe("test@example.com");
    expect(opts.businessName).toBe("Acme Plumbing");
    expect(opts.metadata).toEqual({ orgId: "org_123" });
  });

  it("CreateConnectAccountResult type is usable", () => {
    const result: CreateConnectAccountResult = {
      accountId: "acct_123",
      email: "test@example.com",
      type: "express",
    };
    expect(result.accountId).toBe("acct_123");
  });

  it("ConnectAccountStatus type is usable", () => {
    const status: ConnectAccountStatus = {
      id: "acct_123",
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      email: "test@example.com",
      businessProfile: { name: "Acme Plumbing" },
    };
    expect(status.chargesEnabled).toBe(true);
    expect(status.businessProfile.name).toBe("Acme Plumbing");
  });

  it("CreateCustomerOptions type is usable", () => {
    const opts: CreateCustomerOptions = {
      email: "customer@example.com",
      name: "John Doe",
      phone: "+15551234567",
    };
    expect(opts.name).toBe("John Doe");
  });

  it("InvoiceLineItem type is usable", () => {
    const item: InvoiceLineItem = {
      description: "AC Repair",
      amount: 15000,
      quantity: 1,
    };
    expect(item.amount).toBe(15000);
  });

  it("CreatePaymentLinkOptions type is usable", () => {
    const opts: CreatePaymentLinkOptions = {
      amount: 25000,
      currency: "usd",
      description: "Service Call",
    };
    expect(opts.amount).toBe(25000);
  });

  it("PaymentLinkResult type is usable", () => {
    const result: PaymentLinkResult = {
      id: "plink_123",
      url: "https://buy.stripe.com/test",
      active: true,
    };
    expect(result.active).toBe(true);
  });

  it("BillingPortalResult type is usable", () => {
    const result: BillingPortalResult = {
      url: "https://billing.stripe.com/session/test",
    };
    expect(result.url).toContain("stripe.com");
  });
});
