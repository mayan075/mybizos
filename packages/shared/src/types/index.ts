/** Core business types for MyBizOS */

// ─── Enums ──────────────────────────────────────────────────────────

export type Vertical = "rubbish_removals" | "moving_company" | "plumbing" | "hvac" | "electrical" | "roofing" | "landscaping" | "pest_control" | "cleaning" | "general_contractor";

export type ContactSource =
  | "manual"
  | "phone"
  | "sms"
  | "email"
  | "webform"
  | "referral"
  | "google_ads"
  | "facebook_ads"
  | "yelp"
  | "import";

export type DealStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "quote_sent"
  | "negotiation"
  | "won"
  | "lost";

export type ActivityType =
  | "call"
  | "sms"
  | "email"
  | "note"
  | "meeting"
  | "task"
  | "deal_stage_change"
  | "ai_interaction"
  | "form_submission"
  | "appointment_booked"
  | "appointment_completed"
  | "payment_received";

export type ChannelType = "sms" | "email" | "call" | "whatsapp" | "webchat";

export type ConversationStatus = "open" | "closed" | "snoozed";

export type MessageDirection = "inbound" | "outbound";

export type MessageSenderType = "contact" | "user" | "ai";

export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export type AiAgentType = "phone" | "sms" | "chat" | "review";

export type CallDirection = "inbound" | "outbound";

export type CallOutcome = "booked" | "qualified" | "escalated" | "spam" | "voicemail";

export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type OrgMemberRole = "owner" | "admin" | "manager" | "member";

// ─── Interfaces ─────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  vertical: Vertical;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  source: ContactSource;
  aiScore: number;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  orgId: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  orgId: string;
  name: string;
  slug: DealStage;
  position: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  assignedTo: string | null;
  metadata: Record<string, unknown>;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  performedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  orgId: string;
  contactId: string;
  channel: ChannelType;
  status: ConversationStatus;
  assignedTo: string | null;
  aiHandled: boolean;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  orgId: string;
  direction: MessageDirection;
  channel: ChannelType;
  senderType: MessageSenderType;
  senderId: string | null;
  body: string;
  mediaUrls: string[];
  metadata: Record<string, unknown>;
  status: MessageStatus;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  orgId: string;
  contactId: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  location: string | null;
  notes: string | null;
  reminderSentAt: Date | null;
  googleEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityRule {
  id: string;
  orgId: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiAgent {
  id: string;
  orgId: string;
  type: AiAgentType;
  name: string;
  systemPrompt: string;
  vertical: Vertical;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiCallLog {
  id: string;
  orgId: string;
  agentId: string;
  contactId: string | null;
  conversationId: string | null;
  twilioCallSid: string | null;
  direction: CallDirection;
  durationSeconds: number;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: CallOutcome;
  createdAt: Date;
}
