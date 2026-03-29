# AI Calendar Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect AI conversations to the calendar so the AI can check availability and book appointments across all channels (webchat, SMS, WhatsApp, email, call, internal assistant).

**Architecture:** Claude tool-use powers a channel-agnostic AI booking layer. Six tools (check_availability, propose_booking, confirm_booking, reschedule_appointment, cancel_appointment, add_to_waitlist) are defined as Anthropic function schemas and executed server-side against the existing scheduling service. Bidirectional Google Calendar sync keeps local DB and Google in lock-step. New `bookable_services`, `service_team_members`, `waitlist`, `google_calendar_connections`, and `google_calendar_busy_blocks` tables support the feature.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, PostgreSQL, `@anthropic-ai/sdk` (tool use), `googleapis` (Google Calendar), node-cron, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-ai-calendar-booking-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/db/src/schema/bookable-services.ts` | `bookable_services` + `service_team_members` tables |
| `packages/db/src/schema/waitlist.ts` | `waitlist` table + enum |
| `packages/db/src/schema/google-calendar.ts` | `google_calendar_connections` + `google_calendar_busy_blocks` tables |
| `apps/api/src/services/bookable-service-service.ts` | CRUD for bookable services and team member assignments |
| `apps/api/src/services/waitlist-service.ts` | Waitlist CRUD and notification |
| `apps/api/src/services/google-calendar-sync-service.ts` | Bidirectional Google Calendar sync |
| `apps/api/src/services/ai-booking-tools.ts` | Claude tool schemas + execution functions |
| `apps/api/src/services/ai-booking-handler.ts` | Channel-agnostic AI booking orchestrator |
| `apps/api/src/routes/bookable-services.ts` | REST routes for bookable services admin |
| `apps/api/src/routes/waitlist.ts` | REST routes for waitlist admin |
| `apps/api/src/routes/webhooks/google-calendar.ts` | Google Calendar push notification webhook |
| `apps/api/src/jobs/google-calendar-sync.ts` | Cron job for polling fallback |
| `apps/api/src/__tests__/ai-booking-tools.test.ts` | Tests for tool execution logic |
| `apps/api/src/__tests__/bookable-services.test.ts` | Tests for bookable services CRUD |

### Modified Files

| File | Changes |
|------|---------|
| `packages/db/src/index.ts` | Export new schema modules |
| `packages/db/src/schema/scheduling.ts` | Add `serviceId`, `bookedVia`, `googleCalendarSyncStatus` columns + enums |
| `apps/api/src/services/platform-assistant-service.ts` | Add tool-use to Claude calls, extend system prompt with booking context |
| `apps/api/src/services/scheduling-service.ts` | Add `getAvailabilityForAI()`, accept `serviceId`/`bookedVia` on create |
| `apps/api/src/config.ts` | Add `GOOGLE_CALENDAR_WEBHOOK_URL` env var |
| `apps/api/src/index.ts` | Mount new routes |
| `apps/api/src/scheduler.ts` | Register Google Calendar sync cron job |

---

## Task 1: Database Schema — Bookable Services + Service Team Members

**Files:**
- Create: `packages/db/src/schema/bookable-services.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create the bookable services schema file**

```typescript
// packages/db/src/schema/bookable-services.ts
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
```

- [ ] **Step 2: Add export to `packages/db/src/index.ts`**

Add this line after the existing schema exports:

```typescript
export * from "./schema/bookable-services.js";
```

- [ ] **Step 3: Run typecheck to verify**

Run: `cd mybizos && pnpm --filter @hararai/db typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/bookable-services.ts packages/db/src/index.ts
git commit -m "feat(db): add bookable_services and service_team_members tables"
```

---

## Task 2: Database Schema — Waitlist

**Files:**
- Create: `packages/db/src/schema/waitlist.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create the waitlist schema file**

```typescript
// packages/db/src/schema/waitlist.ts
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
```

- [ ] **Step 2: Add export to `packages/db/src/index.ts`**

```typescript
export * from "./schema/waitlist.js";
```

- [ ] **Step 3: Run typecheck**

Run: `cd mybizos && pnpm --filter @hararai/db typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/waitlist.ts packages/db/src/index.ts
git commit -m "feat(db): add waitlist table with status enum"
```

---

## Task 3: Database Schema — Google Calendar Connections + Busy Blocks

**Files:**
- Create: `packages/db/src/schema/google-calendar.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create the Google Calendar schema file**

```typescript
// packages/db/src/schema/google-calendar.ts
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
```

- [ ] **Step 2: Add export to `packages/db/src/index.ts`**

```typescript
export * from "./schema/google-calendar.js";
```

- [ ] **Step 3: Run typecheck**

Run: `cd mybizos && pnpm --filter @hararai/db typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/google-calendar.ts packages/db/src/index.ts
git commit -m "feat(db): add google_calendar_connections and busy_blocks tables"
```

---

## Task 4: Database Schema — Extend Appointments Table

**Files:**
- Modify: `packages/db/src/schema/scheduling.ts`

- [ ] **Step 1: Add new enums and columns to `packages/db/src/schema/scheduling.ts`**

Add these imports at the top (alongside existing imports):

```typescript
import { bookableServices } from "./bookable-services";
```

Add these enums after the existing `dayOfWeekEnum`:

```typescript
export const bookedViaEnum = pgEnum("booked_via", [
  "ai_webchat",
  "ai_sms",
  "ai_whatsapp",
  "ai_email",
  "ai_call",
  "manual",
  "public_form",
]);

export const googleCalendarSyncStatusEnum = pgEnum("google_calendar_sync_status", [
  "pending",
  "synced",
  "failed",
]);
```

Add these columns to the `appointments` table definition, after `googleEventId`:

```typescript
    serviceId: uuid("service_id").references(() => bookableServices.id, {
      onDelete: "set null",
    }),
    bookedVia: bookedViaEnum("booked_via"),
    googleCalendarSyncStatus: googleCalendarSyncStatusEnum(
      "google_calendar_sync_status",
    ).default("pending"),
```

- [ ] **Step 2: Run typecheck**

Run: `cd mybizos && pnpm --filter @hararai/db typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/scheduling.ts
git commit -m "feat(db): add serviceId, bookedVia, googleCalendarSyncStatus to appointments"
```

---

## Task 5: Generate and Run Database Migration

**Files:**
- Generated migration files in `packages/db/drizzle/`

- [ ] **Step 1: Generate the migration**

Run: `cd mybizos/packages/db && pnpm db:generate`
Expected: A new migration file created in `packages/db/drizzle/` containing CREATE TABLE statements for the 5 new tables and ALTER TABLE for appointments.

- [ ] **Step 2: Review the generated migration**

Open the generated SQL file and verify it contains:
- `CREATE TABLE bookable_services`
- `CREATE TABLE service_team_members`
- `CREATE TABLE waitlist` + `CREATE TYPE waitlist_status`
- `CREATE TABLE google_calendar_connections`
- `CREATE TABLE google_calendar_busy_blocks`
- `ALTER TABLE appointments ADD COLUMN service_id`
- `ALTER TABLE appointments ADD COLUMN booked_via` + `CREATE TYPE booked_via`
- `ALTER TABLE appointments ADD COLUMN google_calendar_sync_status` + `CREATE TYPE google_calendar_sync_status`
- All indexes and foreign keys

- [ ] **Step 3: Run the migration (if DATABASE_URL is configured)**

Run: `cd mybizos/packages/db && pnpm db:push`
Expected: Schema applied to the database. If DATABASE_URL is not configured, skip this and note it needs to be run later.

- [ ] **Step 4: Commit**

```bash
git add packages/db/drizzle/
git commit -m "feat(db): add migration for AI calendar booking schema"
```

---

## Task 6: Bookable Services Service

**Files:**
- Create: `apps/api/src/services/bookable-service-service.ts`

- [ ] **Step 1: Write the test file**

Create `apps/api/src/__tests__/bookable-services.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the service logic by validating the function signatures and return types.
// Full integration tests require a database connection.

describe("bookableServiceService", () => {
  it("should export list, create, update, delete, addTeamMember, removeTeamMember", async () => {
    const { bookableServiceService } = await import(
      "../services/bookable-service-service.js"
    );
    expect(bookableServiceService.list).toBeTypeOf("function");
    expect(bookableServiceService.create).toBeTypeOf("function");
    expect(bookableServiceService.update).toBeTypeOf("function");
    expect(bookableServiceService.remove).toBeTypeOf("function");
    expect(bookableServiceService.addTeamMember).toBeTypeOf("function");
    expect(bookableServiceService.removeTeamMember).toBeTypeOf("function");
    expect(bookableServiceService.getWithTeamMembers).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mybizos && pnpm --filter api test -- src/__tests__/bookable-services.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the bookable service service**

```typescript
// apps/api/src/services/bookable-service-service.ts
import {
  db,
  bookableServices,
  serviceTeamMembers,
  users,
  withOrgScope,
} from "@hararai/db";
import { eq, and } from "drizzle-orm";
import { Errors } from "../middleware/error-handler.js";
import { logger } from "../middleware/logger.js";

export const bookableServiceService = {
  async list(orgId: string) {
    return db
      .select()
      .from(bookableServices)
      .where(withOrgScope(bookableServices.orgId, orgId))
      .orderBy(bookableServices.name);
  },

  async getWithTeamMembers(orgId: string, serviceId: string) {
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, serviceId),
        ),
      );

    if (!service) {
      throw Errors.notFound("Bookable service");
    }

    const teamMembers = await db
      .select({
        id: serviceTeamMembers.id,
        userId: serviceTeamMembers.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(serviceTeamMembers)
      .innerJoin(users, eq(serviceTeamMembers.userId, users.id))
      .where(
        and(
          withOrgScope(serviceTeamMembers.orgId, orgId),
          eq(serviceTeamMembers.serviceId, serviceId),
        ),
      );

    return { ...service, teamMembers };
  },

  async create(
    orgId: string,
    data: {
      name: string;
      description?: string | null;
      durationMinutes?: number;
      bufferMinutes?: number;
      qualifyingQuestions?: string[];
      isActive?: boolean;
    },
  ) {
    const [created] = await db
      .insert(bookableServices)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        durationMinutes: data.durationMinutes ?? 60,
        bufferMinutes: data.bufferMinutes ?? 0,
        qualifyingQuestions: data.qualifyingQuestions ?? [],
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw Errors.internal("Failed to create bookable service");
    }

    logger.info("Bookable service created", { orgId, serviceId: created.id });
    return created;
  },

  async update(
    orgId: string,
    serviceId: string,
    data: {
      name?: string;
      description?: string | null;
      durationMinutes?: number;
      bufferMinutes?: number;
      qualifyingQuestions?: string[];
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(bookableServices)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, serviceId),
        ),
      )
      .returning();

    if (!updated) {
      throw Errors.notFound("Bookable service");
    }

    logger.info("Bookable service updated", { orgId, serviceId });
    return updated;
  },

  async remove(orgId: string, serviceId: string) {
    const [deleted] = await db
      .delete(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, serviceId),
        ),
      )
      .returning();

    if (!deleted) {
      throw Errors.notFound("Bookable service");
    }

    logger.info("Bookable service deleted", { orgId, serviceId });
    return deleted;
  },

  async addTeamMember(orgId: string, serviceId: string, userId: string) {
    // Verify service exists
    const [service] = await db
      .select({ id: bookableServices.id })
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, serviceId),
        ),
      );

    if (!service) {
      throw Errors.notFound("Bookable service");
    }

    const [created] = await db
      .insert(serviceTeamMembers)
      .values({ orgId, serviceId, userId })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      // Already exists — not an error, just return
      return { alreadyAssigned: true };
    }

    logger.info("Team member added to service", { orgId, serviceId, userId });
    return created;
  },

  async removeTeamMember(orgId: string, serviceId: string, userId: string) {
    const [deleted] = await db
      .delete(serviceTeamMembers)
      .where(
        and(
          withOrgScope(serviceTeamMembers.orgId, orgId),
          eq(serviceTeamMembers.serviceId, serviceId),
          eq(serviceTeamMembers.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      throw Errors.notFound("Team member assignment");
    }

    logger.info("Team member removed from service", {
      orgId,
      serviceId,
      userId,
    });
    return deleted;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mybizos && pnpm --filter api test -- src/__tests__/bookable-services.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/bookable-service-service.ts apps/api/src/__tests__/bookable-services.test.ts
git commit -m "feat(api): add bookable service CRUD service with tests"
```

---

## Task 7: Bookable Services REST Routes

**Files:**
- Create: `apps/api/src/routes/bookable-services.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the routes file**

```typescript
// apps/api/src/routes/bookable-services.ts
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { orgScopeMiddleware } from "../middleware/org-scope.js";
import { bookableServiceService } from "../services/bookable-service-service.js";
import { logger } from "../middleware/logger.js";

const router = new Hono();

router.use("*", authMiddleware, orgScopeMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  qualifyingQuestions: z.array(z.string().max(500)).max(10).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});

// GET /orgs/:orgId/bookable-services
router.get("/", async (c) => {
  const orgId = c.get("orgId");
  const services = await bookableServiceService.list(orgId);
  return c.json({ services });
});

// GET /orgs/:orgId/bookable-services/:id
router.get("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const service = await bookableServiceService.getWithTeamMembers(orgId, id);
  return c.json({ service });
});

// POST /orgs/:orgId/bookable-services
router.post("/", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        status: 400,
        details: parsed.error.issues,
      },
      400,
    );
  }

  const service = await bookableServiceService.create(orgId, parsed.data);
  return c.json({ service }, 201);
});

// PATCH /orgs/:orgId/bookable-services/:id
router.patch("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        status: 400,
        details: parsed.error.issues,
      },
      400,
    );
  }

  const service = await bookableServiceService.update(orgId, id, parsed.data);
  return c.json({ service });
});

// DELETE /orgs/:orgId/bookable-services/:id
router.delete("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  await bookableServiceService.remove(orgId, id);
  return c.json({ deleted: true });
});

// POST /orgs/:orgId/bookable-services/:id/team-members
router.post("/:id/team-members", async (c) => {
  const orgId = c.get("orgId");
  const serviceId = c.req.param("id");
  const body = await c.req.json();
  const parsed = addTeamMemberSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        status: 400,
        details: parsed.error.issues,
      },
      400,
    );
  }

  const result = await bookableServiceService.addTeamMember(
    orgId,
    serviceId,
    parsed.data.userId,
  );
  return c.json(result, 201);
});

// DELETE /orgs/:orgId/bookable-services/:id/team-members/:userId
router.delete("/:id/team-members/:userId", async (c) => {
  const orgId = c.get("orgId");
  const serviceId = c.req.param("id");
  const userId = c.req.param("userId");
  await bookableServiceService.removeTeamMember(orgId, serviceId, userId);
  return c.json({ deleted: true });
});

export { router as bookableServiceRoutes };
```

- [ ] **Step 2: Mount routes in `apps/api/src/index.ts`**

Add import at top with the other route imports:

```typescript
import { bookableServiceRoutes } from './routes/bookable-services.js';
```

Add route mounting after the existing `schedulingRoutes` line (around line 162):

```typescript
app.route('/orgs/:orgId/bookable-services', bookableServiceRoutes);
```

- [ ] **Step 3: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/bookable-services.ts apps/api/src/index.ts
git commit -m "feat(api): add bookable services REST routes"
```

---

## Task 8: Waitlist Service + Routes

**Files:**
- Create: `apps/api/src/services/waitlist-service.ts`
- Create: `apps/api/src/routes/waitlist.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the waitlist service**

```typescript
// apps/api/src/services/waitlist-service.ts
import { db, waitlist, contacts, bookableServices, withOrgScope } from "@hararai/db";
import { eq, and, desc } from "drizzle-orm";
import { Errors } from "../middleware/error-handler.js";
import { logger } from "../middleware/logger.js";

export const waitlistService = {
  async list(
    orgId: string,
    filters?: { status?: typeof waitlist.status.enumValues[number] },
  ) {
    const conditions = [withOrgScope(waitlist.orgId, orgId)];
    if (filters?.status) {
      conditions.push(eq(waitlist.status, filters.status));
    }

    return db
      .select({
        waitlistEntry: waitlist,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,
        serviceName: bookableServices.name,
      })
      .from(waitlist)
      .leftJoin(contacts, eq(waitlist.contactId, contacts.id))
      .leftJoin(bookableServices, eq(waitlist.serviceId, bookableServices.id))
      .where(and(...conditions))
      .orderBy(desc(waitlist.createdAt));
  },

  async create(
    orgId: string,
    data: {
      contactId: string;
      serviceId?: string | null;
      preferredDateRange?: { start: string; end: string } | null;
      preferredTimeOfDay?: string | null;
      notes?: string | null;
    },
  ) {
    const [created] = await db
      .insert(waitlist)
      .values({
        orgId,
        contactId: data.contactId,
        serviceId: data.serviceId ?? null,
        preferredDateRange: data.preferredDateRange ?? null,
        preferredTimeOfDay: data.preferredTimeOfDay ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    if (!created) {
      throw Errors.internal("Failed to create waitlist entry");
    }

    logger.info("Waitlist entry created", { orgId, waitlistId: created.id });
    return created;
  },

  async updateStatus(
    orgId: string,
    waitlistId: string,
    status: typeof waitlist.status.enumValues[number],
  ) {
    const [updated] = await db
      .update(waitlist)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          withOrgScope(waitlist.orgId, orgId),
          eq(waitlist.id, waitlistId),
        ),
      )
      .returning();

    if (!updated) {
      throw Errors.notFound("Waitlist entry");
    }

    logger.info("Waitlist entry updated", { orgId, waitlistId, status });
    return updated;
  },

  async remove(orgId: string, waitlistId: string) {
    const [deleted] = await db
      .delete(waitlist)
      .where(
        and(
          withOrgScope(waitlist.orgId, orgId),
          eq(waitlist.id, waitlistId),
        ),
      )
      .returning();

    if (!deleted) {
      throw Errors.notFound("Waitlist entry");
    }

    logger.info("Waitlist entry deleted", { orgId, waitlistId });
    return deleted;
  },
};
```

- [ ] **Step 2: Create the waitlist routes**

```typescript
// apps/api/src/routes/waitlist.ts
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { orgScopeMiddleware } from "../middleware/org-scope.js";
import { waitlistService } from "../services/waitlist-service.js";

const router = new Hono();

router.use("*", authMiddleware, orgScopeMiddleware);

// GET /orgs/:orgId/waitlist
router.get("/", async (c) => {
  const orgId = c.get("orgId");
  const status = c.req.query("status") as
    | typeof import("@hararai/db").waitlist.status.enumValues[number]
    | undefined;
  const entries = await waitlistService.list(orgId, { status });
  return c.json({ entries });
});

// PATCH /orgs/:orgId/waitlist/:id
router.patch("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = z
    .object({
      status: z.enum(["pending", "notified", "booked", "expired"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", status: 400 },
      400,
    );
  }

  const entry = await waitlistService.updateStatus(orgId, id, parsed.data.status);
  return c.json({ entry });
});

// DELETE /orgs/:orgId/waitlist/:id
router.delete("/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  await waitlistService.remove(orgId, id);
  return c.json({ deleted: true });
});

export { router as waitlistRoutes };
```

- [ ] **Step 3: Mount routes in `apps/api/src/index.ts`**

Add import:

```typescript
import { waitlistRoutes } from './routes/waitlist.js';
```

Add route:

```typescript
app.route('/orgs/:orgId/waitlist', waitlistRoutes);
```

- [ ] **Step 4: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/waitlist-service.ts apps/api/src/routes/waitlist.ts apps/api/src/index.ts
git commit -m "feat(api): add waitlist service and REST routes"
```

---

## Task 9: Extend Scheduling Service for AI Availability

**Files:**
- Modify: `apps/api/src/services/scheduling-service.ts`

- [ ] **Step 1: Add `getAvailabilityForAI` method**

This method differs from the existing `getAvailability` by:
- Accepting multiple user IDs (all team members for a service)
- Spanning multiple days
- Accounting for Google Calendar busy blocks
- Including service buffer time

Add these imports at the top of `scheduling-service.ts`:

```typescript
import {
  db,
  appointments,
  availabilityRules,
  contacts,
  organizations,
  bookableServices,
  serviceTeamMembers,
  users,
  googleCalendarBusyBlocks,
  withOrgScope,
} from "@hararai/db";
```

Add this method to the `schedulingService` object, after the existing `getAvailability` method:

```typescript
  async getAvailabilityForAI(
    orgId: string,
    params: {
      serviceId: string;
      startDate: string; // ISO date "2026-04-01"
      endDate: string;   // ISO date "2026-04-03"
      preferredTimeOfDay?: "morning" | "afternoon" | "evening";
    },
  ) {
    // 1. Get the service
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, params.serviceId),
          eq(bookableServices.isActive, true),
        ),
      );

    if (!service) {
      return { service: null, slots: [], totalAvailable: 0 };
    }

    const slotDuration = service.durationMinutes;
    const buffer = service.bufferMinutes;

    // 2. Get team members for this service
    const teamMembers = await db
      .select({
        userId: serviceTeamMembers.userId,
        userName: users.name,
      })
      .from(serviceTeamMembers)
      .innerJoin(users, eq(serviceTeamMembers.userId, users.id))
      .where(
        and(
          withOrgScope(serviceTeamMembers.orgId, orgId),
          eq(serviceTeamMembers.serviceId, params.serviceId),
        ),
      );

    if (teamMembers.length === 0) {
      return {
        service: { id: service.id, name: service.name, durationMinutes: slotDuration },
        slots: [],
        totalAvailable: 0,
      };
    }

    // 3. Generate date range
    const dates: string[] = [];
    const current = new Date(params.startDate);
    const end = new Date(params.endDate);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]!);
      current.setDate(current.getDate() + 1);
    }

    // 4. For each team member, for each date, compute available slots
    const allSlots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      teamMemberId: string;
      teamMemberName: string;
    }> = [];

    const days = [
      "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    ] as const;

    for (const member of teamMembers) {
      // Get all availability rules for this user
      const rules = await db
        .select()
        .from(availabilityRules)
        .where(
          and(
            withOrgScope(availabilityRules.orgId, orgId),
            eq(availabilityRules.userId, member.userId),
            eq(availabilityRules.isActive, true),
          ),
        );

      // Get all existing appointments for this user in the date range
      const rangeStart = new Date(`${params.startDate}T00:00:00Z`);
      const rangeEnd = new Date(`${params.endDate}T23:59:59Z`);

      const existingAppts = await db
        .select({ startTime: appointments.startTime, endTime: appointments.endTime })
        .from(appointments)
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.assignedTo, member.userId),
            gte(appointments.startTime, rangeStart),
            lte(appointments.startTime, rangeEnd),
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
          ),
        );

      // Get Google Calendar busy blocks for this user
      const busyBlocks = await db
        .select({ startTime: googleCalendarBusyBlocks.startTime, endTime: googleCalendarBusyBlocks.endTime })
        .from(googleCalendarBusyBlocks)
        .where(
          and(
            withOrgScope(googleCalendarBusyBlocks.orgId, orgId),
            eq(googleCalendarBusyBlocks.userId, member.userId),
            gte(googleCalendarBusyBlocks.startTime, rangeStart),
            lte(googleCalendarBusyBlocks.startTime, rangeEnd),
          ),
        );

      // Combine all busy times
      const busyTimes = [
        ...existingAppts.map((a) => ({ start: a.startTime, end: a.endTime })),
        ...busyBlocks.map((b) => ({ start: b.startTime, end: b.endTime })),
      ];

      for (const date of dates) {
        const dateObj = new Date(date);
        const dayOfWeek = days[dateObj.getUTCDay()];
        if (!dayOfWeek) continue;

        const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

        for (const rule of dayRules) {
          const [startH, startM] = rule.startTime.split(":").map(Number) as [number, number];
          const [endH, endM] = rule.endTime.split(":").map(Number) as [number, number];

          const ruleStartMin = startH * 60 + startM;
          const ruleEndMin = endH * 60 + endM;

          for (
            let slotStart = ruleStartMin;
            slotStart + slotDuration <= ruleEndMin;
            slotStart += slotDuration + buffer
          ) {
            const slotEnd = slotStart + slotDuration;

            const slotStartStr = `${date}T${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}:00`;
            const slotEndStr = `${date}T${String(Math.floor(slotEnd / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}:00`;

            const slotStartDate = new Date(slotStartStr + "Z");
            const slotEndDate = new Date(slotEndStr + "Z");

            // Skip past slots
            if (slotStartDate <= new Date()) continue;

            // Check for conflicts with busy times
            const hasConflict = busyTimes.some(
              (busy) => busy.start < slotEndDate && busy.end > slotStartDate,
            );

            if (!hasConflict) {
              allSlots.push({
                date,
                startTime: slotStartStr,
                endTime: slotEndStr,
                teamMemberId: member.userId,
                teamMemberName: member.userName ?? "Team Member",
              });
            }
          }
        }
      }
    }

    // 5. Filter by preferred time of day
    let filteredSlots = allSlots;
    if (params.preferredTimeOfDay) {
      const timeRanges = {
        morning: { min: 0, max: 12 * 60 },
        afternoon: { min: 12 * 60, max: 17 * 60 },
        evening: { min: 17 * 60, max: 24 * 60 },
      };
      const range = timeRanges[params.preferredTimeOfDay];
      filteredSlots = allSlots.filter((slot) => {
        const [h, m] = slot.startTime.split("T")[1]!.split(":").map(Number) as [number, number];
        const mins = h * 60 + m;
        return mins >= range.min && mins < range.max;
      });
    }

    // Sort by date, then time
    filteredSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      service: { id: service.id, name: service.name, durationMinutes: slotDuration },
      slots: filteredSlots,
      totalAvailable: filteredSlots.length,
    };
  },
```

- [ ] **Step 2: Update `createAppointment` to accept `serviceId` and `bookedVia`**

In the `createAppointment` method's `data` parameter type, add:

```typescript
      serviceId?: string | null;
      bookedVia?: typeof appointments.bookedVia.enumValues[number] | null;
```

And in the `db.insert(appointments).values()` call, add:

```typescript
        serviceId: data.serviceId ?? null,
        bookedVia: data.bookedVia ?? null,
```

- [ ] **Step 3: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/scheduling-service.ts
git commit -m "feat(api): add getAvailabilityForAI and extend createAppointment for AI booking"
```

---

## Task 10: Google Calendar Sync Service

**Files:**
- Create: `apps/api/src/services/google-calendar-sync-service.ts`

- [ ] **Step 1: Create the sync service**

```typescript
// apps/api/src/services/google-calendar-sync-service.ts
import {
  db,
  googleCalendarConnections,
  googleCalendarBusyBlocks,
  appointments,
  withOrgScope,
} from "@hararai/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { GoogleCalendarClient } from "@hararai/integrations/google-calendar";
import { config } from "../config.js";
import { logger } from "../middleware/logger.js";

function getCalendarClient(): GoogleCalendarClient {
  return new GoogleCalendarClient({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: `${config.APP_URL}/integrations/oauth/callback`,
  });
}

async function getValidAccessToken(
  connection: typeof googleCalendarConnections.$inferSelect,
): Promise<string | null> {
  // If token is still valid, return it
  if (connection.expiresAt > new Date()) {
    return connection.accessToken;
  }

  // Refresh the token
  try {
    const client = getCalendarClient();
    const tokens = await client.refreshAccessToken(connection.refreshToken);

    await db
      .update(googleCalendarConnections)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, connection.id));

    return tokens.accessToken;
  } catch (err) {
    logger.error("Failed to refresh Google Calendar token", {
      connectionId: connection.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export const googleCalendarSyncService = {
  /**
   * Push a new appointment to Google Calendar.
   * Returns the Google Event ID or null on failure.
   */
  async pushAppointmentToGoogle(
    appointmentId: string,
    orgId: string,
    assignedTo: string,
    eventData: {
      title: string;
      description?: string;
      location?: string;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<string | null> {
    const [connection] = await db
      .select()
      .from(googleCalendarConnections)
      .where(
        and(
          withOrgScope(googleCalendarConnections.orgId, orgId),
          eq(googleCalendarConnections.userId, assignedTo),
          eq(googleCalendarConnections.syncEnabled, true),
        ),
      );

    if (!connection) return null;

    const accessToken = await getValidAccessToken(connection);
    if (!accessToken) {
      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: "failed" })
        .where(eq(appointments.id, appointmentId));
      return null;
    }

    try {
      const client = getCalendarClient();
      const result = await client.createEvent(
        accessToken,
        connection.calendarId,
        {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
        },
      );

      // Store the Google Event ID and mark as synced
      await db
        .update(appointments)
        .set({
          googleEventId: result.id,
          googleCalendarSyncStatus: "synced",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointmentId));

      logger.info("Appointment pushed to Google Calendar", {
        appointmentId,
        googleEventId: result.id,
      });

      return result.id;
    } catch (err) {
      logger.error("Failed to push appointment to Google Calendar", {
        appointmentId,
        error: err instanceof Error ? err.message : String(err),
      });

      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: "failed" })
        .where(eq(appointments.id, appointmentId));

      return null;
    }
  },

  /**
   * Update an existing Google Calendar event when an appointment changes.
   */
  async updateGoogleEvent(
    appointmentId: string,
    orgId: string,
    assignedTo: string,
    googleEventId: string,
    updates: {
      title?: string;
      description?: string;
      location?: string;
      startTime?: Date;
      endTime?: Date;
    },
  ): Promise<boolean> {
    const [connection] = await db
      .select()
      .from(googleCalendarConnections)
      .where(
        and(
          withOrgScope(googleCalendarConnections.orgId, orgId),
          eq(googleCalendarConnections.userId, assignedTo),
          eq(googleCalendarConnections.syncEnabled, true),
        ),
      );

    if (!connection) return false;

    const accessToken = await getValidAccessToken(connection);
    if (!accessToken) return false;

    try {
      const client = getCalendarClient();
      await client.updateEvent(
        accessToken,
        connection.calendarId,
        googleEventId,
        {
          summary: updates.title,
          description: updates.description,
          location: updates.location,
          startTime: updates.startTime,
          endTime: updates.endTime,
        },
      );

      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: "synced", updatedAt: new Date() })
        .where(eq(appointments.id, appointmentId));

      return true;
    } catch (err) {
      logger.error("Failed to update Google Calendar event", {
        appointmentId,
        googleEventId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  /**
   * Delete a Google Calendar event when an appointment is cancelled.
   */
  async deleteGoogleEvent(
    orgId: string,
    assignedTo: string,
    googleEventId: string,
  ): Promise<boolean> {
    const [connection] = await db
      .select()
      .from(googleCalendarConnections)
      .where(
        and(
          withOrgScope(googleCalendarConnections.orgId, orgId),
          eq(googleCalendarConnections.userId, assignedTo),
          eq(googleCalendarConnections.syncEnabled, true),
        ),
      );

    if (!connection) return false;

    const accessToken = await getValidAccessToken(connection);
    if (!accessToken) return false;

    try {
      const client = getCalendarClient();
      await client.deleteEvent(accessToken, connection.calendarId, googleEventId);
      return true;
    } catch (err) {
      logger.error("Failed to delete Google Calendar event", {
        googleEventId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  /**
   * Sync inbound: pull Google Calendar events and update busy blocks.
   * Called by the polling cron job and webhook handler.
   */
  async syncBusyBlocks(orgId: string, userId: string): Promise<number> {
    const [connection] = await db
      .select()
      .from(googleCalendarConnections)
      .where(
        and(
          withOrgScope(googleCalendarConnections.orgId, orgId),
          eq(googleCalendarConnections.userId, userId),
          eq(googleCalendarConnections.syncEnabled, true),
        ),
      );

    if (!connection) return 0;

    const accessToken = await getValidAccessToken(connection);
    if (!accessToken) return 0;

    try {
      const client = getCalendarClient();
      const now = new Date();
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const result = await client.listEvents(
        accessToken,
        connection.calendarId,
        now,
        twoWeeksFromNow,
      );

      // Get existing HararAI appointment Google Event IDs to exclude them
      const hararaiEventIds = await db
        .select({ googleEventId: appointments.googleEventId })
        .from(appointments)
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            sql`${appointments.googleEventId} IS NOT NULL`,
          ),
        );

      const hararaiEventIdSet = new Set(
        hararaiEventIds.map((r) => r.googleEventId).filter(Boolean),
      );

      // Delete all existing busy blocks for this user (full refresh)
      await db
        .delete(googleCalendarBusyBlocks)
        .where(
          and(
            withOrgScope(googleCalendarBusyBlocks.orgId, orgId),
            eq(googleCalendarBusyBlocks.userId, userId),
          ),
        );

      // Insert external events as busy blocks
      const externalEvents = result.events.filter(
        (e) => e.id && !hararaiEventIdSet.has(e.id) && e.start && e.end,
      );

      if (externalEvents.length > 0) {
        await db.insert(googleCalendarBusyBlocks).values(
          externalEvents.map((e) => ({
            orgId,
            userId,
            googleEventId: e.id,
            summary: e.summary || null,
            startTime: new Date(e.start),
            endTime: new Date(e.end),
          })),
        );
      }

      // Update last sync time
      await db
        .update(googleCalendarConnections)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(googleCalendarConnections.id, connection.id));

      logger.info("Google Calendar busy blocks synced", {
        orgId,
        userId,
        blocksCount: externalEvents.length,
      });

      return externalEvents.length;
    } catch (err) {
      logger.error("Failed to sync Google Calendar busy blocks", {
        orgId,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  },

  /**
   * Sync all connected users' calendars. Called by the cron job.
   */
  async syncAll(): Promise<void> {
    const connections = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.syncEnabled, true));

    logger.info(`[GCal Sync] Syncing ${connections.length} connections`);

    for (const conn of connections) {
      await this.syncBusyBlocks(conn.orgId, conn.userId);
    }
  },
};
```

- [ ] **Step 2: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors (may need to adjust import path for `@hararai/integrations/google-calendar` — check the actual export path in `packages/integrations/package.json`)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/google-calendar-sync-service.ts
git commit -m "feat(api): add Google Calendar bidirectional sync service"
```

---

## Task 11: Google Calendar Sync Cron Job + Webhook

**Files:**
- Create: `apps/api/src/jobs/google-calendar-sync.ts`
- Create: `apps/api/src/routes/webhooks/google-calendar.ts`
- Modify: `apps/api/src/scheduler.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the cron job**

```typescript
// apps/api/src/jobs/google-calendar-sync.ts
import { googleCalendarSyncService } from "../services/google-calendar-sync-service.js";
import { logger } from "../middleware/logger.js";

export async function runGoogleCalendarSync(): Promise<{ synced: boolean }> {
  try {
    await googleCalendarSyncService.syncAll();
    return { synced: true };
  } catch (err) {
    logger.error("[GCal Sync Job] Failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { synced: false };
  }
}
```

- [ ] **Step 2: Register in scheduler**

Add import to `apps/api/src/scheduler.ts`:

```typescript
import { runGoogleCalendarSync } from './jobs/google-calendar-sync.js';
```

Add to the `jobs` array:

```typescript
  {
    name: 'googleCalendarSync',
    cronExpression: '*/5 * * * *',   // Every 5 minutes
    handler: runGoogleCalendarSync,
    task: null,
  },
```

- [ ] **Step 3: Create the webhook route**

```typescript
// apps/api/src/routes/webhooks/google-calendar.ts
import { Hono } from "hono";
import { googleCalendarSyncService } from "../../services/google-calendar-sync-service.js";
import { logger } from "../../middleware/logger.js";
import { db, googleCalendarConnections } from "@hararai/db";
import { eq } from "drizzle-orm";

const router = new Hono();

/**
 * POST /webhooks/google-calendar
 *
 * Receives push notifications from Google Calendar API.
 * Google sends a POST with headers indicating which calendar changed.
 * We look up the user by channel token and trigger a sync.
 */
router.post("/", async (c) => {
  const channelToken = c.req.header("X-Goog-Channel-Token");
  const resourceState = c.req.header("X-Goog-Resource-State");

  // Sync notification (not the initial "sync" confirmation)
  if (resourceState === "sync") {
    return c.json({ ok: true });
  }

  if (!channelToken) {
    logger.warn("Google Calendar webhook received without channel token");
    return c.json({ ok: true });
  }

  // channelToken format: "orgId:userId"
  const [orgId, userId] = channelToken.split(":");

  if (!orgId || !userId) {
    logger.warn("Google Calendar webhook received with invalid channel token", {
      channelToken,
    });
    return c.json({ ok: true });
  }

  // Trigger async sync — don't block the webhook response
  googleCalendarSyncService.syncBusyBlocks(orgId, userId).catch((err) => {
    logger.error("Google Calendar webhook sync failed", {
      orgId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return c.json({ ok: true });
});

export { router as googleCalendarWebhookRoutes };
```

- [ ] **Step 4: Mount the webhook route in `apps/api/src/index.ts`**

Add import:

```typescript
import { googleCalendarWebhookRoutes } from './routes/webhooks/google-calendar.js';
```

Add route mounting alongside other webhook routes (after the stripe webhook line):

```typescript
app.route('/webhooks/google-calendar', googleCalendarWebhookRoutes);
```

- [ ] **Step 5: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/jobs/google-calendar-sync.ts apps/api/src/routes/webhooks/google-calendar.ts apps/api/src/scheduler.ts apps/api/src/index.ts
git commit -m "feat(api): add Google Calendar sync cron job and webhook handler"
```

---

## Task 12: AI Booking Tools — Tool Definitions + Execution

**Files:**
- Create: `apps/api/src/services/ai-booking-tools.ts`
- Create: `apps/api/src/__tests__/ai-booking-tools.test.ts`

This is the core of the feature — the six Claude tools that power AI booking.

- [ ] **Step 1: Write the test file**

```typescript
// apps/api/src/__tests__/ai-booking-tools.test.ts
import { describe, it, expect } from "vitest";

describe("AI Booking Tools", () => {
  it("should export BOOKING_TOOLS array with 6 tool definitions", async () => {
    const { BOOKING_TOOLS } = await import(
      "../services/ai-booking-tools.js"
    );
    expect(BOOKING_TOOLS).toHaveLength(6);

    const toolNames = BOOKING_TOOLS.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("check_availability");
    expect(toolNames).toContain("propose_booking");
    expect(toolNames).toContain("confirm_booking");
    expect(toolNames).toContain("reschedule_appointment");
    expect(toolNames).toContain("cancel_appointment");
    expect(toolNames).toContain("add_to_waitlist");
  });

  it("should export executeBookingTool function", async () => {
    const { executeBookingTool } = await import(
      "../services/ai-booking-tools.js"
    );
    expect(executeBookingTool).toBeTypeOf("function");
  });

  it("each tool should have name, description, and input_schema", async () => {
    const { BOOKING_TOOLS } = await import(
      "../services/ai-booking-tools.js"
    );
    for (const tool of BOOKING_TOOLS) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("input_schema");
      expect(tool.input_schema).toHaveProperty("type", "object");
      expect(tool.input_schema).toHaveProperty("properties");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mybizos && pnpm --filter api test -- src/__tests__/ai-booking-tools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the AI booking tools file**

```typescript
// apps/api/src/services/ai-booking-tools.ts
import type Anthropic from "@anthropic-ai/sdk";
import { schedulingService } from "./scheduling-service.js";
import { waitlistService } from "./waitlist-service.js";
import { googleCalendarSyncService } from "./google-calendar-sync-service.js";
import {
  db,
  appointments,
  bookableServices,
  contacts,
  waitlist,
  withOrgScope,
} from "@hararai/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { logger } from "../middleware/logger.js";

// ── Tool Definitions (Anthropic format) ──

export const BOOKING_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Check available appointment slots for a service within a date range. Returns open time slots with team member names. Use this when a customer asks about availability or wants to book an appointment.",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceName: {
          type: "string",
          description:
            "The name of the service to book (fuzzy match). Use this when the customer describes what they need.",
        },
        serviceId: {
          type: "string",
          description: "Direct service ID if known from a previous tool call.",
        },
        dateRange: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: 'Start date in ISO format, e.g. "2026-04-01"',
            },
            end: {
              type: "string",
              description: 'End date in ISO format, e.g. "2026-04-03"',
            },
          },
          required: ["start", "end"],
        },
        preferredTimeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "evening"],
          description: "Optional time preference.",
        },
      },
      required: ["dateRange"],
    },
  },
  {
    name: "propose_booking",
    description:
      "Propose a specific time slot to the customer for confirmation. ALWAYS use this before confirm_booking. Never book without the customer explicitly confirming.",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string", description: "The bookable service ID." },
        date: { type: "string", description: "ISO date string." },
        startTime: {
          type: "string",
          description: 'ISO datetime string, e.g. "2026-04-01T14:00:00"',
        },
        teamMemberId: { type: "string", description: "The team member's user ID." },
      },
      required: ["serviceId", "date", "startTime", "teamMemberId"],
    },
  },
  {
    name: "confirm_booking",
    description:
      "Create the appointment after the customer has explicitly confirmed. Only call this AFTER propose_booking and after the customer said yes.",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
        date: { type: "string" },
        startTime: { type: "string" },
        endTime: { type: "string" },
        teamMemberId: { type: "string" },
        notes: { type: "string", description: "Any notes from the conversation." },
      },
      required: ["serviceId", "date", "startTime", "endTime", "teamMemberId"],
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Reschedule an existing appointment to a new date/time. Checks availability at the new time first.",
    input_schema: {
      type: "object" as const,
      properties: {
        appointmentId: { type: "string" },
        newDate: { type: "string" },
        newStartTime: { type: "string" },
      },
      required: ["appointmentId", "newDate", "newStartTime"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing appointment.",
    input_schema: {
      type: "object" as const,
      properties: {
        appointmentId: { type: "string" },
        reason: { type: "string", description: "Optional cancellation reason." },
      },
      required: ["appointmentId"],
    },
  },
  {
    name: "add_to_waitlist",
    description:
      "Add the customer to the waitlist when no suitable appointment slots are available. Use this after offering alternatives that the customer declined.",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
        preferredDateRange: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" },
          },
        },
        preferredTimeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "evening"],
        },
        notes: { type: "string" },
      },
      required: [],
    },
  },
];

// ── Tool Execution ──

interface BookingContext {
  orgId: string;
  contactId: string;
  channel: string; // "webchat", "sms", "whatsapp", "email", "call"
}

export async function executeBookingTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  try {
    switch (toolName) {
      case "check_availability":
        return await handleCheckAvailability(toolInput, context);
      case "propose_booking":
        return await handleProposeBooking(toolInput, context);
      case "confirm_booking":
        return await handleConfirmBooking(toolInput, context);
      case "reschedule_appointment":
        return await handleRescheduleAppointment(toolInput, context);
      case "cancel_appointment":
        return await handleCancelAppointment(toolInput, context);
      case "add_to_waitlist":
        return await handleAddToWaitlist(toolInput, context);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    logger.error("Booking tool execution failed", {
      toolName,
      orgId: context.orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return JSON.stringify({
      error: err instanceof Error ? err.message : "An error occurred",
    });
  }
}

// ── Tool Handlers ──

async function resolveServiceId(
  orgId: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  if (typeof input.serviceId === "string") return input.serviceId;

  if (typeof input.serviceName === "string") {
    // Fuzzy match by name (case-insensitive LIKE)
    const [match] = await db
      .select({ id: bookableServices.id })
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.isActive, true),
          sql`LOWER(${bookableServices.name}) LIKE LOWER(${"%" + input.serviceName + "%"})`,
        ),
      )
      .limit(1);

    return match?.id ?? null;
  }

  return null;
}

async function handleCheckAvailability(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const dateRange = input.dateRange as { start: string; end: string };
  const serviceId = await resolveServiceId(context.orgId, input);

  if (!serviceId) {
    // List available services so AI can ask the customer
    const services = await db
      .select({ id: bookableServices.id, name: bookableServices.name, durationMinutes: bookableServices.durationMinutes })
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, context.orgId),
          eq(bookableServices.isActive, true),
        ),
      );

    return JSON.stringify({
      error: "service_not_found",
      message: "Could not identify the service. Available services are listed below.",
      availableServices: services,
    });
  }

  const result = await schedulingService.getAvailabilityForAI(context.orgId, {
    serviceId,
    startDate: dateRange.start,
    endDate: dateRange.end,
    preferredTimeOfDay: input.preferredTimeOfDay as
      | "morning"
      | "afternoon"
      | "evening"
      | undefined,
  });

  // Limit to 10 slots to keep the response manageable for Claude
  return JSON.stringify({
    ...result,
    slots: result.slots.slice(0, 10),
  });
}

async function handleProposeBooking(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const serviceId = input.serviceId as string;
  const date = input.date as string;
  const startTime = input.startTime as string;
  const teamMemberId = input.teamMemberId as string;

  // Re-check availability for this specific slot
  const result = await schedulingService.getAvailabilityForAI(context.orgId, {
    serviceId,
    startDate: date,
    endDate: date,
  });

  const matchingSlot = result.slots.find(
    (s) => s.startTime === startTime && s.teamMemberId === teamMemberId,
  );

  if (!matchingSlot) {
    return JSON.stringify({
      available: false,
      message: "This slot is no longer available.",
      alternatives: result.slots.slice(0, 3),
    });
  }

  return JSON.stringify({
    available: true,
    proposal: {
      service: result.service?.name ?? "Service",
      date: matchingSlot.date,
      startTime: matchingSlot.startTime,
      endTime: matchingSlot.endTime,
      durationMinutes: result.service?.durationMinutes ?? 60,
      teamMemberName: matchingSlot.teamMemberName,
    },
  });
}

async function handleConfirmBooking(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const serviceId = input.serviceId as string;
  const startTime = new Date(input.startTime as string);
  const endTime = new Date(input.endTime as string);
  const teamMemberId = input.teamMemberId as string;
  const notes = (input.notes as string) ?? null;

  // Map channel to bookedVia enum value
  const bookedViaMap: Record<string, string> = {
    webchat: "ai_webchat",
    sms: "ai_sms",
    whatsapp: "ai_whatsapp",
    email: "ai_email",
    call: "ai_call",
  };
  const bookedVia = bookedViaMap[context.channel] ?? "ai_webchat";

  // Get service name for the appointment title
  const [service] = await db
    .select({ name: bookableServices.name })
    .from(bookableServices)
    .where(eq(bookableServices.id, serviceId));

  const title = service?.name ?? "Appointment";

  try {
    const appointment = await schedulingService.createAppointment(context.orgId, {
      contactId: context.contactId,
      title,
      description: notes,
      startTime,
      endTime,
      assignedTo: teamMemberId,
      serviceId,
      bookedVia: bookedVia as "ai_webchat" | "ai_sms" | "ai_whatsapp" | "ai_email" | "ai_call" | "manual" | "public_form",
    });

    // Push to Google Calendar (async, don't block)
    googleCalendarSyncService
      .pushAppointmentToGoogle(appointment.id, context.orgId, teamMemberId, {
        title,
        description: notes ?? undefined,
        startTime,
        endTime,
      })
      .catch(() => {
        // Error already logged in the sync service
      });

    return JSON.stringify({
      booked: true,
      appointment: {
        id: appointment.id,
        service: title,
        date: (input.date as string) ?? startTime.toISOString().split("T")[0],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        teamMemberName: input.teamMemberName ?? "Your technician",
      },
    });
  } catch (err) {
    // Conflict detection from schedulingService
    if (err instanceof Error && err.message.includes("conflicts")) {
      // Get alternative slots
      const alternatives = await schedulingService.getAvailabilityForAI(
        context.orgId,
        {
          serviceId,
          startDate: startTime.toISOString().split("T")[0]!,
          endDate: startTime.toISOString().split("T")[0]!,
        },
      );

      return JSON.stringify({
        booked: false,
        conflict: true,
        message: "This slot was just taken. Here are alternative times.",
        alternatives: alternatives.slots.slice(0, 3),
      });
    }
    throw err;
  }
}

async function handleRescheduleAppointment(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const appointmentId = input.appointmentId as string;
  const newDate = input.newDate as string;
  const newStartTime = input.newStartTime as string;

  // Verify appointment belongs to this contact
  const existing = await schedulingService.getById(context.orgId, appointmentId);
  if (existing.appointment.contactId !== context.contactId) {
    return JSON.stringify({ rescheduled: false, error: "Appointment not found." });
  }

  // Calculate new end time based on duration
  const start = new Date(newStartTime);
  const duration =
    existing.appointment.endTime.getTime() - existing.appointment.startTime.getTime();
  const end = new Date(start.getTime() + duration);

  try {
    const updated = await schedulingService.updateAppointment(
      context.orgId,
      appointmentId,
      { startTime: start, endTime: end },
    );

    // Update Google Calendar if synced
    if (existing.appointment.googleEventId && existing.appointment.assignedTo) {
      googleCalendarSyncService
        .updateGoogleEvent(
          appointmentId,
          context.orgId,
          existing.appointment.assignedTo,
          existing.appointment.googleEventId,
          { startTime: start, endTime: end },
        )
        .catch(() => {});
    }

    return JSON.stringify({
      rescheduled: true,
      appointment: {
        id: updated.id,
        date: newDate,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("conflicts")) {
      return JSON.stringify({
        rescheduled: false,
        message: "The new time conflicts with another appointment.",
      });
    }
    throw err;
  }
}

async function handleCancelAppointment(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const appointmentId = input.appointmentId as string;

  // Verify appointment belongs to this contact
  const existing = await schedulingService.getById(context.orgId, appointmentId);
  if (existing.appointment.contactId !== context.contactId) {
    return JSON.stringify({ cancelled: false, error: "Appointment not found." });
  }

  await schedulingService.cancelAppointment(context.orgId, appointmentId);

  // Delete from Google Calendar if synced
  if (existing.appointment.googleEventId && existing.appointment.assignedTo) {
    googleCalendarSyncService
      .deleteGoogleEvent(
        context.orgId,
        existing.appointment.assignedTo,
        existing.appointment.googleEventId,
      )
      .catch(() => {});
  }

  return JSON.stringify({
    cancelled: true,
    message: "Your appointment has been cancelled.",
  });
}

async function handleAddToWaitlist(
  input: Record<string, unknown>,
  context: BookingContext,
): Promise<string> {
  const entry = await waitlistService.create(context.orgId, {
    contactId: context.contactId,
    serviceId: (input.serviceId as string) ?? null,
    preferredDateRange: (input.preferredDateRange as { start: string; end: string }) ?? null,
    preferredTimeOfDay: (input.preferredTimeOfDay as string) ?? null,
    notes: (input.notes as string) ?? null,
  });

  return JSON.stringify({
    waitlisted: true,
    message:
      "You've been added to our waitlist. We'll reach out as soon as a slot opens up.",
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mybizos && pnpm --filter api test -- src/__tests__/ai-booking-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/ai-booking-tools.ts apps/api/src/__tests__/ai-booking-tools.test.ts
git commit -m "feat(api): add AI booking tool definitions and execution handlers"
```

---

## Task 13: Upgrade Platform Assistant Service with Tool Use

**Files:**
- Modify: `apps/api/src/services/platform-assistant-service.ts`

This is the key integration point — upgrading the existing assistant to use Claude tool use for booking.

- [ ] **Step 1: Add imports**

Add these imports at the top of `platform-assistant-service.ts`:

```typescript
import {
  BOOKING_TOOLS,
  executeBookingTool,
} from "./ai-booking-tools.js";
import {
  db as dbClient,
  bookableServices,
  serviceTeamMembers,
  users,
  appointments as appointmentsTable,
  waitlist,
  withOrgScope,
} from "@hararai/db";
```

Note: rename `db` import to `dbClient` to avoid conflict with the existing `db` import if needed. Check existing imports — the file already imports `db` from `@hararai/db`, so use the existing import and add the new table imports.

- [ ] **Step 2: Add contact booking context loader**

Add this function after the existing `loadBusinessContext` function:

```typescript
async function loadContactBookingContext(
  orgId: string,
  contactId: string,
): Promise<string> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [upcomingAppts, recentAppts, waitlistEntries] = await Promise.all([
    // Upcoming appointments for this contact
    db
      .select({
        title: appointments.title,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          withOrgScope(appointments.orgId, orgId),
          eq(appointments.contactId, contactId),
          gte(appointments.startTime, now),
          sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
        ),
      )
      .orderBy(appointments.startTime)
      .limit(5),

    // Recent completed appointments
    db
      .select({
        title: appointments.title,
        startTime: appointments.startTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          withOrgScope(appointments.orgId, orgId),
          eq(appointments.contactId, contactId),
          eq(appointments.status, "completed"),
        ),
      )
      .orderBy(desc(appointments.startTime))
      .limit(3),

    // Active waitlist entries
    db
      .select({
        serviceName: bookableServices.name,
        preferredTimeOfDay: waitlist.preferredTimeOfDay,
        status: waitlist.status,
      })
      .from(waitlist)
      .leftJoin(bookableServices, eq(waitlist.serviceId, bookableServices.id))
      .where(
        and(
          withOrgScope(waitlist.orgId, orgId),
          eq(waitlist.contactId, contactId),
          eq(waitlist.status, "pending"),
        ),
      ),
  ]);

  if (
    upcomingAppts.length === 0 &&
    recentAppts.length === 0 &&
    waitlistEntries.length === 0
  ) {
    return "";
  }

  const lines: string[] = ["", "=== THIS CUSTOMER'S BOOKING HISTORY ==="];

  for (const appt of upcomingAppts) {
    const date = new Date(appt.startTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    lines.push(`  - Upcoming: ${appt.title} on ${date} (${appt.status})`);
  }

  for (const entry of waitlistEntries) {
    lines.push(
      `  - Waitlisted: ${entry.serviceName ?? "General"}${entry.preferredTimeOfDay ? `, preferred ${entry.preferredTimeOfDay}s` : ""}`,
    );
  }

  for (const appt of recentAppts) {
    const date = new Date(appt.startTime).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    lines.push(`  - Last completed: ${appt.title} on ${date}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 3: Add bookable services context loader**

Add this function:

```typescript
async function loadBookableServicesContext(orgId: string): Promise<string> {
  const services = await db
    .select({
      id: bookableServices.id,
      name: bookableServices.name,
      description: bookableServices.description,
      durationMinutes: bookableServices.durationMinutes,
      qualifyingQuestions: bookableServices.qualifyingQuestions,
    })
    .from(bookableServices)
    .where(
      and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.isActive, true),
      ),
    );

  if (services.length === 0) return "";

  const lines: string[] = ["", "=== BOOKABLE SERVICES ==="];

  for (const svc of services) {
    // Get team members for this service
    const members = await db
      .select({ name: users.name })
      .from(serviceTeamMembers)
      .innerJoin(users, eq(serviceTeamMembers.userId, users.id))
      .where(
        and(
          withOrgScope(serviceTeamMembers.orgId, orgId),
          eq(serviceTeamMembers.serviceId, svc.id),
        ),
      );

    const memberNames = members.map((m) => m.name ?? "Team Member").join(", ");
    lines.push(
      `- ${svc.name} (${svc.durationMinutes} min)${svc.description ? ` — ${svc.description}` : ""}`,
    );
    if (memberNames) lines.push(`  Team: ${memberNames}`);

    const questions = svc.qualifyingQuestions as string[];
    if (questions && questions.length > 0) {
      lines.push(`  Ask before booking: ${questions.map((q) => `"${q}"`).join(", ")}`);
    }
  }

  lines.push("");
  lines.push("=== BOOKING INSTRUCTIONS ===");
  lines.push("You can check availability and book appointments for customers.");
  lines.push("");
  lines.push("Rules:");
  lines.push(
    "1. ALWAYS confirm before booking. Summarize the service, date, time, and technician, then ask 'Does that look right?' Only call confirm_booking after explicit customer confirmation.",
  );
  lines.push(
    "2. When no exact slot matches, offer the 3 nearest alternatives before suggesting waitlist.",
  );
  lines.push(
    "3. If the customer is vague ('sometime next week'), check availability for the full range and present top 3 options.",
  );
  lines.push(
    "4. If qualifying questions exist for a service, ask them BEFORE checking availability.",
  );
  lines.push(
    "5. If no slots are available and the customer declines waitlist, offer to connect them with the team.",
  );
  lines.push(
    "6. For reschedule/cancel requests, look up the customer's upcoming appointments first.",
  );

  return lines.join("\n");
}
```

- [ ] **Step 4: Modify the `chat` method to use tool use**

Replace the existing `chat` method in `platformAssistantService` with this updated version. The key changes are: (1) adding `tools` to the Claude API call, (2) handling tool_use response blocks in a loop, (3) loading booking context.

The new `chat` method signature adds optional `contactId` and `channel` parameters:

```typescript
  async chat(
    orgId: string,
    message: string,
    history: ChatMessage[] = [],
    options?: { contactId?: string; channel?: string },
  ): Promise<{ response: string; context?: Partial<BusinessContext> }> {
```

Inside the method, after loading business context, load booking context:

```typescript
    // Load booking-specific context
    const [bookingServicesCtx, contactBookingCtx] = await Promise.all([
      loadBookableServicesContext(orgId),
      options?.contactId
        ? loadContactBookingContext(orgId, options.contactId)
        : Promise.resolve(""),
    ]);

    // Build system prompt with real data + booking context
    const systemPrompt =
      buildSystemPrompt(ctx) + bookingServicesCtx + contactBookingCtx;
```

Replace the Claude API call with a tool-use loop:

```typescript
    try {
      // Initial Claude call with tools
      let claudeResponse = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
        tools: BOOKING_TOOLS,
      });

      // Tool-use loop: Claude may call tools, we execute them and send results back
      while (claudeResponse.stop_reason === "tool_use") {
        const toolUseBlocks = claudeResponse.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );

        // Add assistant response to messages
        claudeMessages.push({
          role: "assistant",
          content: claudeResponse.content,
        });

        // Execute each tool and build tool results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const result = await executeBookingTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            {
              orgId,
              contactId: options?.contactId ?? "",
              channel: options?.channel ?? "webchat",
            },
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Send tool results back to Claude
        claudeMessages.push({
          role: "user",
          content: toolResults,
        });

        // Get next response
        claudeResponse = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: claudeMessages,
          tools: BOOKING_TOOLS,
        });
      }

      // Extract final text response
      const textBlock = claudeResponse.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      const responseText =
        textBlock?.text ?? "I wasn't able to generate a response. Please try again.";

      logger.info("Assistant chat completed", {
        orgId,
        inputTokens: claudeResponse.usage.input_tokens,
        outputTokens: claudeResponse.usage.output_tokens,
      });

      return {
        response: responseText,
        context: {
          orgName: ctx.orgName,
          totalContacts: ctx.totalContacts,
          openConversations: ctx.openConversations,
        },
      };
    }
```

Note: The `claudeMessages` array type needs to be widened to accept tool-use content blocks. Change the type from `Array<{ role: 'user' | 'assistant'; content: string }>` to `Anthropic.MessageParam[]`.

- [ ] **Step 5: Update the assistant route to pass contactId and channel**

In `apps/api/src/routes/assistant.ts`, update the chat schema and handler:

Add `contactId` and `channel` to the schema:

```typescript
const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  contactId: z.string().uuid().optional(),
  channel: z.string().optional(),
});
```

Update the handler call:

```typescript
    const result = await platformAssistantService.chat(orgId, message, history, {
      contactId: parsed.data.contactId,
      channel: parsed.data.channel,
    });
```

- [ ] **Step 6: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors. If there are type issues with the Anthropic types for tool use messages, the `claudeMessages` array needs to be typed as `Anthropic.MessageParam[]` instead of the current custom type.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/services/platform-assistant-service.ts apps/api/src/routes/assistant.ts
git commit -m "feat(api): upgrade platform assistant with Claude tool use for AI booking"
```

---

## Task 14: AI Booking Handler — Channel-Agnostic Orchestrator

**Files:**
- Create: `apps/api/src/services/ai-booking-handler.ts`

This is the service that webhook handlers (Twilio, etc.) call to process inbound messages through the AI booking flow.

- [ ] **Step 1: Create the handler**

```typescript
// apps/api/src/services/ai-booking-handler.ts
import { db, conversations, messages, withOrgScope } from "@hararai/db";
import { eq, and, desc } from "drizzle-orm";
import { platformAssistantService } from "./platform-assistant-service.js";
import { conversationService } from "./conversation-service.js";
import { logger } from "../middleware/logger.js";

interface InboundMessage {
  conversationId: string;
  orgId: string;
  messageBody: string;
}

/**
 * Process an inbound message through the AI booking handler.
 * Called by webhook handlers for SMS, WhatsApp, email, and the webchat endpoint.
 *
 * Returns the AI response text, or null if AI handling is disabled for this conversation.
 */
export async function handleAIBookingMessage(
  msg: InboundMessage,
): Promise<string | null> {
  // Get the conversation to check if AI handled
  const conversation = await conversationService.getById(
    msg.orgId,
    msg.conversationId,
  );

  if (!conversation.conversation.aiHandled) {
    return null; // Not AI handled — let human reply
  }

  const contactId = conversation.conversation.contactId;
  const channel = conversation.conversation.channel;

  // Load recent message history for context
  const recentMessages = await conversationService.getMessages(
    msg.orgId,
    msg.conversationId,
  );

  // Convert to ChatMessage format (last 10 messages)
  const history = recentMessages
    .slice(-10)
    .filter((m) => m.body) // Skip empty messages
    .map((m) => ({
      role: (m.senderType === "contact" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.body,
    }));

  try {
    const result = await platformAssistantService.chat(
      msg.orgId,
      msg.messageBody,
      history,
      { contactId, channel },
    );

    // Store the AI response as an outbound message
    await conversationService.createMessage(msg.orgId, msg.conversationId, {
      direction: "outbound",
      channel,
      senderType: "ai",
      body: result.response,
    });

    logger.info("AI booking handler processed message", {
      orgId: msg.orgId,
      conversationId: msg.conversationId,
      channel,
    });

    return result.response;
  } catch (err) {
    logger.error("AI booking handler failed", {
      orgId: msg.orgId,
      conversationId: msg.conversationId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Return a fallback message
    return "I'm having a bit of trouble right now. Let me connect you with our team — someone will be in touch shortly.";
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd mybizos && pnpm --filter api typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/ai-booking-handler.ts
git commit -m "feat(api): add channel-agnostic AI booking handler"
```

---

## Task 15: Run Full Build and Tests

**Files:** None (validation only)

- [ ] **Step 1: Run all tests**

Run: `cd mybizos && pnpm --filter api test`
Expected: All tests pass, including the new ones.

- [ ] **Step 2: Run typecheck across the monorepo**

Run: `cd mybizos && pnpm --filter api typecheck && pnpm --filter @hararai/db typecheck`
Expected: No type errors

- [ ] **Step 3: Fix any issues found**

If there are type errors or test failures, fix them. Common issues:
- Import path mismatches (`.js` extensions required for ESM)
- Anthropic types for tool use may need explicit casting
- `withOrgScope` import might need updating in files that now import more from `@hararai/db`

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(api): resolve typecheck and test issues for AI booking feature"
```

---

## Follow-Up Work (Not in This Plan)

These items are needed to fully connect the feature but depend on existing webhook handlers that have their own logic:

1. **Wire Twilio SMS webhook** — In `apps/api/src/routes/webhooks/twilio.ts`, after storing the inbound message, call `handleAIBookingMessage()` if the conversation has `aiHandled: true`. Send the returned response via Twilio SMS.
2. **Wire email webhook** — Same pattern in `apps/api/src/routes/webhooks/email.ts`.
3. **Wire webchat widget** — The existing chat widget can be updated to pass `contactId` and `channel: "webchat"` to `POST /orgs/:orgId/assistant/chat`.
4. **Admin UI for bookable services** — A settings page to manage services, team assignments, and qualifying questions.
5. **Google Calendar OAuth flow** — Wire the existing OAuth callback to store tokens in `google_calendar_connections` table instead of in-memory.

---

## Summary of Commits

| # | Commit | What it delivers |
|---|--------|-----------------|
| 1 | `feat(db): add bookable_services and service_team_members tables` | Schema for what can be booked |
| 2 | `feat(db): add waitlist table with status enum` | Waitlist fallback schema |
| 3 | `feat(db): add google_calendar_connections and busy_blocks tables` | GCal sync schema |
| 4 | `feat(db): add serviceId, bookedVia, googleCalendarSyncStatus to appointments` | Extend appointments for booking tracking |
| 5 | `feat(db): add migration for AI calendar booking schema` | Runnable migration |
| 6 | `feat(api): add bookable service CRUD service with tests` | Service layer + tests |
| 7 | `feat(api): add bookable services REST routes` | Admin API for managing services |
| 8 | `feat(api): add waitlist service and REST routes` | Waitlist management |
| 9 | `feat(api): add getAvailabilityForAI and extend createAppointment` | Multi-user, multi-day availability |
| 10 | `feat(api): add Google Calendar bidirectional sync service` | GCal push/pull |
| 11 | `feat(api): add Google Calendar sync cron job and webhook handler` | Automated sync |
| 12 | `feat(api): add AI booking tool definitions and execution handlers` | The 6 Claude tools |
| 13 | `feat(api): upgrade platform assistant with Claude tool use for AI booking` | Core integration |
| 14 | `feat(api): add channel-agnostic AI booking handler` | Orchestrator for all channels |
| 15 | `fix(api): resolve typecheck and test issues` | Clean build |
