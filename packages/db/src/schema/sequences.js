import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";
// ── Enums ──
export const sequenceTriggerTypeEnum = pgEnum("sequence_trigger_type", [
    "manual",
    "tag_added",
    "deal_stage_changed",
    "form_submitted",
    "appointment_completed",
    "contact_created",
]);
export const sequenceStepTypeEnum = pgEnum("sequence_step_type", [
    "send_email",
    "send_sms",
    "wait",
    "add_tag",
    "remove_tag",
    "ai_decision",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
    "active",
    "completed",
    "cancelled",
    "paused",
]);
// ── Tables ──
export const dripSequences = pgTable("drip_sequences", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: sequenceTriggerTypeEnum("trigger_type").notNull().default("manual"),
    triggerConfig: jsonb("trigger_config").$type().default({}).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    enrollmentCount: integer("enrollment_count").notNull().default(0),
    steps: jsonb("steps").$type().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("drip_sequences_org_id_idx").on(table.orgId),
    index("drip_sequences_trigger_type_idx").on(table.orgId, table.triggerType),
    index("drip_sequences_is_active_idx").on(table.orgId, table.isActive),
    index("drip_sequences_created_at_idx").on(table.orgId, table.createdAt),
]);
export const sequenceEnrollments = pgTable("sequence_enrollments", {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
        .notNull()
        .references(() => dripSequences.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
        .notNull()
        .references(() => contacts.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    nextStepAt: timestamp("next_step_at"),
    completedAt: timestamp("completed_at"),
}, (table) => [
    index("sequence_enrollments_sequence_id_idx").on(table.sequenceId),
    index("sequence_enrollments_contact_id_idx").on(table.contactId),
    index("sequence_enrollments_org_id_idx").on(table.orgId),
    index("sequence_enrollments_status_idx").on(table.sequenceId, table.status),
    index("sequence_enrollments_next_step_at_idx").on(table.status, table.nextStepAt),
]);
//# sourceMappingURL=sequences.js.map