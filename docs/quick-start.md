# Quick Start Guide

This guide walks you through setting up HararAI for local development.

## Prerequisites

- **Node.js 20+** -- [Download](https://nodejs.org/)
- **pnpm** -- Install globally: `npm install -g pnpm`
- **Git** -- [Download](https://git-scm.com/)

Optional (for full functionality):
- **PostgreSQL 15+** -- Required for persistent data (dev mode uses mock data)
- **Redis** -- Required for BullMQ job queues

## 1. Clone the Repository

```bash
git clone <repo-url>
cd mybizos
```

## 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all apps and packages in the monorepo.

## 3. Environment Variables (Optional)

The API server boots with **zero configuration** in development mode. All environment variables default to empty/placeholder values, and the server uses mock data when the database is unavailable.

To connect real services, create `apps/api/.env`:

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/mybizos

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-at-least-32-characters-long

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Vapi (AI Voice)
VAPI_API_KEY=...
VAPI_WEBHOOK_SECRET=...

# Postmark (Email)
POSTMARK_SERVER_TOKEN=...
POSTMARK_DEFAULT_FROM=noreply@mybizos.com

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URLs
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3001
```

## 4. Start the Development Servers

You need two terminal windows:

### Terminal 1: Frontend (Next.js)

```bash
cd apps/web
pnpm dev
```

The frontend runs on **http://localhost:3000**.

### Terminal 2: API Server (Hono)

```bash
cd apps/api
npx tsx src/index.ts
```

The API runs on **http://localhost:3001**.

## 5. Open the App

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

```
Email:    jim@jimsplumbing.com
Password: demo1234
```

In development mode, the API server automatically authenticates requests without a valid JWT, using a built-in demo user. You can interact with the full dashboard without logging in.

## 6. Database Setup (Optional)

If you have PostgreSQL running and `DATABASE_URL` set:

```bash
# Generate Drizzle migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed demo data
pnpm --filter @mybizos/db tsx src/seed.ts

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## 7. Running Tests

```bash
# Run all tests
pnpm vitest run

# Run tests in watch mode
pnpm vitest

# Run tests for a specific package
pnpm --filter @mybizos/shared vitest run
```

## Available Scripts

Run from the monorepo root:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers (via Turborepo) |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without modifying files |
| `pnpm clean` | Clean all build outputs |
| `pnpm db:generate` | Generate Drizzle ORM migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema changes directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio database GUI |

## Project Structure

```
mybizos/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       │   ├── (auth)/     # Login, register, forgot password
│   │       │   ├── dashboard/  # Main dashboard views
│   │       │   ├── book/       # Public booking page
│   │       │   ├── portal/     # Customer portal
│   │       │   └── review/     # Public review page
│   │       ├── components/     # React components
│   │       └── lib/            # Utilities, hooks, API client
│   ├── api/                    # Hono API server
│   │   └── src/
│   │       ├── routes/         # API route handlers
│   │       ├── middleware/     # Auth, org scope, error handling
│   │       ├── services/       # Business logic
│   │       └── jobs/           # Background jobs (BullMQ)
│   └── portal/                 # Customer-facing portal (future)
├── packages/
│   ├── db/                     # Database layer
│   │   └── src/
│   │       ├── schema/         # Drizzle table definitions
│   │       ├── migrations/     # SQL migrations
│   │       └── seed.ts         # Demo data seeder
│   ├── shared/                 # Shared code
│   │   └── src/
│   │       ├── types/          # TypeScript interfaces
│   │       ├── validators/     # Zod schemas
│   │       └── constants/      # Constants (verticals, stages, etc.)
│   ├── ui/                     # Shared UI components
│   ├── ai/                     # AI service layer
│   ├── email/                  # Email service (Postmark)
│   └── integrations/           # Third-party integrations
└── infra/                      # Infrastructure config
```

## Troubleshooting

### API server won't start

The API server requires no env vars in dev mode. If you see errors, ensure you are using Node.js 20+ and have run `pnpm install`.

### Frontend shows "Network Error"

Make sure the API server is running on port 3001. The frontend expects the API at `http://localhost:3001`.

### Database connection errors

These are expected if you do not have PostgreSQL running. The API gracefully falls back to mock data in development mode.

### Port conflicts

- Frontend default: 3000
- API default: 3001

Change them via `PORT` env var (API) or Next.js config (frontend).
