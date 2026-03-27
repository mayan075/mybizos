import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";

export const formStatusEnum = pgEnum("form_status", ["active", "inactive"]);

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    fields: jsonb("fields").notNull().default([]),
    settings: jsonb("settings").notNull().default({}),
    status: formStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("forms_org_id_idx").on(table.orgId),
    index("forms_org_id_status_idx").on(table.orgId, table.status),
  ],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    data: jsonb("data").notNull(),
    source: text("source").notNull().default("website"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("form_submissions_org_id_idx").on(table.orgId),
    index("form_submissions_form_id_idx").on(table.formId),
    index("form_submissions_contact_id_idx").on(table.contactId),
    index("form_submissions_org_created_at_idx").on(
      table.orgId,
      table.createdAt,
    ),
  ],
);
