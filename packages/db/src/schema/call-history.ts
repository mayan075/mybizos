import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";

export const callHistory = pgTable(
  "call_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    phoneNumber: text("phone_number").notNull(),
    contactName: text("contact_name"),
    direction: text("direction").notNull().default("outbound"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    outcome: text("outcome").notNull().default("qualified"),
    aiHandled: boolean("ai_handled").notNull().default(false),
    summary: text("summary"),
    transcript: jsonb("transcript").notNull().default([]),
    actionsTaken: jsonb("actions_taken").notNull().default([]),
    recordingAvailable: boolean("recording_available").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("call_history_org_id_idx").on(table.orgId),
    index("call_history_contact_id_idx").on(table.contactId),
    index("call_history_org_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
