import type {
  ActivityType,
  AiAgentType,
  AppointmentStatus,
  CallOutcome,
  ChannelType,
  ConversationStatus,
  DayOfWeek,
  DealStage,
  ContactSource,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  OrgMemberRole,
  Vertical,
} from "../types/index.js";

/** Supported business verticals */
export const VERTICALS: readonly Vertical[] = [
  "rubbish_removals",
  "moving_company",
  "plumbing",
  "hvac",
  "electrical",
  "roofing",
  "landscaping",
  "pest_control",
  "cleaning",
  "general_contractor",
] as const;

/** Vertical display labels */
export const VERTICAL_LABELS: Record<Vertical, string> = {
  rubbish_removals: "Rubbish Removals",
  moving_company: "Moving Company",
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  roofing: "Roofing",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  cleaning: "Cleaning",
  general_contractor: "General Contractor",
};

/** Default pipeline deal stages in order */
export const DEAL_STAGES: readonly DealStage[] = [
  "new_lead",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiation",
  "won",
  "lost",
] as const;

/** Deal stage display labels */
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  quote_sent: "Quote Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

/** Deal stage colors for UI rendering */
export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  new_lead: "#6366f1",
  contacted: "#3b82f6",
  qualified: "#8b5cf6",
  quote_sent: "#f59e0b",
  negotiation: "#ef4444",
  won: "#22c55e",
  lost: "#6b7280",
};

/** Activity types for the unified timeline */
export const ACTIVITY_TYPES: readonly ActivityType[] = [
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
] as const;

/** Activity type display labels */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  note: "Note",
  meeting: "Meeting",
  task: "Task",
  deal_stage_change: "Deal Stage Change",
  ai_interaction: "AI Interaction",
  form_submission: "Form Submission",
  appointment_booked: "Appointment Booked",
  appointment_completed: "Appointment Completed",
  payment_received: "Payment Received",
};

/** Communication channel types */
export const CHANNEL_TYPES: readonly ChannelType[] = [
  "sms",
  "email",
  "call",
  "whatsapp",
  "webchat",
] as const;

/** Channel type display labels */
export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  sms: "SMS",
  email: "Email",
  call: "Phone Call",
  whatsapp: "WhatsApp",
  webchat: "Web Chat",
};

/** Contact sources */
export const CONTACT_SOURCES: readonly ContactSource[] = [
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
] as const;

/** Conversation statuses */
export const CONVERSATION_STATUSES: readonly ConversationStatus[] = [
  "open",
  "closed",
  "snoozed",
] as const;

/** Message directions */
export const MESSAGE_DIRECTIONS: readonly MessageDirection[] = [
  "inbound",
  "outbound",
] as const;

/** Message sender types */
export const MESSAGE_SENDER_TYPES: readonly MessageSenderType[] = [
  "contact",
  "user",
  "ai",
] as const;

/** Message statuses */
export const MESSAGE_STATUSES: readonly MessageStatus[] = [
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

/** AI agent types */
export const AI_AGENT_TYPES: readonly AiAgentType[] = [
  "phone",
  "sms",
  "chat",
  "review",
] as const;

/** AI call outcomes */
export const CALL_OUTCOMES: readonly CallOutcome[] = [
  "booked",
  "qualified",
  "escalated",
  "spam",
  "voicemail",
] as const;

/** Appointment statuses */
export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

/** Days of the week */
export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Org member roles */
export const ORG_MEMBER_ROLES: readonly OrgMemberRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
] as const;

/** AI scoring thresholds */
export const AI_SCORE = {
  MIN: 0,
  MAX: 100,
  HOT_LEAD: 80,
  WARM_LEAD: 50,
  COLD_LEAD: 20,
} as const;

/** Emergency keywords that trigger instant owner alert */
export const EMERGENCY_KEYWORDS = [
  "flooding",
  "flood",
  "gas leak",
  "gas smell",
  "fire",
  "carbon monoxide",
  "co detector",
  "burst pipe",
  "sewage",
  "no heat",
  "no hot water",
  "electrical fire",
  "sparking",
  "smoke",
] as const;

/** Max AI misunderstandings before escalation to human */
export const AI_MAX_MISUNDERSTANDINGS = 2;

/** AI disclosure message prefix (legally required) */
export const AI_DISCLOSURE_PREFIX =
  "Hi, this is {businessName}'s AI assistant. This call may be recorded.";

/** Default currency */
export const DEFAULT_CURRENCY = "USD";

/** Default timezone */
export const DEFAULT_TIMEZONE = "America/New_York";
