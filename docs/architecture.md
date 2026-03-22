# System Architecture

## Monorepo Structure

MyBizOS uses a Turborepo monorepo with pnpm workspaces. The dependency graph between packages:

```
                    ┌──────────────┐
                    │   apps/web   │  Next.js 15 Frontend
                    │  (port 3000) │
                    └──────┬───────┘
                           │ HTTP calls
                           v
                    ┌──────────────┐
                    │   apps/api   │  Hono REST API
                    │  (port 3001) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ @mybizos │ │ @mybizos │ │   @mybizos   │
        │   /db    │ │   /ai    │ │ /integrations│
        └──────────┘ └──────────┘ └──────────────┘
              │            │
              v            v
        ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │Claude API│
        └──────────┘ └──────────┘
```

### Package Dependency Map

```
apps/web       --> @mybizos/ui, @mybizos/shared, @mybizos/db (types only)
apps/api       --> @mybizos/db, @mybizos/shared, @mybizos/ai, @mybizos/email, @mybizos/integrations
apps/portal    --> @mybizos/ui, @mybizos/shared
packages/ai    --> @mybizos/shared, @mybizos/db
packages/email --> @mybizos/shared
```

### Package Descriptions

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 15 frontend. App Router pages, React components, API client hooks. |
| `apps/api` | Hono REST API server. Route handlers, middleware, services, background jobs. |
| `apps/portal` | Customer-facing portal (future). Customers view appointments, invoices, messages. |
| `packages/db` | Drizzle ORM schemas, migrations, seed data, database client. |
| `packages/shared` | TypeScript types, Zod validators, constants. Shared between frontend and backend. |
| `packages/ui` | Reusable UI components built on shadcn/ui. |
| `packages/ai` | AI service layer. Claude API integration, lead scoring, agent prompts. |
| `packages/email` | Email service. Postmark integration for transactional and marketing emails. |
| `packages/integrations` | Third-party integrations: Twilio, Stripe Connect, Vapi.ai. |

---

## Data Flow

### Frontend to API to Database

```
Browser (Next.js)
    │
    │  HTTP request (Bearer token)
    v
Hono API Server
    │
    ├── CORS middleware (validates origin)
    ├── Request logger
    ├── Auth middleware (validates JWT, sets user context)
    ├── Org scope middleware (enforces multi-tenancy)
    │
    ├── Route handler
    │   ├── Zod validation (request body/params)
    │   ├── Service layer (business logic)
    │   │   └── Drizzle ORM query (with org_id scope)
    │   │       └── PostgreSQL
    │   └── Return JSON response
    │
    └── Error handler (consistent error format)
```

### API Client (Frontend)

The frontend uses a centralized API client at `apps/web/src/lib/api-client.ts` that:
1. Automatically includes the Bearer token from the auth session
2. Sets the base URL to the API server
3. Provides typed request/response helpers
4. Custom hooks in `apps/web/src/lib/hooks/` wrap the API client for each resource (contacts, deals, conversations, etc.)

---

## Authentication Flow

```
1. User submits email + password
           │
           v
2. POST /auth/login
           │
           v
3. Auth service validates credentials
   ├── Hashes password, compares with DB
   ├── Creates JWT with: userId, email, orgId, role
   └── Returns token + user data
           │
           v
4. Frontend stores token (cookie or localStorage)
           │
           v
5. Subsequent requests include: Authorization: Bearer <token>
           │
           v
6. Auth middleware validates token on each request
   ├── Extracts user from JWT payload
   ├── Sets user + orgId on Hono context
   └── Passes to next middleware
```

### Development Mode Auth Bypass

In development mode (`NODE_ENV=development`), the auth middleware bypasses token validation and injects a demo user:

```typescript
const DEV_USER = {
  id: 'usr_01',
  email: 'demo@mybizos.com',
  orgId: 'org_01',
  role: 'owner',
};
```

This allows the frontend to work without login during development.

### Role-Based Access Control

Four roles with descending permissions:

| Role | Permissions |
|------|-------------|
| `owner` | Full access. Manage billing, delete org. |
| `admin` | Manage members, settings, all features. |
| `manager` | Manage contacts, deals, campaigns. |
| `member` | View and edit assigned contacts/deals. |

Role enforcement uses the `requireRole()` middleware:

```typescript
organizations.patch('/:orgId', requireRole('owner', 'admin'), async (c) => { ... });
```

---

## Multi-Tenancy

Multi-tenancy is the most critical architectural concern. A data leak between organizations would be a business-ending event.

### How It Works

1. **Every tenant-scoped table has an `org_id` column** (UUID, foreign key to `organizations`).

2. **Auth middleware extracts `orgId`** from the authenticated user's JWT payload and sets it on the Hono context.

3. **Org scope middleware validates** that if a `:orgId` URL parameter exists, it matches the authenticated user's org.

4. **All database queries use `withOrgScope(orgId)`** which adds the org_id filter to every query. No raw queries without scope are allowed.

```
Request with Bearer token
    │
    v
Auth middleware: extract user.orgId from JWT
    │
    v
Org scope middleware: c.set('orgId', user.orgId)
    │
    v
Route handler: const orgId = c.get('orgId')
    │
    v
Service: contactService.list(orgId, filters)
    │
    v
Database: SELECT * FROM contacts WHERE org_id = $orgId AND ...
```

### Database Schema Pattern

Every org-scoped table follows this pattern:

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- ... other columns
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX contacts_org_id_idx ON contacts(org_id);
```

---

## AI Architecture

### AI Phone Agent (Vapi.ai)

```
Inbound Call (Twilio)
    │
    v
Vapi.ai (Managed Voice Platform)
    │
    ├── Speech-to-text (real-time)
    ├── Claude API (conversation management)
    │   ├── AI disclosure: "This is [Business]'s AI assistant..."
    │   ├── Qualify lead (service needed, urgency, budget)
    │   ├── Quote price RANGES only (never exact)
    │   ├── Check availability via tool call
    │   └── Book appointment via tool call
    ├── Text-to-speech (response)
    │
    ├── Emergency detection
    │   └── Keywords: flooding, gas leak, fire, burst pipe, etc.
    │   └── Triggers instant owner SMS/push alert
    │
    ├── Escalation rules
    │   └── After 2 misunderstandings --> transfer to human
    │
    └── Webhook: POST /webhooks/vapi/call-ended
        └── Store transcript + call log
        └── Update contact + create/update deal
```

### AI SMS Agent

```
Inbound SMS (Twilio)
    │
    v
POST /webhooks/twilio/sms
    │
    v
Conversation service
    ├── Find or create conversation
    ├── Store inbound message
    ├── Check if AI SMS agent is enabled
    │
    └── AI SMS Agent (Claude API)
        ├── Read conversation history
        ├── Generate response
        ├── Apply compliance rules
        └── Send outbound SMS via Twilio
```

### AI Lead Scoring

The lead scoring system uses Claude to evaluate contacts based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| AI agent response | 25% | Did they engage with the AI? |
| Appointment booked | 30% | Did they book? |
| Service value | 20% | Estimated job value |
| Response time | 15% | How quickly they responded |
| Engagement level | 10% | Overall interaction quality |

Score thresholds:
- **Hot lead** (80-100): Immediate follow-up required
- **Warm lead** (50-79): Follow up within 24 hours
- **Cold lead** (20-49): Add to nurture sequence
- **Low priority** (0-19): Passive monitoring

### AI Review Response Generation

```
POST /orgs/:orgId/reviews/:id/generate-response
    │
    v
Review service
    ├── Load review text + rating + platform
    ├── Load business context
    └── Claude API: generate professional response
        └── Personalized, brand-appropriate, non-templated
```

---

## Webhook Flow

### Twilio Webhooks

```
Twilio Cloud
    │
    ├── POST /webhooks/twilio/sms     (inbound SMS)
    │   └── Parse message, route to conversation, trigger AI
    │
    ├── POST /webhooks/twilio/voice   (inbound call)
    │   └── Return TwiML to route to Vapi or play message
    │
    └── POST /webhooks/twilio/status  (delivery status)
        └── Update message status (sent/delivered/failed)
```

### Vapi Webhooks

```
Vapi AI Voice Platform
    │
    ├── POST /webhooks/vapi/call-ended
    │   └── Store call transcript, update contact, log call
    │
    └── POST /webhooks/vapi/tool-call
        └── Execute tool: check_availability, book_appointment, etc.
```

### Stripe Webhooks

```
Stripe
    │
    └── POST /webhooks/stripe/
        ├── payment_intent.succeeded  --> Mark invoice paid
        ├── customer.subscription.*   --> Update org plan
        └── charge.refunded           --> Process refund
```

### Postmark Email Webhooks

```
Postmark
    │
    └── POST /webhooks/email/inbound
        ├── Parse sender, subject, body
        ├── Route to org by recipient address
        ├── Find/create contact
        ├── Find/create conversation thread
        ├── Detect emergency keywords
        └── Optionally trigger AI auto-reply
```

---

## Background Jobs

Background jobs run via BullMQ (Redis-backed queue):

| Job | Description | Schedule |
|-----|-------------|----------|
| `appointment-reminders` | Send SMS/email reminders before appointments | Periodic |
| `review-requests` | Send review request messages after completed jobs | Triggered |
| Sequence execution | Process drip sequence steps | Event-driven |
| Campaign sending | Send campaign emails/SMS in batches | On-demand |

---

## Database Schema Overview

The database is PostgreSQL with Drizzle ORM. Key tables:

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (auth) |
| `organizations` | Business tenants |
| `org_members` | User-to-org membership with roles |

### CRM Tables

| Table | Description |
|-------|-------------|
| `contacts` | Customer/lead records |
| `activities` | Unified activity timeline |
| `pipelines` | Sales pipeline definitions |
| `pipeline_stages` | Stages within pipelines |
| `deals` | Deals/opportunities linked to contacts and stages |

### Communication Tables

| Table | Description |
|-------|-------------|
| `conversations` | Conversation threads (SMS, email, call, webchat) |
| `messages` | Individual messages within conversations |

### Scheduling Tables

| Table | Description |
|-------|-------------|
| `appointments` | Scheduled appointments |
| `availability_rules` | Business hours and availability rules |

### AI Tables

| Table | Description |
|-------|-------------|
| `ai_agents` | AI agent configurations (phone, SMS, email, review) |
| `ai_call_logs` | Call transcripts and outcomes |

### Marketing Tables

| Table | Description |
|-------|-------------|
| `campaigns` | Email/SMS campaign definitions |
| `reviews` | Customer reviews across platforms |
| `sequences` | Automated drip sequences |

---

## Environment Configuration

All environment variables are accessed through a typed config object (never raw `process.env`). The config is validated at startup using Zod:

```
NODE_ENV           -- development | production | test
PORT               -- API server port (default: 3001)
DATABASE_URL       -- PostgreSQL connection string
REDIS_URL          -- Redis connection string
JWT_SECRET         -- JWT signing secret (min 32 chars in production)
CORS_ORIGIN        -- Allowed CORS origin
APP_URL            -- API server URL
ANTHROPIC_API_KEY  -- Claude API key
TWILIO_*           -- Twilio credentials
VAPI_*             -- Vapi.ai credentials
POSTMARK_*         -- Postmark credentials
STRIPE_*           -- Stripe credentials
```

In development mode, all external service keys default to empty strings, and the server operates with mock data.

---

## Deployment

- **Frontend:** Deployed to Vercel (Next.js optimized hosting)
- **API:** Deployable to any Node.js host (Railway, Render, AWS, etc.)
- **Database:** Any PostgreSQL provider (Neon, Supabase, RDS)
- **Redis:** Any Redis provider (Upstash, ElastiCache)

The frontend and API communicate via CORS-enabled HTTP requests. Vercel deployment URLs (`*.vercel.app`) are automatically allowed by the CORS configuration.
