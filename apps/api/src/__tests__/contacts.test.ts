import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Replicate the Zod schemas from routes/contacts.ts ──
// We import the schemas by redefining them here to test validation logic
// without needing to boot the Hono server or import middleware dependencies.

const listContactsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  source: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  company: z.string().nullable().optional().default(null),
  source: z
    .enum([
      "email",
      "phone",
      "manual",
      "sms",
      "webform",
      "referral",
      "google_ads",
      "facebook_ads",
      "yelp",
      "import",
    ])
    .default("manual"),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
});

const updateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z
    .enum([
      "email",
      "phone",
      "manual",
      "sms",
      "webform",
      "referral",
      "google_ads",
      "facebook_ads",
      "yelp",
      "import",
    ])
    .optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

// ── listContactsSchema ──

describe("listContactsSchema", () => {
  it("provides defaults when no params given", () => {
    const result = listContactsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.search).toBeUndefined();
      expect(result.data.status).toBeUndefined();
    }
  });

  it("coerces page and limit from strings", () => {
    const result = listContactsSchema.safeParse({ page: "3", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects page of 0", () => {
    const result = listContactsSchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects negative page", () => {
    const result = listContactsSchema.safeParse({ page: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 100", () => {
    const result = listContactsSchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  it("rejects limit of 0", () => {
    const result = listContactsSchema.safeParse({ limit: "0" });
    expect(result.success).toBe(false);
  });

  it("accepts valid status filter", () => {
    const result = listContactsSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status filter", () => {
    const result = listContactsSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts search string", () => {
    const result = listContactsSchema.safeParse({ search: "john" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("john");
    }
  });
});

// ── createContactSchema ──

describe("createContactSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createContactSchema.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+15551234567",
      company: "Acme Corp",
      source: "referral",
      status: "active",
      tags: ["vip", "priority"],
      customFields: { notes: "Important customer" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with only required fields and provides defaults", () => {
    const result = createContactSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.company).toBeNull();
      expect(result.data.source).toBe("manual");
      expect(result.data.status).toBe("active");
      expect(result.data.tags).toEqual([]);
      expect(result.data.customFields).toEqual({});
    }
  });

  it("rejects missing firstName", () => {
    const result = createContactSchema.safeParse({ lastName: "Smith" });
    expect(result.success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const result = createContactSchema.safeParse({ firstName: "Jane" });
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName", () => {
    const result = createContactSchema.safeParse({
      firstName: "",
      lastName: "Smith",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty lastName", () => {
    const result = createContactSchema.safeParse({
      firstName: "Jane",
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createContactSchema.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null email", () => {
    const result = createContactSchema.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid source value", () => {
    const result = createContactSchema.safeParse({
      firstName: "John",
      lastName: "Doe",
      source: "twitter",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid source values", () => {
    const sources = [
      "email",
      "phone",
      "manual",
      "sms",
      "webform",
      "referral",
      "google_ads",
      "facebook_ads",
      "yelp",
      "import",
    ];
    for (const source of sources) {
      const result = createContactSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        source,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    const result = createContactSchema.safeParse({
      firstName: "John",
      lastName: "Doe",
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });
});

// ── updateContactSchema ──

describe("updateContactSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateContactSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with firstName only", () => {
    const result = updateContactSchema.safeParse({ firstName: "Updated" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Updated");
      expect(result.data.lastName).toBeUndefined();
    }
  });

  it("rejects empty firstName string", () => {
    const result = updateContactSchema.safeParse({ firstName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email in update", () => {
    const result = updateContactSchema.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });

  it("accepts null email in update", () => {
    const result = updateContactSchema.safeParse({ email: null });
    expect(result.success).toBe(true);
  });

  it("accepts valid tags array", () => {
    const result = updateContactSchema.safeParse({ tags: ["vip", "new"] });
    expect(result.success).toBe(true);
  });

  it("accepts valid customFields", () => {
    const result = updateContactSchema.safeParse({
      customFields: { key: "value" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid source in update", () => {
    const result = updateContactSchema.safeParse({ source: "unknown" });
    expect(result.success).toBe(false);
  });
});
