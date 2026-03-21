# MyBizOS — System Laws for All Agent Sessions

## Project Overview
MyBizOS is an AI-native business operating system for local businesses (starting with home services: HVAC + plumbing). The killer feature is an AI phone agent that answers every call, qualifies leads, and books appointments 24/7.

**Repo:** Turborepo monorepo with pnpm workspaces.
**Master Plan:** See `../.claude/plans/gleaming-popping-tower.md` for the full vision and execution plan.

## Architecture Laws (MUST Follow)

### Tech Stack (No Substitutions)
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui
- **Backend:** Hono (Node.js adapter) — NOT Express, NOT Fastify
- **Database:** PostgreSQL + Drizzle ORM — NOT Prisma, NOT Supabase
- **Cache/Queue:** Redis + BullMQ
- **Auth:** Better Auth (self-hosted) — NOT NextAuth, NOT Clerk
- **AI:** Claude API (Anthropic) via `@anthropic-ai/sdk`
- **SMS/Voice:** Twilio + Vapi.ai (managed voice platform)
- **Email:** Postmark — NOT SendGrid, NOT SES
- **Payments:** Stripe Connect
- **Validation:** Zod everywhere — all inputs, all API payloads

### Code Rules
1. **TypeScript strict mode** — no `any` types, no `@ts-ignore`
2. **Zod validation** on every API endpoint input and output
3. **All database queries must use `withOrgScope(orgId)`** — enforces multi-tenancy at the ORM layer
4. **shadcn/ui for ALL UI components** — never raw HTML elements for buttons, inputs, dialogs, etc.
5. **Server components by default** in Next.js — only use `'use client'` when needed for interactivity
6. **Every new feature must include at least 1 test**
7. **API routes in Hono** follow REST conventions: `GET /contacts`, `POST /contacts`, `PATCH /contacts/:id`, `DELETE /contacts/:id`
8. **Error handling:** All API routes return consistent error format: `{ error: string, code: string, status: number }`
9. **No console.log in production code** — use a logger
10. **Environment variables:** Always accessed via a typed config object, never raw `process.env`

### Multi-Tenancy (Critical)
- Every tenant-scoped table has `org_id` column
- API middleware extracts `org_id` from the authenticated session
- `withOrgScope(orgId)` wraps all Drizzle queries — NO raw queries without scope
- This is non-negotiable — a data leak between orgs would kill the business

### AI Agent Compliance (Built Into Product)
- AI phone agent MUST start with disclosure: "Hi, this is [Business Name]'s AI assistant. This call may be recorded."
- AI can quote price RANGES only — never exact prices: "typically starts around $150-250"
- AI must escalate to human after 2 misunderstandings
- Emergency keywords (flooding, gas leak, fire) trigger instant owner alert
- All AI conversations logged with full transcript

### File Structure Conventions
```
apps/web/src/
  app/              # Next.js App Router pages
  components/       # React components
  lib/              # Utilities, hooks, stores

apps/api/src/
  routes/           # Hono route handlers
  middleware/        # Auth, org scope, error handling
  services/         # Business logic

packages/db/src/
  schema/           # Drizzle table definitions
  migrations/       # SQL migrations

packages/shared/src/
  types/            # Shared TypeScript interfaces
  validators/       # Shared Zod schemas
  constants/        # Shared constants
```

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `contact-list.tsx`, `pipeline-kanban.tsx`)
- Components: `PascalCase` (e.g., `ContactList`, `PipelineKanban`)
- Functions/variables: `camelCase`
- Database tables: `snake_case` (e.g., `contacts`, `pipeline_stages`, `ai_call_logs`)
- API routes: `kebab-case` (e.g., `/api/contacts`, `/api/ai-agents`)
- Packages: `@mybizos/package-name`

### Commit Message Format
```
type(scope): description

types: feat, fix, chore, docs, style, refactor, test, perf
scope: web, api, db, shared, ui, ai, email, integrations
```
Example: `feat(api): add contacts CRUD endpoints with Zod validation`

## Package Dependencies (Internal)

```
apps/web      → @mybizos/ui, @mybizos/shared, @mybizos/db (for types only)
apps/api      → @mybizos/db, @mybizos/shared, @mybizos/ai, @mybizos/email, @mybizos/integrations
apps/portal   → @mybizos/ui, @mybizos/shared
packages/ai   → @mybizos/shared, @mybizos/db
packages/email → @mybizos/shared
```

## Current Phase: Phase 1 — Wedge MVP
Focus: Contacts, Pipeline, Unified Inbox, AI Phone Agent, AI SMS Agent, Scheduling, Dashboard.
Do NOT build features from Phase 2+ (campaigns, workflows, forms, invoicing, etc.).
If you think a feature is needed that's not in Phase 1, add it to FEATURE_JAIL.md instead.
