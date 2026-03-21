import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, verticalEnum } from "./organizations.js";
import { contacts } from "./contacts.js";
import { conversations } from "./communications.js";

export const aiAgentTypeEnum = pgEnum("ai_agent_type", [
  "phone",
  "sms",
  "chat",
  "review",
]);

export const callDirectionEnum = pgEnum("call_direction", [
  "inbound",
  "outbound",
]);

export const callOutcomeEnum = pgEnum("call_outcome", [
  "booked",
  "qualified",
  "escalated",
  "spam",
  "voicemail",
]);

export const aiAgents = pgTable(
  "ai_agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: aiAgentTypeEnum("type").notNull(),
    name: text("name").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    vertical: verticalEnum("vertical").notNull(),
    settings: jsonb("settings").default({}).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_agents_org_id_idx").on(table.orgId),
    index("ai_agents_type_idx").on(table.orgId, table.type),
    index("ai_agents_active_idx").on(table.orgId, table.isActive),
  ],
);

export const aiCallLogs = pgTable(
  "ai_call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => aiAgents.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    twilioCallSid: text("twilio_call_sid"),
    direction: callDirectionEnum("direction").notNull(),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    summary: text("summary"),
    sentiment: text("sentiment"),
    outcome: callOutcomeEnum("outcome").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_call_logs_org_id_idx").on(table.orgId),
    index("ai_call_logs_agent_id_idx").on(table.agentId),
    index("ai_call_logs_contact_id_idx").on(table.contactId),
    index("ai_call_logs_conversation_id_idx").on(table.conversationId),
    index("ai_call_logs_twilio_sid_idx").on(table.twilioCallSid),
    index("ai_call_logs_outcome_idx").on(table.orgId, table.outcome),
    index("ai_call_logs_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
