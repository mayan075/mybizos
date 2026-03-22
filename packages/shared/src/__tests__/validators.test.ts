import { describe, it, expect } from "vitest";
import {
  createContactInput,
  createDealInput,
  createAppointmentInput,
  organizationSchema,
  verticalSchema,
  contactSourceSchema,
  dealStageSchema,
  channelTypeSchema,
  activityTypeSchema,
  appointmentStatusSchema,
  dayOfWeekSchema,
  aiAgentTypeSchema,
  callOutcomeSchema,
  conversationStatusSchema,
  messageDirectionSchema,
  messageSenderTypeSchema,
  messageStatusSchema,
  orgMemberRoleSchema,
  callDirectionSchema,
  createMessageInput,
  contactSchema,
} from "../validators/index.js";

// ─── createContactInput ─────────────────────────────────────────────

describe("createContactInput", () => {
  it("accepts valid input with all fields", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+15551234567",
      source: "referral",
      tags: ["vip"],
      customFields: { notes: "Good lead" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with only required fields", () => {
    const result = createContactInput.safeParse({
      firstName: "Jane",
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("manual");
      expect(result.data.tags).toEqual([]);
      expect(result.data.customFields).toEqual({});
    }
  });

  it("rejects missing firstName", () => {
    const result = createContactInput.safeParse({
      lastName: "Smith",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const result = createContactInput.safeParse({
      firstName: "Jane",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName", () => {
    const result = createContactInput.safeParse({
      firstName: "",
      lastName: "Smith",
    });
    expect(result.success).toBe(false);
  });

  it("rejects firstName exceeding 255 characters", () => {
    const result = createContactInput.safeParse({
      firstName: "A".repeat(256),
      lastName: "Smith",
    });
    expect(result.success).toBe(false);
  });

  it("accepts firstName at exactly 255 characters", () => {
    const result = createContactInput.safeParse({
      firstName: "A".repeat(255),
      lastName: "Smith",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects email with no domain", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "john@",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe+test@company.co.uk",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid source value", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      source: "twitter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid companyId (not uuid)", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      companyId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid companyId uuid", () => {
    const result = createContactInput.safeParse({
      firstName: "John",
      lastName: "Doe",
      companyId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

// ─── contactSchema (aiScore boundary) ───────────────────────────────

describe("contactSchema aiScore boundaries", () => {
  const validContact = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    orgId: "550e8400-e29b-41d4-a716-446655440001",
    firstName: "John",
    lastName: "Doe",
    email: null,
    phone: null,
    companyId: null,
    source: "manual",
    aiScore: 50,
    tags: [],
    customFields: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("rejects aiScore above 100", () => {
    const result = contactSchema.safeParse({ ...validContact, aiScore: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects aiScore below 0", () => {
    const result = contactSchema.safeParse({ ...validContact, aiScore: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts aiScore at 0 boundary", () => {
    const result = contactSchema.safeParse({ ...validContact, aiScore: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts aiScore at 100 boundary", () => {
    const result = contactSchema.safeParse({ ...validContact, aiScore: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer aiScore", () => {
    const result = contactSchema.safeParse({ ...validContact, aiScore: 50.5 });
    expect(result.success).toBe(false);
  });
});

// ─── createDealInput ────────────────────────────────────────────────

describe("createDealInput", () => {
  const validDeal = {
    pipelineId: "550e8400-e29b-41d4-a716-446655440000",
    stageId: "550e8400-e29b-41d4-a716-446655440001",
    contactId: "550e8400-e29b-41d4-a716-446655440002",
    title: "New HVAC Installation",
  };

  it("accepts valid deal with defaults", () => {
    const result = createDealInput.safeParse(validDeal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(0);
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts valid deal with custom value", () => {
    const result = createDealInput.safeParse({ ...validDeal, value: 5000 });
    expect(result.success).toBe(true);
  });

  it("rejects negative deal value", () => {
    const result = createDealInput.safeParse({ ...validDeal, value: -100 });
    expect(result.success).toBe(false);
  });

  it("accepts zero deal value", () => {
    const result = createDealInput.safeParse({ ...validDeal, value: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const { title, ...noTitle } = validDeal;
    const result = createDealInput.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createDealInput.safeParse({ ...validDeal, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects currency not exactly 3 characters", () => {
    const result = createDealInput.safeParse({ ...validDeal, currency: "US" });
    expect(result.success).toBe(false);
  });

  it("rejects currency longer than 3 characters", () => {
    const result = createDealInput.safeParse({ ...validDeal, currency: "USDX" });
    expect(result.success).toBe(false);
  });

  it("rejects missing contactId", () => {
    const { contactId, ...noContact } = validDeal;
    const result = createDealInput.safeParse(noContact);
    expect(result.success).toBe(false);
  });
});

// ─── createAppointmentInput ─────────────────────────────────────────

describe("createAppointmentInput", () => {
  const now = new Date();
  const later = new Date(now.getTime() + 3600000); // 1 hour later

  const validAppointment = {
    contactId: "550e8400-e29b-41d4-a716-446655440000",
    title: "AC Repair Visit",
    startTime: now.toISOString(),
    endTime: later.toISOString(),
  };

  it("accepts valid appointment", () => {
    const result = createAppointmentInput.safeParse(validAppointment);
    expect(result.success).toBe(true);
  });

  it("accepts appointment with all optional fields", () => {
    const result = createAppointmentInput.safeParse({
      ...validAppointment,
      assignedTo: "550e8400-e29b-41d4-a716-446655440001",
      description: "Fix the broken AC unit",
      location: "123 Main St",
      notes: "Customer has a dog",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const { title, ...noTitle } = validAppointment;
    const result = createAppointmentInput.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it("rejects missing contactId", () => {
    const { contactId, ...noContact } = validAppointment;
    const result = createAppointmentInput.safeParse(noContact);
    expect(result.success).toBe(false);
  });

  it("rejects missing startTime", () => {
    const { startTime, ...noStart } = validAppointment;
    const result = createAppointmentInput.safeParse(noStart);
    expect(result.success).toBe(false);
  });

  it("rejects missing endTime", () => {
    const { endTime, ...noEnd } = validAppointment;
    const result = createAppointmentInput.safeParse(noEnd);
    expect(result.success).toBe(false);
  });

  it("accepts end time equal to start time (Zod does not enforce order)", () => {
    const result = createAppointmentInput.safeParse({
      ...validAppointment,
      endTime: validAppointment.startTime,
    });
    // Zod schema doesn't enforce startTime < endTime — that's business logic
    expect(result.success).toBe(true);
  });

  it("coerces string dates into Date objects", () => {
    const result = createAppointmentInput.safeParse(validAppointment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startTime).toBeInstanceOf(Date);
      expect(result.data.endTime).toBeInstanceOf(Date);
    }
  });
});

// ─── organizationSchema (createOrganizationInput via schema) ────────

describe("organizationSchema", () => {
  const validOrg = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Acme Plumbing",
    slug: "acme-plumbing",
    vertical: "plumbing",
    timezone: "America/New_York",
    phone: null,
    email: null,
    website: null,
    address: null,
    logoUrl: null,
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("accepts valid organization", () => {
    const result = organizationSchema.safeParse(validOrg);
    expect(result.success).toBe(true);
  });

  it("rejects invalid vertical", () => {
    const result = organizationSchema.safeParse({ ...validOrg, vertical: "dentistry" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase", () => {
    const result = organizationSchema.safeParse({ ...validOrg, slug: "Acme-Plumbing" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = organizationSchema.safeParse({ ...validOrg, slug: "acme plumbing" });
    expect(result.success).toBe(false);
  });

  it("accepts slug with numbers and hyphens", () => {
    const result = organizationSchema.safeParse({ ...validOrg, slug: "acme-plumbing-123" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URL", () => {
    const result = organizationSchema.safeParse({ ...validOrg, website: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts valid website URL", () => {
    const result = organizationSchema.safeParse({ ...validOrg, website: "https://acme.com" });
    expect(result.success).toBe(true);
  });
});

// ─── Enum Validators ────────────────────────────────────────────────

describe("enum validators", () => {
  it("verticalSchema accepts all valid verticals", () => {
    const verticals = ["rubbish_removals", "moving_company", "plumbing", "hvac", "electrical", "roofing", "landscaping", "pest_control", "cleaning", "general_contractor"];
    for (const v of verticals) {
      expect(verticalSchema.safeParse(v).success).toBe(true);
    }
  });

  it("verticalSchema rejects invalid vertical", () => {
    expect(verticalSchema.safeParse("dentistry").success).toBe(false);
    expect(verticalSchema.safeParse("").success).toBe(false);
    expect(verticalSchema.safeParse(123).success).toBe(false);
  });

  it("contactSourceSchema accepts all valid sources", () => {
    const sources = ["manual", "phone", "sms", "email", "webform", "referral", "google_ads", "facebook_ads", "yelp", "import"];
    for (const s of sources) {
      expect(contactSourceSchema.safeParse(s).success).toBe(true);
    }
  });

  it("contactSourceSchema rejects unknown source", () => {
    expect(contactSourceSchema.safeParse("twitter").success).toBe(false);
  });

  it("dealStageSchema accepts all stages", () => {
    const stages = ["new_lead", "contacted", "qualified", "quote_sent", "negotiation", "won", "lost"];
    for (const s of stages) {
      expect(dealStageSchema.safeParse(s).success).toBe(true);
    }
  });

  it("dealStageSchema rejects invalid stage", () => {
    expect(dealStageSchema.safeParse("closed").success).toBe(false);
  });

  it("channelTypeSchema accepts all channels", () => {
    const channels = ["sms", "email", "call", "whatsapp", "webchat"];
    for (const c of channels) {
      expect(channelTypeSchema.safeParse(c).success).toBe(true);
    }
  });

  it("activityTypeSchema accepts all activity types", () => {
    const types = ["call", "sms", "email", "note", "meeting", "task", "deal_stage_change", "ai_interaction", "form_submission", "appointment_booked", "appointment_completed", "payment_received"];
    for (const t of types) {
      expect(activityTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("appointmentStatusSchema accepts all statuses", () => {
    const statuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
    for (const s of statuses) {
      expect(appointmentStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("dayOfWeekSchema accepts all days", () => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const d of days) {
      expect(dayOfWeekSchema.safeParse(d).success).toBe(true);
    }
  });

  it("aiAgentTypeSchema accepts all agent types", () => {
    const types = ["phone", "sms", "chat", "review"];
    for (const t of types) {
      expect(aiAgentTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("callOutcomeSchema accepts all outcomes", () => {
    const outcomes = ["booked", "qualified", "escalated", "spam", "voicemail"];
    for (const o of outcomes) {
      expect(callOutcomeSchema.safeParse(o).success).toBe(true);
    }
  });

  it("conversationStatusSchema accepts all statuses", () => {
    const statuses = ["open", "closed", "snoozed"];
    for (const s of statuses) {
      expect(conversationStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("messageDirectionSchema accepts inbound and outbound", () => {
    expect(messageDirectionSchema.safeParse("inbound").success).toBe(true);
    expect(messageDirectionSchema.safeParse("outbound").success).toBe(true);
    expect(messageDirectionSchema.safeParse("both").success).toBe(false);
  });

  it("messageSenderTypeSchema accepts all types", () => {
    expect(messageSenderTypeSchema.safeParse("contact").success).toBe(true);
    expect(messageSenderTypeSchema.safeParse("user").success).toBe(true);
    expect(messageSenderTypeSchema.safeParse("ai").success).toBe(true);
    expect(messageSenderTypeSchema.safeParse("bot").success).toBe(false);
  });

  it("messageStatusSchema accepts all statuses", () => {
    const statuses = ["sent", "delivered", "read", "failed"];
    for (const s of statuses) {
      expect(messageStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("orgMemberRoleSchema accepts all roles", () => {
    const roles = ["owner", "admin", "manager", "member"];
    for (const r of roles) {
      expect(orgMemberRoleSchema.safeParse(r).success).toBe(true);
    }
    expect(orgMemberRoleSchema.safeParse("superadmin").success).toBe(false);
  });

  it("callDirectionSchema accepts inbound and outbound", () => {
    expect(callDirectionSchema.safeParse("inbound").success).toBe(true);
    expect(callDirectionSchema.safeParse("outbound").success).toBe(true);
  });
});

// ─── createMessageInput ─────────────────────────────────────────────

describe("createMessageInput", () => {
  it("accepts valid message input", () => {
    const result = createMessageInput.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      direction: "inbound",
      channel: "sms",
      senderType: "contact",
      body: "Hello, I need help",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = createMessageInput.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      direction: "inbound",
      channel: "sms",
      senderType: "contact",
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mediaUrl", () => {
    const result = createMessageInput.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      direction: "inbound",
      channel: "sms",
      senderType: "contact",
      body: "Check this out",
      mediaUrls: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });
});
