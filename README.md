# HararAI

**AI-native business operating system for local service businesses.**

HararAI replaces GoHighLevel with a modern, integrated platform that combines CRM, pipeline management, marketing automation, appointment scheduling, and AI-powered phone/SMS agents. The killer feature: an AI phone agent that answers every call 24/7, qualifies leads, quotes price ranges, and books appointments automatically.

**Live Demo:** [https://hararai.com](https://hararai.com)

<!-- Screenshots: TODO -->

---

## Features

- **Contact & Lead Management** -- Full CRM with tagging, custom fields, lead scoring, and activity timeline
- **Pipeline & Deal Tracking** -- Kanban-style pipelines with drag-and-drop deal management
- **AI Phone Agent** -- 24/7 call answering via Vapi.ai + Claude. Qualifies leads, quotes prices, books appointments
- **AI SMS Agent** -- Automated SMS conversations for lead nurture and appointment follow-up
- **Unified Inbox** -- Single view for SMS, email, phone calls, and webchat conversations
- **Appointment Scheduling** -- Calendar with availability management and public booking pages
- **Marketing Campaigns** -- Email and SMS campaigns with audience segmentation
- **Drip Sequences** -- Multi-step automated follow-ups with AI-powered branching
- **Review Management** -- Track reviews across Google, Facebook, Yelp. AI-generated responses
- **AI Lead Scoring** -- Automatic lead quality scoring with detailed factor breakdowns
- **Multi-Tenancy** -- Full org isolation. Every query is scoped by `org_id`
- **12+ Business Verticals** -- Pre-configured pipelines, services, and AI prompts for plumbing, HVAC, electrical, moving, cleaning, and more

---

## Quick Start

**Prerequisites:** Node.js 20+, pnpm

```bash
# Clone and install
git clone <repo-url>
cd mybizos
pnpm install

# Start frontend (port 3000)
cd apps/web && pnpm dev

# Start API (port 3001) -- in a second terminal
cd apps/api && npx tsx src/index.ts

# Open http://localhost:3000
# Demo login: jim@jimsplumbing.com / demo1234
```

No environment variables required for development. The API boots with mock data when no database is configured.

For full setup details, see [docs/quick-start.md](docs/quick-start.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui |
| Backend | Hono (Node.js) |
| Database | PostgreSQL + Drizzle ORM |
| Cache/Queue | Redis + BullMQ |
| Auth | Better Auth (self-hosted) with JWT |
| AI | Claude API (Anthropic) |
| Voice/SMS | Twilio + Vapi.ai |
| Email | Postmark |
| Payments | Stripe Connect |
| Validation | Zod |
| Monorepo | Turborepo + pnpm |

---

## Project Structure

```
mybizos/
├── apps/
│   ├── web/           # Next.js 15 frontend
│   ├── api/           # Hono REST API
│   └── portal/        # Customer portal (future)
├── packages/
│   ├── db/            # Drizzle ORM schemas + migrations
│   ├── shared/        # Types, validators, constants
│   ├── ui/            # Shared UI components
│   ├── ai/            # AI service (Claude API)
│   ├── email/         # Postmark email service
│   └── integrations/  # Twilio, Stripe, Vapi
├── docs/              # Documentation
└── infra/             # Infrastructure config
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation index and project overview |
| [docs/quick-start.md](docs/quick-start.md) | Developer setup and local development |
| [docs/api-reference.md](docs/api-reference.md) | Complete REST API documentation |
| [docs/architecture.md](docs/architecture.md) | System architecture and design decisions |
| [docs/verticals.md](docs/verticals.md) | Supported business verticals |

---

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Follow the coding standards in [CLAUDE.md](CLAUDE.md)
3. Write tests for new features
4. Submit a PR with a clear description

### Code Standards

- **TypeScript strict mode** -- no `any` types, no `@ts-ignore`
- **Zod validation** on every API endpoint
- **Multi-tenancy** -- all queries use `withOrgScope(orgId)`
- **shadcn/ui** for all UI components
- **Server components by default** in Next.js

### Commit Message Format

```
type(scope): description

types: feat, fix, chore, docs, style, refactor, test, perf
scope: web, api, db, shared, ui, ai, email, integrations
```

Example: `feat(api): add contacts CRUD endpoints with Zod validation`

---

## License

Proprietary. All rights reserved.
