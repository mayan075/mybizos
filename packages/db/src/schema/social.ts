import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const socialPlatformEnum = pgEnum("social_platform", [
  "facebook",
  "instagram",
  "google_business",
  "linkedin",
  "nextdoor",
]);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    accountName: text("account_name").notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    platformPageId: text("platform_page_id"),
    isActive: boolean("is_active").default(true).notNull(),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("social_accounts_org_id_idx").on(table.orgId),
    index("social_accounts_org_platform_idx").on(table.orgId, table.platform),
  ],
);

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
