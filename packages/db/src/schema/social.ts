import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    platforms: jsonb("platforms").notNull().default([]),
    status: text("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    imageUrl: text("image_url"),
    metrics: jsonb("metrics").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("social_posts_org_id_idx").on(table.orgId),
    index("social_posts_org_status_idx").on(table.orgId, table.status),
    index("social_posts_org_scheduled_idx").on(table.orgId, table.scheduledAt),
  ],
);
