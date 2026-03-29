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
import { bookableServices } from "./bookable-services";

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "pending",
  "notified",
  "booked",
  "expired",
]);

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => bookableServices.id, {
      onDelete: "set null",
    }),
    preferredDateRange: jsonb("preferred_date_range"),
    preferredTimeOfDay: text("preferred_time_of_day"),
    status: waitlistStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("waitlist_org_id_idx").on(table.orgId),
    index("waitlist_org_status_idx").on(table.orgId, table.status),
    index("waitlist_org_contact_idx").on(table.orgId, table.contactId),
  ],
);
