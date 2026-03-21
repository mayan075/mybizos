import { z } from "zod";

// ─── Enum Schemas ───────────────────────────────────────────────────

export const verticalSchema = z.enum([
  "plumbing",
  "hvac",
  "electrical",
  "roofing",
  "landscaping",
  "pest_control",
  "cleaning",
  "general_contractor",
]);

export const contactSourceSchema = z.enum([
  "manual",
  "phone",
  "sms",
  "email",
  "webform",
  "referral",
  "google_ads",
  "facebook_ads",
  "yelp",
  "import",
]);

export const dealStageSchema = z.enum([
  "new_lead",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiation",
  "won",
  "lost",
]);

export const activityTypeSchema = z.enum([
  "call",
  "sms",
  "email",
  "note",
  "meeting",
  "task",
  "deal_stage_change",
  "ai_interaction",
  "form_submission",
  "appointment_booked",
  "appointment_completed",
  "payment_received",
]);

export const channelTypeSchema = z.enum([
  "sms",
  "email",
  "call",
  "whatsapp",
  "webchat",
]);

export const conversationStatusSchema = z.enum(["open", "closed", "snoozed"]);

export const messageDirectionSchema = z.enum(["inbound", "outbound"]);

export const messageSenderTypeSchema = z.enum(["contact", "user", "ai"]);

export const messageStatusSchema = z.enum(["sent", "delivered", "read", "failed"]);

export const aiAgentTypeSchema = z.enum(["phone", "sms", "chat", "review"]);

export const callDirectionSchema = z.enum(["inbound", "outbound"]);

export const callOutcomeSchema = z.enum([
  "booked",
  "qualified",
  "escalated",
  "spam",
  "voicemail",
]);

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const orgMemberRoleSchema = z.enum(["owner", "admin", "manager", "member"]);

// ─── Entity Schemas ─────────────────────────────────────────────────

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  vertical: verticalSchema,
  timezone: z.string().min(1),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  address: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  settings: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const contactSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  companyId: z.string().uuid().nullable(),
  source: contactSourceSchema,
  aiScore: z.number().int().min(0).max(100),
  tags: z.array(z.string()),
  customFields: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const companySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  address: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const pipelineSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const pipelineStageSchema = z.object({
  id: z.string().uuid(),
  pipelineId: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: dealStageSchema,
  position: z.number().int().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const dealSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid(),
  title: z.string().min(1).max(500),
  value: z.number().min(0),
  currency: z.string().length(3),
  expectedCloseDate: z.coerce.date().nullable(),
  assignedTo: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()),
  closedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const activitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  dealId: z.string().uuid().nullable(),
  type: activityTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  performedBy: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.coerce.date(),
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  contactId: z.string().uuid(),
  channel: channelTypeSchema,
  status: conversationStatusSchema,
  assignedTo: z.string().uuid().nullable(),
  aiHandled: z.boolean(),
  lastMessageAt: z.coerce.date().nullable(),
  unreadCount: z.number().int().min(0),
  createdAt: z.coerce.date(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  orgId: z.string().uuid(),
  direction: messageDirectionSchema,
  channel: channelTypeSchema,
  senderType: messageSenderTypeSchema,
  senderId: z.string().uuid().nullable(),
  body: z.string(),
  mediaUrls: z.array(z.string().url()),
  metadata: z.record(z.unknown()),
  status: messageStatusSchema,
  createdAt: z.coerce.date(),
});

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  contactId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: appointmentStatusSchema,
  location: z.string().nullable(),
  notes: z.string().nullable(),
  reminderSentAt: z.coerce.date().nullable(),
  googleEventId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const availabilityRuleSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const aiAgentSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  type: aiAgentTypeSchema,
  name: z.string().min(1).max(255),
  systemPrompt: z.string().min(1),
  vertical: verticalSchema,
  settings: z.record(z.unknown()),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const aiCallLogSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  agentId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  conversationId: z.string().uuid().nullable(),
  twilioCallSid: z.string().nullable(),
  direction: callDirectionSchema,
  durationSeconds: z.number().int().min(0),
  recordingUrl: z.string().url().nullable(),
  transcript: z.string().nullable(),
  summary: z.string().nullable(),
  sentiment: z.string().nullable(),
  outcome: callOutcomeSchema,
  createdAt: z.coerce.date(),
});

// ─── Create/Update Input Schemas ────────────────────────────────────

export const createContactInput = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyId: z.string().uuid().optional(),
  source: contactSourceSchema.default("manual"),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
});

export const updateContactInput = createContactInput.partial();

export const createDealInput = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid(),
  title: z.string().min(1).max(500),
  value: z.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  expectedCloseDate: z.coerce.date().optional(),
  assignedTo: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateDealInput = createDealInput.partial();

export const createAppointmentInput = z.object({
  contactId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentInput = createAppointmentInput.partial();

export const createMessageInput = z.object({
  conversationId: z.string().uuid(),
  direction: messageDirectionSchema,
  channel: channelTypeSchema,
  senderType: messageSenderTypeSchema,
  senderId: z.string().uuid().optional(),
  body: z.string().min(1),
  mediaUrls: z.array(z.string().url()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

// ─── Type Inference Helpers ─────────────────────────────────────────

export type CreateContactInput = z.infer<typeof createContactInput>;
export type UpdateContactInput = z.infer<typeof updateContactInput>;
export type CreateDealInput = z.infer<typeof createDealInput>;
export type UpdateDealInput = z.infer<typeof updateDealInput>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentInput>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentInput>;
export type CreateMessageInput = z.infer<typeof createMessageInput>;
