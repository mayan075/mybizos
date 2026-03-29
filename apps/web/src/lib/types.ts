/**
 * Shared type definitions for the HararAI web app.
 * Extracted from mock-data.ts so that both real API responses
 * and mock fallback data use the same shapes.
 */

// ============================================================
// Dashboard types
// ============================================================

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  iconName: string;
  color: string;
  bg: string;
  href: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  iconName: string;
  title: string;
  description: string;
  time: string;
  color: string;
}

export interface UpcomingAppointment {
  id: string;
  customer: string;
  service: string;
  time: string;
  date: string;
  status: "confirmed" | "scheduled";
}

// ============================================================
// Contact types
// ============================================================

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  score: number;
  lastActivity: string;
  tags: string[];
  source: string;
}

export interface ContactDetail extends Contact {
  company: string;
  address: string;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  iconName: string;
  color: string;
  bg: string;
}

// ============================================================
// Pipeline types
// ============================================================

export interface PipelineColumn {
  id: string;
  title: string;
  color: string;
  /** The parent pipeline ID (from API); may be absent in mock data */
  pipelineId?: string;
  /** The actual stage UUID (from API); in mock data id=slug */
  stageId?: string;
  slug?: string;
}

export interface Deal {
  id: string;
  title: string;
  contact: string;
  value: number;
  currency?: string;
  daysInStage: number;
  score: number;
  tags: string[];
}

// ============================================================
// Conversation types
// ============================================================

export interface Conversation {
  id: string;
  contact: string;
  initials: string;
  channel: "sms" | "email" | "call";
  lastMessage: string;
  time: string;
  unread: boolean;
  aiHandled: boolean;
  status: "open" | "closed";
}

export interface ChatMessage {
  id: string;
  sender: "contact" | "user" | "ai";
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
}

// ============================================================
// Appointment types
// ============================================================

export interface Appointment {
  id: string;
  title: string;
  customer: string;
  time: string;
  duration: number;
  dayIndex: number;
  hourStart: number;
  status: "scheduled" | "confirmed" | "completed";
  location: string;
}

// ============================================================
// Backward-compatible aliases (gradually remove)
// ============================================================

export type MockStat = DashboardStat;
export type MockActivityItem = ActivityItem;
export type MockUpcomingAppointment = UpcomingAppointment;
export type MockContact = Contact;
export type MockContactDetail = ContactDetail;
export type MockTimelineEntry = TimelineEntry;
export type MockPipelineColumn = PipelineColumn;
export type MockDeal = Deal;
export type MockConversation = Conversation;
export type MockChatMessage = ChatMessage;
export type MockAppointment = Appointment;
