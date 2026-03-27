import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull().default("system"),
    title: text("title").notNull(),
    description: text("description"),
    read: boolean("read").notNull().default(false),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_org_id_idx").on(table.orgId),
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_org_read_idx").on(table.orgId, table.read),
    index("notifications_org_created_at_idx").on(table.orgId, table.createdAt),
  ],
);
