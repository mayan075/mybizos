# MyBizOS Documentation

## What is MyBizOS?

MyBizOS is an AI-native business operating system designed for local service businesses. It replaces tools like GoHighLevel with a modern, integrated platform that combines CRM, pipeline management, marketing automation, appointment scheduling, and AI-powered phone/SMS agents into a single system.

The killer feature is an **AI phone agent** that answers every call 24/7, qualifies leads, quotes price ranges, and books appointments automatically -- so business owners never miss a lead again.

### Who is it for?

MyBizOS serves local service businesses across 12 verticals:

- Plumbing, HVAC, Electrical, Roofing
- Rubbish Removals, Moving Companies
- Cleaning, Landscaping, Pest Control
- General Contractors, Auto Repair, Salon/Spa, Dental

Each vertical gets pre-configured pipeline stages, AI prompts, booking services, and drip sequences tailored to its industry.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui |
| **Backend API** | Hono (Node.js adapter) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Cache/Queue** | Redis + BullMQ |
| **Auth** | Better Auth (self-hosted) with JWT |
| **AI** | Claude API (Anthropic) via `@anthropic-ai/sdk` |
| **Voice/SMS** | Twilio + Vapi.ai (managed voice platform) |
| **Email** | Postmark |
| **Payments** | Stripe Connect |
| **Validation** | Zod (everywhere) |
| **Monorepo** | Turborepo + pnpm workspaces |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm
git clone <repo-url>
cd mybizos
pnpm install

# Start the frontend (port 3000)
cd apps/web && pnpm dev

# Start the API server (port 3001) -- in a second terminal
cd apps/api && npx tsx src/index.ts

# Open the app
open http://localhost:3000

# Demo credentials
# Email: jim@jimsplumbing.com
# Password: demo1234
```

For full setup instructions, see [Quick Start Guide](./quick-start.md).

## Project Structure

```
mybizos/
├── apps/
│   ├── web/          # Next.js 15 frontend (dashboard, auth, booking pages)
│   ├── api/          # Hono REST API server
│   └── portal/       # Customer-facing portal (future)
├── packages/
│   ├── db/           # Drizzle ORM schema, migrations, seed data
│   ├── shared/       # Shared types, validators, constants
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── ai/           # AI service (Claude API, lead scoring, agents)
│   ├── email/        # Postmark email service
│   └── integrations/ # Third-party integrations (Twilio, Stripe, Vapi)
├── docs/             # Documentation (you are here)
├── infra/            # Infrastructure configuration
├── CLAUDE.md         # System laws for AI agent sessions
├── FEATURE_JAIL.md   # Backlogged features (not in current phase)
├── turbo.json        # Turborepo pipeline configuration
└── pnpm-workspace.yaml
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [Quick Start](./quick-start.md) | Developer setup and local development guide |
| [API Reference](./api-reference.md) | Complete REST API endpoint documentation |
| [Architecture](./architecture.md) | System architecture, data flow, and design decisions |
| [Verticals](./verticals.md) | Supported business verticals and customization guide |

## Current Phase

**Phase 1 -- Wedge MVP**

Focus areas: Contacts, Pipeline/Deals, Unified Inbox, AI Phone Agent, AI SMS Agent, Scheduling, Dashboard, Reviews, Campaigns, Sequences.

Features not in Phase 1 are tracked in [FEATURE_JAIL.md](../FEATURE_JAIL.md).

## Live Demo

Visit [https://mybizos.vercel.app](https://mybizos.vercel.app) to see the live deployment.
