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
import { users } from "./auth";

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "send",
  "invite",
  "role_change",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: auditActionEnum("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_org_id_idx").on(table.orgId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.orgId, table.action),
    index("audit_logs_resource_idx").on(table.orgId, table.resource),
    index("audit_logs_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
