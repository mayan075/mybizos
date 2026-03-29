# AI-Powered Calendar Booking Across All Channels

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Connect AI conversations to calendar so the AI can check availability and book appointments across all channels (webchat, SMS, WhatsApp, email, call, internal assistant).

---

## 1. Architecture Overview

**Single AI booking layer, channel-agnostic.** Every channel already routes through `conversation-service` into messages. The upgrade: `platform-assistant-service` gets Claude **tool use** so it can call scheduling functions directly during any conversation.

```
Any channel message (inbound)
  -> conversation-service.createMessage()
  -> AI booking handler (new)
    -> platform-assistant-service.chat() -- now with Claude tools
      -> Claude decides: booking intent?
        -> YES: calls tools (check_availability, propose_booking, confirm_booking...)
        -> NO: responds normally with business context
    -> response sent back via same channel
```

The AI booking handler is a new thin layer that intercepts inbound messages on `aiHandled: true` conversations and runs them through the tool-equipped Claude. It uses the existing `contactId` on the conversation to maintain booking context across channels for the same person.

### What Changes

- `platform-assistant-service` -- add Claude tool definitions and tool execution handler
- `scheduling-service` -- add new methods (AI availability lookup, waitlist management)
- `google-calendar-sync-service` -- new service for bidirectional sync
- DB schema -- new tables (`bookable_services`, `service_team_members`, `waitlist`, `google_calendar_connections`) + new columns on `appointments`
- One new cron job for Google Calendar polling fallback
- New `ai-booking-handler` service to orchestrate channel-agnostic AI booking

### What Stays the Same

- All existing routes and conversation flow
- Frontend chat components (they just receive richer responses)
- Existing appointment CRUD and availability rules
- Existing Google Calendar client (`packages/integrations/src/google-calendar/index.ts`)

---

## 2. Database Schema Changes

### New Table: `bookable_services`

What can be booked, how long it takes.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PK, default random | |
| orgId | uuid | NOT NULL, FK -> organizations, cascade | Multi-tenancy |
| name | text | NOT NULL | "AC Repair", "Drain Cleaning" |
| description | text | nullable | For AI context when deciding which service fits |
| durationMinutes | integer | NOT NULL, default 60 | Default appointment length |
| bufferMinutes | integer | NOT NULL, default 0 | Break between appointments |
| qualifyingQuestions | jsonb | NOT NULL, default [] | Questions AI should ask before booking, e.g. ["Is this residential or commercial?", "Have you used our service before?"] |
| isActive | boolean | NOT NULL, default true | Can be booked? |
| createdAt | timestamp | NOT NULL, default now | |
| updatedAt | timestamp | NOT NULL, default now | |

**Indexes:** orgId, (orgId, isActive)

### New Table: `service_team_members`

Which team members perform which services.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PK, default random | |
| orgId | uuid | NOT NULL, FK -> organizations, cascade | Multi-tenancy |
| serviceId | uuid | NOT NULL, FK -> bookable_services, cascade | |
| userId | uuid | NOT NULL, FK -> users, cascade | |
| createdAt | timestamp | NOT NULL, default now | |

**Indexes:** orgId, (serviceId, userId) unique, (orgId, userId)

### New Table: `waitlist`

Fallback when no slots are available.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PK, default random | |
| orgId | uuid | NOT NULL, FK -> organizations, cascade | Multi-tenancy |
| contactId | uuid | NOT NULL, FK -> contacts, cascade | |
| serviceId | uuid | nullable, FK -> bookable_services | null = general waitlist |
| preferredDateRange | jsonb | nullable | `{start: "2026-04-01", end: "2026-04-07"}` |
| preferredTimeOfDay | text | nullable | "morning", "afternoon", "evening" |
| status | waitlist_status enum | NOT NULL, default "pending" | pending, notified, booked, expired |
| notes | text | nullable | Context from the AI conversation |
| createdAt | timestamp | NOT NULL, default now | |
| updatedAt | timestamp | NOT NULL, default now | |

**Indexes:** orgId, (orgId, status), (orgId, contactId)

### New Table: `google_calendar_connections`

Per-user Google Calendar OAuth tokens (replaces in-memory storage in current integrations route).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PK, default random | |
| orgId | uuid | NOT NULL, FK -> organizations, cascade | Multi-tenancy |
| userId | uuid | NOT NULL, FK -> users, cascade | |
| calendarId | text | NOT NULL, default "primary" | Google Calendar ID |
| accessToken | text | NOT NULL | Encrypted at rest |
| refreshToken | text | NOT NULL | Encrypted at rest |
| expiresAt | timestamp | NOT NULL | Token expiry |
| lastSyncAt | timestamp | nullable | Last successful sync |
| syncEnabled | boolean | NOT NULL, default true | Active sync? |
| createdAt | timestamp | NOT NULL, default now | |
| updatedAt | timestamp | NOT NULL, default now | |

**Indexes:** orgId, (orgId, userId) unique, (syncEnabled)

### New Table: `google_calendar_busy_blocks`

Cached busy times from external Google Calendar events (not created by HararAI). Refreshed on each sync.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PK, default random | |
| orgId | uuid | NOT NULL, FK -> organizations, cascade | Multi-tenancy |
| userId | uuid | NOT NULL, FK -> users, cascade | Which team member's calendar |
| googleEventId | text | NOT NULL | For dedup on sync |
| summary | text | nullable | Event title (for debugging, not shown to customers) |
| startTime | timestamp | NOT NULL | |
| endTime | timestamp | NOT NULL | |
| updatedAt | timestamp | NOT NULL, default now | |

**Indexes:** (orgId, userId, startTime), (googleEventId) unique

### Additions to Existing `appointments` Table

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| serviceId | uuid | nullable, FK -> bookable_services | Which service (null for legacy appointments) |
| bookedVia | booked_via enum | nullable | Values: "ai_webchat", "ai_sms", "ai_whatsapp", "ai_email", "ai_call", "manual", "public_form". Null for legacy appointments. |
| googleCalendarSyncStatus | text | nullable, default "pending" | "pending", "synced", "failed" |

---

## 3. Claude Tool Definitions

Six tools the AI can call during conversations. These are defined as Anthropic tool-use function schemas and executed server-side.

### `check_availability`

Find open slots for a service.

**Input:**
```typescript
{
  serviceName?: string;       // Fuzzy match against bookable_services.name
  serviceId?: string;         // Direct ID if known
  dateRange: {
    start: string;            // ISO date "2026-04-01"
    end: string;              // ISO date "2026-04-03"
  };
  preferredTimeOfDay?: "morning" | "afternoon" | "evening";
}
```

**Logic:**
1. Resolve service (by name fuzzy match or ID)
2. Get team members who perform this service via `service_team_members`
3. For each team member:
   - Get availability rules for the date range
   - Get existing appointments (local DB)
   - Get Google Calendar busy times (if connected)
   - Generate available slots accounting for service duration + buffer
4. Merge and sort slots across all eligible team members
5. Filter by preferred time of day if specified

**Returns:**
```typescript
{
  service: { id, name, durationMinutes };
  slots: Array<{
    date: string;
    startTime: string;
    endTime: string;
    teamMemberId: string;
    teamMemberName: string;
  }>;
  totalAvailable: number;
}
```

### `propose_booking`

Present a specific slot for confirmation. Two-step safety pattern -- never book without explicit customer confirmation.

**Input:**
```typescript
{
  serviceId: string;
  date: string;
  startTime: string;
  teamMemberId: string;
}
```

**Logic:**
1. Re-validate that the slot is still open (prevents race conditions between check and book)
2. Build a human-readable confirmation summary

**Returns:**
```typescript
{
  available: boolean;
  proposal: {
    service: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    teamMemberName: string;
  };
  // If not available, include alternatives
  alternatives?: Array<{date, startTime, endTime, teamMemberName}>;
}
```

### `confirm_booking`

Actually create the appointment. Only called after customer explicitly confirms.

**Input:**
```typescript
{
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  teamMemberId: string;
  notes?: string;
}
```

**Logic:**
1. Get contactId from the current conversation context (already available via conversation.contactId)
2. Create appointment via `schedulingService.createAppointment()` -- which already has conflict detection
3. Set `bookedVia` based on conversation channel ("ai_sms", "ai_webchat", etc.)
4. Set `serviceId` on the appointment
5. Push to Google Calendar if team member has a connection
6. Send confirmation back through the conversation

**Returns:**
```typescript
{
  booked: boolean;
  appointment: {
    id: string;
    service: string;
    date: string;
    startTime: string;
    endTime: string;
    teamMemberName: string;
  };
  // If conflict detected (race condition), returns alternatives
  conflict?: boolean;
  alternatives?: Array<{date, startTime, endTime, teamMemberName}>;
}
```

### `reschedule_appointment`

Move an existing appointment.

**Input:**
```typescript
{
  appointmentId: string;
  newDate: string;
  newStartTime: string;
}
```

**Logic:**
1. Verify the appointment belongs to the current contact
2. Check new slot availability
3. Update appointment via `schedulingService.updateAppointment()`
4. Update Google Calendar event if synced
5. Return updated details

**Returns:**
```typescript
{
  rescheduled: boolean;
  appointment: { id, service, date, startTime, endTime, teamMemberName };
  // If new slot unavailable
  alternatives?: Array<{date, startTime, endTime, teamMemberName}>;
}
```

### `cancel_appointment`

Cancel an existing appointment.

**Input:**
```typescript
{
  appointmentId: string;
  reason?: string;
}
```

**Logic:**
1. Verify appointment belongs to current contact
2. Cancel via `schedulingService.cancelAppointment()`
3. Delete/cancel Google Calendar event
4. Check waitlist for this service/time -- notify next person if someone is waiting

**Returns:**
```typescript
{
  cancelled: boolean;
  message: string;
}
```

### `add_to_waitlist`

When no suitable slots are found.

**Input:**
```typescript
{
  serviceId?: string;
  preferredDateRange?: { start: string; end: string };
  preferredTimeOfDay?: "morning" | "afternoon" | "evening";
  notes?: string;
}
```

**Logic:**
1. Create waitlist entry with contact from conversation context
2. Notify business owner (via activity feed / notification)

**Returns:**
```typescript
{
  waitlisted: boolean;
  message: string;
}
```

---

## 4. AI System Prompt Extensions

The existing `buildSystemPrompt()` in `platform-assistant-service.ts` gets extended with:

### Booking Context Block

```
=== BOOKABLE SERVICES ===
- AC Repair (90 min) — Residential and commercial AC diagnostics and repair
  Team: Mike Johnson, Sarah Chen
  Ask before booking: "Is this residential or commercial?"
- Drain Cleaning (60 min) — Sink, toilet, and main line drain clearing
  Team: Mike Johnson
  Ask before booking: "Which drain is affected?"
...

=== BOOKING INSTRUCTIONS ===
You can check availability and book appointments for customers.

Rules:
1. ALWAYS confirm before booking. Summarize the service, date, time, and technician, then ask "Does that look right?" Only call confirm_booking after explicit customer confirmation.
2. When no exact slot matches, offer the 3 nearest alternatives before suggesting waitlist.
3. If the customer is vague ("sometime next week"), check availability for the full range and present top 3 options.
4. If qualifying questions exist for a service, ask them BEFORE checking availability.
5. If no slots are available and the customer declines waitlist, offer to connect them with the team.
6. For reschedule/cancel requests, look up the customer's upcoming appointments first.
```

### Contact Booking Context Block

```
=== THIS CUSTOMER'S BOOKING HISTORY ===
- Upcoming: AC Repair on Apr 3, 2026 at 2:00 PM with Mike (scheduled)
- Waitlisted: Drain Cleaning, preferred next week mornings
- Last completed: AC Maintenance on Feb 15, 2026
```

This is loaded per-contact across all channels, ensuring cross-channel continuity.

---

## 5. Google Calendar Bidirectional Sync

### Outbound: HararAI -> Google Calendar

Triggered on appointment create, update, and cancel.

**Flow:**
1. Appointment created/updated/cancelled in DB
2. Look up `google_calendar_connections` for the `assignedTo` user
3. If connected and `syncEnabled`:
   - Create: `googleCalendarClient.createEvent()` -> store `googleEventId` on appointment
   - Update: `googleCalendarClient.updateEvent()` using stored `googleEventId`
   - Cancel: `googleCalendarClient.deleteEvent()` using stored `googleEventId`
4. Set `googleCalendarSyncStatus` to "synced" or "failed"
5. On failure: log error, mark as "failed", retry via cron (max 3 attempts)

### Inbound: Google Calendar -> HararAI

**Primary: Google Calendar Push Notifications (Webhooks)**
- Register a watch on each connected user's calendar via `calendar.events.watch()`
- Google sends POST to our webhook endpoint when events change
- Webhook handler: fetch changed events, update local busy-time cache

**Fallback: Polling Cron Job**
- Runs every 5 minutes
- For each active `google_calendar_connections`:
  - Fetch events for next 14 days
  - Compare against last known state
  - Update local busy-time cache
- Only used when webhook registration fails or as a consistency check

**Busy-Time Handling:**
- External Google Calendar events (not created by HararAI) are treated as "busy" blocks
- They don't create appointments in our system -- they just block availability slots
- Stored in a `google_calendar_busy_blocks` table: `{id, orgId, userId, startTime, endTime, googleEventId, summary, updatedAt}` -- lightweight, refreshed on each sync
- The `check_availability` tool reads both local appointments AND this busy-blocks table
- Stale entries (older than `lastSyncAt`) are purged on each sync cycle

**Race Condition Handling:**
- If bidirectional sync detects a conflict after a booking was confirmed:
  1. Mark the appointment as needing attention
  2. Notify the business owner with details
  3. Send a message to the customer: "We need to adjust your appointment time -- our team will reach out shortly"
  4. Do NOT auto-cancel -- let the business owner decide

---

## 6. Async Processing for Non-Realtime Channels

### SMS / WhatsApp / Email

These channels receive messages via webhooks (Twilio, etc.) that need fast HTTP responses.

**Flow:**
1. Webhook receives message -> responds 200 immediately
2. `conversation-service.createMessage()` stores the message
3. If conversation has `aiHandled: true`:
   - Enqueue an async job: `{ conversationId, messageId, orgId }`
   - Job runs the AI booking handler (Claude tool-use conversation)
   - AI response is sent back via the channel's outbound service (Twilio for SMS, etc.)
4. If `aiHandled: false`: no AI processing, message waits for human reply

### Webchat

- Existing request-response pattern works fine
- Add a streaming/typing indicator while Claude processes tools
- Tool execution (DB queries, Google Calendar API) happens server-side; client just sees the typing indicator then the final response

### Internal Dashboard Assistant

- Already uses request-response via `POST /orgs/:orgId/assistant/chat`
- Same tool-use upgrade -- business owner can say "book John Smith for AC repair Thursday at 2" and it happens
- Additional tools available to internal users: view all team calendars, override availability, force-book

---

## 7. Cross-Channel Contact Context

When the AI processes any message, it loads booking context for the **contact** (not just the conversation):

```typescript
async function loadContactBookingContext(orgId: string, contactId: string) {
  // All channels, single contact view
  return {
    upcomingAppointments,   // Next 30 days
    pastAppointments,       // Last 3 completed
    activeWaitlistEntries,
    recentBookingAttempts,  // From conversation history across all channels
  };
}
```

This ensures: if someone starts on webchat and follows up via SMS saying "actually make it 3pm instead", the AI knows what appointment they're referring to.

---

## 8. Cascading Fallback Logic

When no slots match the customer's request:

### Step 1: Offer Alternatives
AI uses `check_availability` with a wider date range and presents the 3 nearest available slots.

> "Thursday's fully booked, but I have Friday at 10:00 AM, Friday at 2:00 PM, or next Monday at 9:00 AM. Would any of those work?"

### Step 2: Offer Waitlist
If alternatives don't work, AI uses `add_to_waitlist`.

> "Nothing available this week unfortunately. I can add you to our waitlist and text you as soon as something opens up. Would you like that?"

### Step 3: Escalate to Human
If the customer is frustrated, the situation is complex, or after 2 failed negotiation rounds:

1. Set `aiHandled: false` on the conversation
2. Set conversation `status: "open"` to appear in the team inbox
3. Create a notification for the assigned user or org owner
4. AI responds: "Let me connect you with our team to find a time that works. Someone will be in touch shortly."

---

## 9. New Files and Modified Files

### New Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema/bookable-services.ts` | bookable_services + service_team_members tables |
| `packages/db/src/schema/waitlist.ts` | waitlist table |
| `packages/db/src/schema/google-calendar-connections.ts` | google_calendar_connections + google_calendar_busy_blocks tables |
| `apps/api/src/services/ai-booking-handler.ts` | Orchestrates AI tool-use conversations for booking |
| `apps/api/src/services/ai-booking-tools.ts` | Tool definitions and execution logic for Claude |
| `apps/api/src/services/google-calendar-sync-service.ts` | Bidirectional Google Calendar sync |
| `apps/api/src/services/waitlist-service.ts` | Waitlist CRUD and notification |
| `apps/api/src/services/bookable-service-service.ts` | Bookable services CRUD |
| `apps/api/src/routes/bookable-services.ts` | REST routes for managing bookable services |
| `apps/api/src/routes/waitlist.ts` | REST routes for waitlist management |
| `apps/api/src/jobs/google-calendar-sync.ts` | Cron job for polling fallback |
| `apps/api/src/routes/webhooks/google-calendar.ts` | Webhook endpoint for Google Calendar push notifications |
| DB migration file | All schema changes |

### Modified Files

| File | Changes |
|------|---------|
| `apps/api/src/services/platform-assistant-service.ts` | Add tool definitions, tool execution handler, extended system prompt with booking context |
| `apps/api/src/services/scheduling-service.ts` | Add `getAvailabilityForAI()` (multi-user, multi-day), update `createAppointment` to accept serviceId/bookedVia, add Google Calendar push on CRUD |
| `apps/api/src/services/conversation-service.ts` | Add `aiHandled` toggle, escalation support |
| `packages/db/src/schema/scheduling.ts` | Add serviceId, bookedVia, googleCalendarSyncStatus columns to appointments |
| `packages/db/src/schema/index.ts` | Export new tables |
| `apps/api/src/routes/integrations.ts` | Move Google Calendar tokens from in-memory to DB table |
| `apps/api/src/scheduler.ts` | Register Google Calendar sync cron job |
| `apps/api/src/index.ts` | Mount new routes (bookable-services, waitlist, google-calendar webhook) |

---

## 10. API Routes

### Bookable Services (Admin)

- `GET /orgs/:orgId/bookable-services` -- list all services
- `POST /orgs/:orgId/bookable-services` -- create a service
- `PATCH /orgs/:orgId/bookable-services/:id` -- update a service
- `DELETE /orgs/:orgId/bookable-services/:id` -- delete a service
- `POST /orgs/:orgId/bookable-services/:id/team-members` -- assign team member
- `DELETE /orgs/:orgId/bookable-services/:id/team-members/:userId` -- remove team member

### Waitlist (Admin)

- `GET /orgs/:orgId/waitlist` -- list waitlist entries
- `PATCH /orgs/:orgId/waitlist/:id` -- update status (e.g., mark as notified/booked)
- `DELETE /orgs/:orgId/waitlist/:id` -- remove entry

### Google Calendar Webhook

- `POST /webhooks/google-calendar` -- receives push notifications from Google

### Existing Routes (No Changes to Interface)

- `POST /orgs/:orgId/assistant/chat` -- now supports tool-use internally, same request/response shape
- All scheduling routes -- same interface, enhanced internally

---

## 11. Security Considerations

- **Token encryption:** Google Calendar access/refresh tokens stored encrypted at rest in `google_calendar_connections`
- **Contact isolation:** AI tools always scope to the current conversation's contactId -- a customer can only see/modify their own appointments
- **Org scoping:** All new tables use `withOrgScope(orgId)` per CLAUDE.md rules
- **Tool safety:** `confirm_booking` requires prior `propose_booking` in the same conversation turn -- Claude cannot skip confirmation
- **Rate limiting:** AI booking handler respects existing API rate limits
- **Webhook verification:** Google Calendar webhook validates the `X-Goog-Channel-Token` header

---

## 12. Testing Requirements

Per CLAUDE.md: every new feature must include at least 1 test.

- **Unit tests:** Tool execution logic (check_availability slot calculation, conflict detection, waitlist creation)
- **Integration tests:** Full AI booking conversation flow (mock Claude API, verify correct tools are called in sequence)
- **Edge case tests:** Double-booking prevention, token refresh, cross-channel context loading, cascading fallback progression
