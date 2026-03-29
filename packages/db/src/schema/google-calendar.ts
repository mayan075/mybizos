import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull().default("primary"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    lastSyncAt: timestamp("last_sync_at"),
    syncEnabled: boolean("sync_enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("gcal_connections_org_id_idx").on(table.orgId),
    unique("gcal_connections_org_user_unique").on(table.orgId, table.userId),
    index("gcal_connections_sync_enabled_idx").on(table.syncEnabled),
  ],
);

export const googleCalendarBusyBlocks = pgTable(
  "google_calendar_busy_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    summary: text("summary"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("gcal_busy_blocks_org_user_time_idx").on(
      table.orgId,
      table.userId,
      table.startTime,
    ),
    unique("gcal_busy_blocks_event_id_unique").on(table.googleEventId),
  ],
);
