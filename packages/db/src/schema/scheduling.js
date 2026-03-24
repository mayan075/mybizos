import { boolean, index, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";
import { users } from "./auth";
export const appointmentStatusEnum = pgEnum("appointment_status", [
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
]);
export const dayOfWeekEnum = pgEnum("day_of_week", [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]);
export const appointments = pgTable("appointments", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contacts.id, { onDelete: "cascade" }),
    assignedTo: uuid("assigned_to").references(() => users.id, {
        onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    location: text("location"),
    notes: text("notes"),
    reminderSentAt: timestamp("reminder_sent_at"),
    googleEventId: text("google_event_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("appointments_org_id_idx").on(table.orgId),
    index("appointments_contact_id_idx").on(table.contactId),
    index("appointments_assigned_to_idx").on(table.assignedTo),
    index("appointments_status_idx").on(table.orgId, table.status),
    index("appointments_start_time_idx").on(table.orgId, table.startTime),
    index("appointments_google_event_id_idx").on(table.googleEventId),
]);
export const availabilityRules = pgTable("availability_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    startTime: text("start_time").notNull(), // HH:mm format
    endTime: text("end_time").notNull(), // HH:mm format
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("availability_rules_org_id_idx").on(table.orgId),
    index("availability_rules_user_id_idx").on(table.userId),
    index("availability_rules_day_idx").on(table.orgId, table.userId, table.dayOfWeek),
]);
//# sourceMappingURL=scheduling.js.map