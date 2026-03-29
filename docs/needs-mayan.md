# Things That Need Mayan's Help

Last updated: 2026-03-29

## ✅ RESOLVED — Services Connected

| Service | Status | Details |
|---------|--------|---------|
| Railway PostgreSQL | ✅ Connected | 30 tables, all migrations applied |
| Anthropic API | ✅ Working | Claude Haiku responding |
| Twilio | ✅ Active | "My first Twilio account" |
| Resend | ✅ Working | Send-only key configured |
| Railway API | ✅ Deployed | https://mybizos-production.up.railway.app/health |
| Vercel Frontend | ✅ Deployed | https://mybizos.vercel.app |
| GitHub | ✅ Pushed | All code up to date |

## 🔧 ACTION NEEDED — Vercel Environment Variable

The frontend at `mybizos.vercel.app` needs to know where the API is.

**Go to:** https://vercel.com → MyBizOS project → Settings → Environment Variables

**Add this variable:**
```
NEXT_PUBLIC_API_URL = https://mybizos-production.up.railway.app
```

Set it for **Production**, **Preview**, and **Development** environments.
Then trigger a redeploy (Deployments → latest → Redeploy).

Without this, the frontend talks to `localhost:3001` which doesn't exist in production.

## 🔧 OPTIONAL — Not Yet Configured

### 1. Vapi.ai Account (AI phone agent)
- Needed for: actual AI phone call handling
- Add `VAPI_API_KEY` and `VAPI_WEBHOOK_SECRET` to Railway env vars
- Without it: Phone agent setup wizard works but calls won't connect

### 2. Stripe Connect (billing/payments)
- Needed for: subscription management, invoice payments
- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` to Railway
- Without it: Billing page shows plans but can't process payments

### 3. Google OAuth (social login)
- Coded and ready, just needs GCP credentials
- Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Railway
- Without it: "Sign in with Google" button won't appear

### 4. Domain Setup
- hararai.com or mybizos.com — point to Vercel
- Configure custom domain in Vercel dashboard

### 5. Production JWT Secret
- Current secret is fine for dev but should be rotated for production
- Generate new one: `openssl rand -hex 32`
- Update `JWT_SECRET` in Railway env vars
