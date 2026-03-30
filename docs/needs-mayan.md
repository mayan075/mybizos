# Things That Need Mayan's Help

Last updated: 2026-03-30

## ✅ RESOLVED — Services Connected

| Service | Status | Details |
|---------|--------|---------|
| Railway PostgreSQL | ✅ Connected | 30+ tables, all migrations applied |
| Anthropic API | ✅ Working | Claude Haiku responding |
| Twilio | ✅ Active | "My first Twilio account" |
| Resend | ✅ Working | Send-only key configured |
| Railway API | ✅ Deployed | https://api.hararai.com/health |
| Vercel Frontend | ✅ Deployed | https://hararai.com |
| GitHub | ✅ Pushed | All code up to date |

## ✅ RESOLVED — Code Changes (2026-03-30)

| Item | Status | Details |
|------|--------|---------|
| VAPI config vars | ✅ Done | Added VAPI_API_KEY + VAPI_WEBHOOK_SECRET to config schema |
| Org invite flow | ✅ Done | Creates user + orgMember record, sends invite email via Resend |
| Mobile onboarding config | ✅ Done | Bottom sheet shows ConfigPreview on mobile |
| Redis rate limiting | ✅ Done | Rate limiter uses Redis via cacheGet/cacheSet (falls back to in-memory) |
| Mock data cleanup | ✅ Done | Deleted 705-line mock-data.ts, all imports redirected to types.ts |
| Portal pages wired | ✅ Done | Appointments, invoices, messages, profile — all fetch from real API |
| Cross-tenant tests | ✅ Done | DB-level isolation tests (skipped without DATABASE_URL) |
| E2E testing | ✅ Done | Playwright installed, auth + portal specs created |
| Social media integration | ✅ Done | socialAccounts table, OAuth connect/publish routes, frontend wired |
| Social accounts migration | ✅ Done | `packages/db/drizzle/0005_melodic_thanos.sql` generated |

## 🔧 ACTION NEEDED — External Dashboard Config

### 1. Vercel Environment Variable
**Go to:** https://vercel.com → HararAI project → Settings → Environment Variables

**Add this variable:**
```
NEXT_PUBLIC_API_URL = https://api.hararai.com
```

Set it for **Production**, **Preview**, and **Development** environments.
Then trigger a redeploy (Deployments → latest → Redeploy).

### 2. Google OAuth (social login)
- **Add to Railway env vars:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (values are in `.env`)
- **Add to GCP Console:** Authorized redirect URI `https://api.hararai.com/auth/google/callback`
- Without this: "Sign in with Google" button won't appear

### 3. Production JWT Secret
- Generate: `openssl rand -hex 32`
- **Add to Railway env vars:** `JWT_SECRET=<generated value>`
- Without this: Using dev default secret (insecure)

### 4. Domain/DNS Verification
- Verify `hararai.com` points to Vercel
- Verify `api.hararai.com` points to Railway
- Configure custom domains in Vercel and Railway dashboards

### 5. Redis URL in Production
- Verify `REDIS_URL` is set in Railway env vars
- Without this: Rate limiter falls back to in-memory (works but doesn't scale)

## 🔧 OPTIONAL — Not Yet Configured

### 1. Vapi.ai Account (AI phone agent)
- Add `VAPI_API_KEY` and `VAPI_WEBHOOK_SECRET` to Railway env vars
- Without it: Phone agent setup wizard works but calls won't connect

### 2. Stripe Connect (billing/payments) — DEFERRED
- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` to Railway
- Without it: Billing page shows plans but can't process payments

### 3. Social Media OAuth Apps
- **Facebook:** Register app at developers.facebook.com, get App ID + Secret
- **Google Business:** Already using Google OAuth, just needs Business Profile scope
- **LinkedIn:** Register app at linkedin.com/developers
- Without these: Social media page works for drafting/scheduling but can't publish

### 4. Run New Migration
```bash
# On Railway or with DATABASE_URL set:
cd packages/db && npx drizzle-kit migrate
```
This applies the `0005_melodic_thanos.sql` migration (adds `social_accounts` table).
