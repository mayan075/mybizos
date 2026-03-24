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
import { users } from "./auth";

export const verticalEnum = pgEnum("vertical", [
  "rubbish_removals",
  "moving_company",
  "plumbing",
  "hvac",
  "electrical",
  "roofing",
  "landscaping",
  "pest_control",
  "cleaning",
  "general_contractor",
]);

export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "owner",
  "admin",
  "manager",
  "member",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    vertical: verticalEnum("vertical").notNull(),
    timezone: text("timezone").notNull().default("America/New_York"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    logoUrl: text("logo_url"),
    settings: jsonb("settings").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("organizations_slug_idx").on(table.slug),
  ],
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgMemberRoleEnum("role").notNull().default("member"),
    isActive: boolean("is_active").default(true).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("org_members_org_id_idx").on(table.orgId),
    index("org_members_user_id_idx").on(table.userId),
    index("org_members_org_user_idx").on(table.orgId, table.userId),
  ],
);
