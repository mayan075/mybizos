import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { deals } from "./pipeline.js";
import { users } from "./auth.js";

export const activityTypeEnum = pgEnum("activity_type", [
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

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    dealId: uuid("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    type: activityTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    performedBy: uuid("performed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activities_org_id_idx").on(table.orgId),
    index("activities_contact_id_idx").on(table.contactId),
    index("activities_deal_id_idx").on(table.dealId),
    index("activities_type_idx").on(table.orgId, table.type),
    index("activities_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
