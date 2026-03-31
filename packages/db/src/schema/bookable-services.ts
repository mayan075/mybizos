import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const bookableServices = pgTable(
  "bookable_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    qualifyingQuestions: jsonb("qualifying_questions").notNull().default([]),
    pricingMode: text("pricing_mode").notNull().default("range"),
    pricingUnit: text("pricing_unit").notNull().default("job"),
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("bookable_services_org_id_idx").on(table.orgId),
    index("bookable_services_org_active_idx").on(table.orgId, table.isActive),
  ],
);

export const serviceTeamMembers = pgTable(
  "service_team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookableServices.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_team_members_org_id_idx").on(table.orgId),
    index("service_team_members_org_user_idx").on(table.orgId, table.userId),
    unique("service_team_members_service_user_unique").on(
      table.serviceId,
      table.userId,
    ),
  ],
);
