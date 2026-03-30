# HararAI Deployment Guide

## Live URL

Production: https://hararai.com

## Prerequisites

- Node.js >= 20
- pnpm 10.x (`npm i -g pnpm@10`)
- Vercel account (https://vercel.com)
- Vercel CLI (`npm i -g vercel`)
- GitHub repo connected to Vercel

## Architecture

HararAI is a Turborepo monorepo. The web app (`apps/web`) is the Next.js 15 frontend deployed to Vercel. The API (`apps/api`) is a Hono server that will be deployed separately (not yet deployed).

The Vercel project root directory is set to `apps/web`, but `sourceFilesOutsideRootDirectory` is enabled so the build has access to the full monorepo (workspace packages like `@hararai/ui` and `@hararai/shared`).

## Deployment Steps

### First-time setup

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Log in:
   ```bash
   vercel login
   ```

3. Link the project (from the monorepo root):
   ```bash
   cd hararai
   vercel link --project hararai
   ```

### Deploy to production

From the monorepo root:

```bash
vercel --prod --yes
```

This will:
- Upload files to Vercel
- Install dependencies with pnpm
- Run `turbo build --filter=@hararai/web`
- Deploy the Next.js app

### Deploy a preview (for testing)

```bash
vercel --yes
```

Preview deployments get a unique URL and don't affect the production site.

## Environment Variables

Set these in the Vercel dashboard (Settings > Environment Variables) or via CLI:

### Required for build

| Variable | Description | Example |
|----------|-------------|---------|
| `ENABLE_EXPERIMENTAL_COREPACK` | Enables pnpm via corepack | `1` |

### Required for runtime (when API is deployed)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.hararai.com` |

### Future variables (when backend is deployed)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `VAPI_API_KEY` | Vapi.ai API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `POSTMARK_SERVER_TOKEN` | Postmark email token |

### Setting env vars via CLI

```bash
# Production only
echo "your-value" | vercel env add VARIABLE_NAME production

# All environments
vercel env add NEXT_PUBLIC_API_URL production --value "https://api.hararai.com" --yes
```

## Custom Domain Setup

1. Go to https://vercel.com > hararai project > Settings > Domains
2. Add your domain: `app.hararai.com`
3. Vercel will provide DNS records to add:
   - Option A: CNAME record pointing `app` to `cname.vercel-dns.com`
   - Option B: A record pointing to Vercel's IP (if using apex domain)
4. Add the DNS records at your domain registrar
5. Vercel will automatically provision an SSL certificate

### For apex domain (hararai.com)

1. Add `hararai.com` as a domain in Vercel
2. Set A record: `@` -> `76.76.21.21`
3. Set AAAA record (optional): `@` -> `2606:4700:7::1`
4. Vercel handles SSL automatically

## Build Configuration

The deployment is configured via `apps/web/vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && npm i -g pnpm@10 && pnpm install --no-frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@hararai/web"
}
```

- `installCommand` navigates to the monorepo root, installs pnpm globally, then installs all workspace dependencies
- `buildCommand` uses Turborepo to build only the web app and its internal dependencies

## Auth Note

The middleware currently skips authentication on Vercel deployments because there is no database wired up yet. Once Better Auth + PostgreSQL are configured:

1. Remove the `isVercel` check from `apps/web/src/middleware.ts`
2. Set `DATABASE_URL` in Vercel environment variables
3. Redeploy

## Troubleshooting

### Build fails with "pnpm install exited with 1"
- Make sure `ENABLE_EXPERIMENTAL_COREPACK=1` is set in Vercel env vars
- Or use the installCommand that does `npm i -g pnpm@10`

### "No Next.js version detected"
- Make sure the Vercel project root directory is set to `apps/web`
- Check via: `vercel project inspect hararai`

### Symlink errors on local Windows build with `output: 'standalone'`
- This is a known issue with pnpm + OneDrive on Windows
- The `standalone` output mode is not needed for Vercel deployment
- Only enable it if deploying to Docker/self-hosted (on Linux)
