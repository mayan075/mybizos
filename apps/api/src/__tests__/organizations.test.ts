import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Replicate the Zod schemas from various route files ──
// Testing validation logic in isolation without booting the server.

// From routes/organizations.ts
const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  businessHours: z
    .object({
      start: z.string(),
      end: z.string(),
      days: z.array(z.number().min(0).max(6)),
    })
    .optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member"]),
  name: z.string().min(1, "Name is required"),
});

const onboardingSchema = z
  .object({
    businessName: z.string().min(1).max(200),
    industry: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
    serviceArea: z.string().max(500).optional(),
    teamSize: z.string().max(50).optional(),
    goals: z.array(z.string().max(200)).optional(),
  })
  .passthrough();

// From routes/voice-twiml.ts
const twimlPayloadSchema = z.object({
  To: z.string().default(""),
  From: z.string().default(""),
  AccountSid: z.string().default(""),
  CallSid: z.string().default(""),
});

// From webhooks/stripe.ts
const stripeEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    data: z.object({ object: z.record(z.unknown()) }).optional(),
  })
  .passthrough();

// ── updateOrgSchema ──

describe("updateOrgSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateOrgSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid partial update", () => {
    const result = updateOrgSchema.safeParse({
      name: "My Business",
      timezone: "America/New_York",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = updateOrgSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = updateOrgSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("validates businessHours structure", () => {
    const result = updateOrgSchema.safeParse({
      businessHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid day numbers in businessHours", () => {
    const result = updateOrgSchema.safeParse({
      businessHours: { start: "09:00", end: "17:00", days: [7] },
    });
    expect(result.success).toBe(false);
  });
});

// ── inviteMemberSchema ──

describe("inviteMemberSchema", () => {
  it("accepts valid invite", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "admin",
      name: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      email: "bad",
      role: "admin",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "superadmin",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "member",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── onboardingSchema ──

describe("onboardingSchema", () => {
  it("accepts valid onboarding data", () => {
    const result = onboardingSchema.safeParse({
      businessName: "Acme HVAC",
      industry: "HVAC",
      phone: "+15551234567",
    });
    expect(result.success).toBe(true);
  });

  it("requires businessName", () => {
    const result = onboardingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty businessName", () => {
    const result = onboardingSchema.safeParse({ businessName: "" });
    expect(result.success).toBe(false);
  });

  it("accepts goals array", () => {
    const result = onboardingSchema.safeParse({
      businessName: "Test Biz",
      goals: ["More leads", "Better scheduling"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goals).toHaveLength(2);
    }
  });

  it("passes through extra fields", () => {
    const result = onboardingSchema.safeParse({
      businessName: "Test",
      customField: "hello",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty("customField", "hello");
    }
  });
});

// ── twimlPayloadSchema ──

describe("twimlPayloadSchema", () => {
  it("provides defaults for empty object", () => {
    const result = twimlPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.To).toBe("");
      expect(result.data.From).toBe("");
      expect(result.data.AccountSid).toBe("");
      expect(result.data.CallSid).toBe("");
    }
  });

  it("accepts valid Twilio params", () => {
    const result = twimlPayloadSchema.safeParse({
      To: "+15551234567",
      From: "client:user_123",
      AccountSid: "AC123abc",
      CallSid: "CA456def",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.To).toBe("+15551234567");
      expect(result.data.From).toBe("client:user_123");
    }
  });
});

// ── stripeEventSchema ──

describe("stripeEventSchema", () => {
  it("accepts valid Stripe event", () => {
    const result = stripeEventSchema.safeParse({
      id: "evt_123",
      type: "invoice.paid",
      data: { object: { id: "inv_123" } },
    });
    expect(result.success).toBe(true);
  });

  it("accepts event without data", () => {
    const result = stripeEventSchema.safeParse({
      id: "evt_456",
      type: "customer.created",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = stripeEventSchema.safeParse({ type: "invoice.paid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = stripeEventSchema.safeParse({ id: "evt_123" });
    expect(result.success).toBe(false);
  });

  it("passes through extra fields", () => {
    const result = stripeEventSchema.safeParse({
      id: "evt_789",
      type: "charge.succeeded",
      livemode: false,
      api_version: "2023-10-16",
    });
    expect(result.success).toBe(true);
  });
});
