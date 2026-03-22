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

/* -------------------------------------------------------------------------- */
/*  Pipeline Templates — vertical-specific deal stages                        */
/* -------------------------------------------------------------------------- */

export interface PipelineStageTemplate {
  name: string;
  slug: DealStage;
  color: string;
  position: number;
}

export interface PipelineTemplate {
  name: string;
  stages: PipelineStageTemplate[];
}

/** Vertical-specific pipeline templates. Falls back to default if not found. */
export const PIPELINE_TEMPLATES: Partial<Record<Vertical, PipelineTemplate>> & { default: PipelineTemplate } = {
  rubbish_removals: {
    name: "Removals Pipeline",
    stages: [
      { name: "New Inquiry", slug: "new_lead", color: "#6366f1", position: 0 },
      { name: "Quote Sent", slug: "quote_sent", color: "#f59e0b", position: 1 },
      { name: "Quote Accepted", slug: "qualified", color: "#8b5cf6", position: 2 },
      { name: "Job Scheduled", slug: "contacted", color: "#3b82f6", position: 3 },
      { name: "In Progress", slug: "negotiation", color: "#ef4444", position: 4 },
      { name: "Completed", slug: "won", color: "#22c55e", position: 5 },
    ],
  },
  moving_company: {
    name: "Moving Pipeline",
    stages: [
      { name: "New Inquiry", slug: "new_lead", color: "#6366f1", position: 0 },
      { name: "Site Visit / Quote", slug: "contacted", color: "#3b82f6", position: 1 },
      { name: "Quote Sent", slug: "quote_sent", color: "#f59e0b", position: 2 },
      { name: "Booked", slug: "qualified", color: "#8b5cf6", position: 3 },
      { name: "Packing Day", slug: "negotiation", color: "#f97316", position: 4 },
      { name: "Moving Day", slug: "won", color: "#22c55e", position: 5 },
    ],
  },
  default: {
    name: "Sales Pipeline",
    stages: [
      { name: "New Lead", slug: "new_lead", color: "#6366f1", position: 0 },
      { name: "Contacted", slug: "contacted", color: "#3b82f6", position: 1 },
      { name: "Qualified", slug: "qualified", color: "#8b5cf6", position: 2 },
      { name: "Quote Sent", slug: "quote_sent", color: "#f59e0b", position: 3 },
      { name: "Negotiation", slug: "negotiation", color: "#ef4444", position: 4 },
      { name: "Won", slug: "won", color: "#22c55e", position: 5 },
      { name: "Lost", slug: "lost", color: "#6b7280", position: 6 },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Drip Sequence Templates — vertical-specific automated follow-ups          */
/* -------------------------------------------------------------------------- */

export interface DripMessage {
  id: string;
  trigger: string;
  delayMinutes: number;
  channel: "sms" | "email";
  template: string;
}

export interface DripSequenceTemplate {
  name: string;
  messages: DripMessage[];
}

/** Drip sequence templates by vertical. */
export const DRIP_SEQUENCE_TEMPLATES: Partial<Record<Vertical, DripSequenceTemplate[]>> = {
  rubbish_removals: [
    {
      name: "New Lead Follow-Up",
      messages: [
        { id: "rr-new-1", trigger: "lead_created", delayMinutes: 5, channel: "sms", template: "Thanks for reaching out to {businessName}! We can usually get to you within 24-48 hours. What needs removing?" },
        { id: "rr-new-2", trigger: "lead_created", delayMinutes: 1440, channel: "sms", template: "Hi {firstName}, just following up on your rubbish removal inquiry. Would you like a free quote? We can come have a look anytime this week." },
      ],
    },
    {
      name: "Quote Follow-Up",
      messages: [
        { id: "rr-quote-1", trigger: "quote_sent", delayMinutes: 1440, channel: "sms", template: "Hi {firstName}, just checking if you had any questions about the quote for your {serviceName}?" },
        { id: "rr-quote-2", trigger: "quote_sent", delayMinutes: 4320, channel: "sms", template: "Hi {firstName}, wanted to follow up on your quote. We have availability this week if you'd like to go ahead. Let us know!" },
      ],
    },
    {
      name: "Post-Job Review Request",
      messages: [
        { id: "rr-review-1", trigger: "job_completed", delayMinutes: 120, channel: "sms", template: "Thanks for choosing {businessName}! Hope we made it easy. Would you mind leaving a quick Google review? It really helps us out: {reviewLink}" },
      ],
    },
  ],
  moving_company: [
    {
      name: "New Lead Follow-Up",
      messages: [
        { id: "mv-new-1", trigger: "lead_created", delayMinutes: 5, channel: "sms", template: "Thanks for your moving inquiry with {businessName}! When's your move date? We book up fast so the sooner we lock it in the better." },
        { id: "mv-new-2", trigger: "lead_created", delayMinutes: 1440, channel: "sms", template: "Hi {firstName}, just following up about your upcoming move. Would you like a free quote? We can do it over the phone or come for a quick look." },
      ],
    },
    {
      name: "Quote Follow-Up",
      messages: [
        { id: "mv-quote-1", trigger: "quote_sent", delayMinutes: 1440, channel: "sms", template: "Hi {firstName}, just wanted to check in about your move on {moveDate}. Ready to lock in your booking?" },
        { id: "mv-quote-2", trigger: "quote_sent", delayMinutes: 4320, channel: "sms", template: "Hi {firstName}, weekends and end-of-month dates fill up fast. Let us know if you'd like to secure your spot!" },
      ],
    },
    {
      name: "Pre-Move Reminder",
      messages: [
        { id: "mv-remind-1", trigger: "appointment_upcoming", delayMinutes: -4320, channel: "sms", template: "Your move is in 3 days! Here's a quick checklist to prepare: label boxes by room, set aside essentials bag, clear pathways, and confirm parking for the truck." },
        { id: "mv-remind-2", trigger: "appointment_upcoming", delayMinutes: -1440, channel: "sms", template: "Moving day is tomorrow! Our team will arrive at {startTime}. Make sure fragile items are packed and the fridge is defrosted. See you then!" },
      ],
    },
    {
      name: "Post-Move Review Request",
      messages: [
        { id: "mv-review-1", trigger: "job_completed", delayMinutes: 120, channel: "sms", template: "Hope your move went smoothly! We'd love a quick Google review if you have a moment: {reviewLink}" },
      ],
    },
  ],
};
