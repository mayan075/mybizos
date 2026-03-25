# Action List for Mayan

> This file is automatically maintained by Claude. Items are added when the autonomous loop hits a blocker that requires human input. Items are removed when resolved.
>
> **Check this file periodically.** Once you resolve an item, delete it or mark it `[DONE]` and Claude will pick up from there on the next run.

---

## Blockers (Can't proceed without you)

### 1. Railway PostgreSQL Database
- **Why:** All data is in localStorage/mock — nothing persists across sessions
- **Action:** Create Railway account (free tier) → provision PostgreSQL → paste `DATABASE_URL` in `.env`
- **Unblocks:** Real data persistence, login system, multi-user support
- **Added:** 2026-03-25

### 2. Anthropic API Key
- **Why:** AI features (phone agent, lead scoring, assistant) use fake/simulated responses
- **Action:** Get API key from console.anthropic.com → paste as `ANTHROPIC_API_KEY` in `.env`
- **Unblocks:** Real AI conversations, real lead scoring, real phone agent
- **Added:** 2026-03-25

### 3. Twilio Account Credentials
- **Why:** Phone/SMS features can't work without real Twilio account
- **Action:** Get Account SID + Auth Token from twilio.com/console → paste in `.env`
- **Unblocks:** Browser calling, SMS sending, phone number purchasing
- **Added:** 2026-03-25

## Decisions Needed

_None right now._

## Nice-to-Have (When You Have Time)

### 4. Vapi.ai Account
- **Why:** AI phone agent needs a managed voice platform
- **Action:** Sign up at vapi.ai → paste API key in `.env`
- **Added:** 2026-03-25

### 5. Resend Account (Email)
- **Why:** Appointment confirmations, review requests, campaigns need real email
- **Action:** Sign up at resend.com → paste API key in `.env`
- **Added:** 2026-03-25

### 6. Domain Setup
- **Why:** Currently on mybizos.vercel.app
- **Action:** If you own mybizos.com, point it to Vercel. If not, decide on domain.
- **Added:** 2026-03-25

---

## Resolved

_Nothing yet._
