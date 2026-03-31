import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const contactSourceEnum = pgEnum("contact_source", [
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

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("companies_org_id_idx").on(table.orgId),
    index("companies_name_idx").on(table.orgId, table.name),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    source: contactSourceEnum("source").notNull().default("manual"),
    aiScore: integer("ai_score").notNull().default(0),
    tags: text("tags")
      .array()
      .notNull()
      .default([]),
    customFields: jsonb("custom_fields").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contacts_org_id_idx").on(table.orgId),
    index("contacts_email_idx").on(table.orgId, table.email),
    index("contacts_phone_idx").on(table.orgId, table.phone),
    index("contacts_company_id_idx").on(table.companyId),
    index("contacts_ai_score_idx").on(table.orgId, table.aiScore),
    index("contacts_source_idx").on(table.orgId, table.source),
    index("contacts_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
