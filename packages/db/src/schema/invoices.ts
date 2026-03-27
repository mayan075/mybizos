import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";
import { deals } from "./pipeline";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
]);

export const estimateStatusEnum = pgEnum("estimate_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

export const invoices = pgTable(
  "invoices",
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
    invoiceNumber: text("invoice_number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issueDate: timestamp("issue_date").defaultNow().notNull(),
    dueDate: timestamp("due_date").notNull(),
    lineItems: jsonb("line_items").notNull().default([]),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    paidAt: timestamp("paid_at"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoices_org_id_idx").on(table.orgId),
    index("invoices_contact_id_idx").on(table.contactId),
    index("invoices_status_idx").on(table.orgId, table.status),
    index("invoices_org_created_at_idx").on(table.orgId, table.createdAt),
  ],
);

export const estimates = pgTable(
  "estimates",
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
    estimateNumber: text("estimate_number").notNull(),
    status: estimateStatusEnum("status").notNull().default("draft"),
    issueDate: timestamp("issue_date").defaultNow().notNull(),
    validUntil: timestamp("valid_until").notNull(),
    lineItems: jsonb("line_items").notNull().default([]),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    acceptedAt: timestamp("accepted_at"),
    sentAt: timestamp("sent_at"),
    convertedToInvoiceId: uuid("converted_to_invoice_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("estimates_org_id_idx").on(table.orgId),
    index("estimates_contact_id_idx").on(table.contactId),
    index("estimates_status_idx").on(table.orgId, table.status),
    index("estimates_org_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
