# Velvet Signal -- Twilio Phone App Analysis

**Location:** `C:\Users\mayan\OneDrive\Desktop\Twillio phone app\`
**Vercel Project:** `velvet-signal` (project ID: prj_RJ8tRmEVpZhAVw2DyGcOzBKj7ur5)
**Last Updated:** 2026-03-22 (based on git history through 2026-03-21)

---

## 1. Purpose & Features

The Velvet Signal is a **Progressive Web App (PWA)** that functions as a personal phone system powered by Twilio. It replaces a native phone app, providing SMS/MMS messaging and voice calling through a Twilio number, all accessible from a mobile browser (installable to home screen on Android).

### Core Features (All Functional)

- **SMS/MMS Messaging** -- Send and receive text messages and photos via Twilio. Incoming messages arrive via webhook and are stored in Supabase. Conversations are grouped by contact number.
- **Voice Calling** -- Make and receive phone calls through the browser using Twilio Voice SDK. Outbound calls use TwiML App routing. Incoming calls can be forwarded to a personal number.
- **Call Forwarding** -- Incoming calls to the Twilio number forward to a configurable personal number.
- **Call Recording** -- All calls are recorded (dual-channel from ringing) with recording URLs stored in call logs.
- **Call History** -- Full call log with status icons, duration, and playback links for recordings.
- **Contact Management** -- Full CRUD for contacts with phone, name, email, company, tags (array), and notes. Contacts are linked to conversations and call logs for name resolution.
- **Per-User Twilio Credentials** -- Each user stores their own Twilio Account SID, Auth Token, API Key/Secret, TwiML App SID, phone number, and forward number in their profile. Multi-tenant by design.
- **Magic Link Authentication** -- Supabase Auth with passwordless email OTP login.
- **PWA / Installable** -- Service worker for offline shell caching, push notification support, manifest.json for home screen install.
- **Settings Page** -- Configure all Twilio credentials, display name, call forwarding number, and sign out.

### Features in Schema But Not Yet Built in UI

The Supabase schema includes tables for features that have no corresponding UI:

- **SMS Templates** (`sms_templates`) -- Predefined message templates with variable substitution
- **Workflows** (`workflows`, `workflow_steps`, `workflow_executions`) -- Automated workflow engine with triggers, steps, conditions, and execution tracking
- **AI Agent System** (`agent_configs`, `agent_logs`) -- AI agent configuration with logging, decisions, and override tracking
- **Pipelines & Deals** (`pipelines`, `pipeline_stages`, `deals`) -- Sales pipeline with stages, deal values (AUD currency), and status tracking

These tables demonstrate CRM ambitions beyond a simple phone app.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.1 (App Router) |
| **Language** | TypeScript 5.7 |
| **UI** | React 19, Tailwind CSS 4.0 |
| **Database** | Supabase (PostgreSQL) with Row-Level Security |
| **Auth** | Supabase Auth (magic link / email OTP) |
| **Telephony** | Twilio (twilio v5.4 server SDK + @twilio/voice-sdk v2.12 browser SDK) |
| **Validation** | Zod 4.3 |
| **Icons** | Google Material Symbols Outlined (variable font) |
| **Font** | Inter (300-900 weights) |
| **Deployment** | Vercel (deployed), Railway mentioned as alternative |
| **PWA** | Custom service worker, web app manifest |

---

## 3. File Structure

```
Twillio phone app/
  app/
    api/
      auth/logout/route.ts       -- Sign out endpoint
      calls/route.ts             -- GET call history with contact name enrichment
      contacts/route.ts          -- GET list / POST create contacts
      contacts/[id]/route.ts     -- GET / PUT / DELETE single contact
      messages/route.ts          -- GET conversations list
      messages/[number]/route.ts -- GET messages for a contact, mark read
      settings/route.ts          -- GET / PUT user profile and Twilio creds
      sms/send/route.ts          -- POST send SMS/MMS via Twilio
      sms/webhook/route.ts       -- POST incoming SMS webhook from Twilio
      voice/status/route.ts      -- POST call status callback (upserts call_logs)
      voice/token/route.ts       -- GET Twilio Voice access token for browser SDK
      voice/webhook/route.ts     -- POST TwiML for outbound/inbound call routing
    auth/
      callback/route.ts          -- Supabase auth code exchange
      login/page.tsx             -- Magic link login page
    calls/page.tsx               -- Call history page
    contacts/page.tsx            -- Contacts list with add modal
    contacts/[id]/page.tsx       -- Contact detail with edit/delete
    dialer/page.tsx              -- Phone dialer with voice calling
    messages/page.tsx            -- Conversation list (home page)
    messages/[number]/page.tsx   -- Chat thread view
    settings/page.tsx            -- Settings (Twilio config, profile, forwarding)
    globals.css                  -- Velvet Signal theme tokens (Material Design 3)
    layout.tsx                   -- Root layout with PWA metadata
    page.tsx                     -- Redirects to /messages
  components/
    BottomNav.tsx                -- 5-tab navigation (Messages, Contacts, Dialer, Calls, Settings)
    ChatBubble.tsx               -- Individual message bubble (sent/received styling)
    ConversationList.tsx         -- Conversation list with unread badges
    Dialer.tsx                   -- T9-style keypad component
    MessageComposer.tsx          -- Chat input bar with MMS support
    TopAppBar.tsx                -- Shared header (default + chat variants)
    VoiceClient.tsx              -- Twilio Voice SDK wrapper + incoming/active call UI
  lib/
    db.ts                        -- Database operations (messages, conversations, contacts)
    supabase/client.ts           -- Browser Supabase client
    supabase/middleware.ts       -- Session refresh middleware (auth redirect currently disabled)
    supabase/server.ts           -- Server-side auth + service role clients
    twilio.ts                    -- Twilio client factory, voice token generation
  supabase/
    migrations/001_schema.sql    -- Full schema (profiles, messages, contacts, call_logs, templates, workflows, agents, pipelines, deals)
    migrations/002_user_twilio_credentials.sql -- Per-user Twilio credential columns
  public/
    icons/                       -- SVG icons (192px + 512px, regular + maskable)
    manifest.json                -- PWA manifest ("The Velvet Signal")
    sw.js                        -- Service worker (network-first cache, push notifications)
  middleware.ts                  -- Next.js middleware for Supabase session management
  stitch-screens/                -- Google Stitch HTML reference designs
  docs/superpowers/              -- Design specs and plans
```

---

## 4. Current State / Completeness

### Working
- All core phone features (SMS send/receive, voice calls, call forwarding, recordings)
- Contact management (full CRUD with tags and notes)
- Call history with recording playback
- Per-user Twilio credential management via Settings
- Supabase auth with magic link login
- PWA installable with service worker caching
- The "Velvet Signal" visual redesign is complete (dark luxury theme with coral/red accents)
- Deployed to Vercel

### Partially Complete / Known Gaps
- **Auth redirect is disabled** -- The middleware has the auth redirect commented out, meaning unauthenticated users can access API routes (many routes have a fallback to "first profile" if no auth session exists)
- **Search is decorative** -- Search bars on messages and contacts list render but the messages search does not filter; contacts search does filter locally
- **Push notifications** -- Service worker has push handler code but no server-side push subscription management exists
- **MMS uploads** -- Only supports pasting image URLs, no actual file upload to cloud storage
- **Realtime** -- Supabase Realtime is enabled for messages and call_logs tables (ALTER PUBLICATION) but the frontend uses 5-second polling, not websocket subscriptions

### Not Built (Schema Only)
- SMS Templates
- Workflows / Automations
- AI Agent System
- Sales Pipelines / Deals

---

## 5. Twilio Configuration Details

### Environment Variables Required
| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Fallback Account SID (env-level) |
| `TWILIO_AUTH_TOKEN` | Fallback Auth Token |
| `TWILIO_PHONE_NUMBER` | Fallback Twilio phone number (+61...) |
| `TWILIO_TWIML_APP_SID` | TwiML App for voice routing |
| `TWILIO_API_KEY` | API Key SID for voice tokens |
| `TWILIO_API_SECRET` | API Key Secret for voice tokens |
| `FORWARD_NUMBER` | Fallback call forwarding number |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |

### Webhook URLs (configured in Twilio Console)
- **SMS incoming:** `POST /api/sms/webhook` -- Receives Twilio form-encoded webhook, stores inbound message
- **Voice incoming/outgoing:** `POST /api/voice/webhook` -- Returns TwiML for call routing
- **Voice status:** `POST /api/voice/status` -- Receives call completion status, upserts call_logs

### Voice Flow
1. Browser requests access token from `GET /api/voice/token`
2. VoiceClient.tsx initializes Twilio Device with token
3. Outbound: Device.connect() hits TwiML webhook, which returns `<Dial><Number>` TwiML
4. Inbound: Twilio hits webhook, looks up user's forward_number, returns forwarding TwiML
5. Status callback upserts call_logs with duration, recording URL, etc.

### Multi-Tenant Design
Each user stores their own Twilio credentials in the `profiles` table. API routes first try to load user-specific credentials, then fall back to environment variables. The webhook routes use `getUserIdByPhone()` to match incoming messages/calls to the correct user by their Twilio phone number.

---

## 6. Design System ("The Velvet Signal")

Material Design 3 token system with a dark luxury aesthetic:

- **Background:** Near-black (#131313) with tonal surface layers (#0e0e0e through #393939)
- **Primary accent:** Coral/rose (#ffb3b2 text, #ff525d containers/buttons)
- **Secondary:** Deep crimson (#881d27) for sent message bubbles
- **Tertiary:** Teal (#6bd9c4) for success states, online indicators
- **Error:** Warm red (#ffb4ab / #93000a)
- **Typography:** Inter font, no serif or mono except for credential displays
- **Icons:** Google Material Symbols Outlined with variable font fill
- **Effects:** Glassmorphism on floating elements, primary gradient on CTAs, red glow shadows, press-scale animations

The design was generated using Google Stitch, with HTML reference screens in `stitch-screens/`, then translated into Tailwind CSS classes and applied across all components.

---

## 7. Relationship to MyBizOS -- Integration Opportunities

### Direct Overlap
The Velvet Signal's database schema already contains CRM-adjacent tables (contacts, deals, pipelines, workflows, agents) that map closely to MyBizOS Phase 1 features. The per-user Twilio credential management pattern could be reused directly.

### Potential Integration Points

1. **Twilio Infrastructure** -- The Twilio client factory (`lib/twilio.ts`), voice token generation, webhook handlers, and TwiML routing are production-tested and could be extracted into a shared package or directly into MyBizOS's phone/communications module.

2. **Contact Model** -- The contacts table (phone, name, email, company, tags[], custom_fields JSONB, notes) is a lightweight CRM contact model. MyBizOS will need a richer version but the same Supabase patterns (RLS policies, GIN index on tags) apply.

3. **Conversation/Messaging Layer** -- The message storage, conversation grouping, unread tracking, and 5-second polling pattern could serve as a starting point for MyBizOS's communication module. Upgrading to Supabase Realtime subscriptions would be the main improvement.

4. **Voice Calling** -- The entire VoiceClient.tsx component (Twilio Device initialization, incoming/active call UI overlays) is reusable. The webhook-based call logging with recording URLs is a solid pattern.

5. **Multi-Tenant Auth Pattern** -- The per-user credential storage in profiles, the `resolveClient()` helper pattern (try auth user, fall back to service role), and the middleware session management are all patterns that carry over.

6. **PWA Patterns** -- Service worker caching, push notification infrastructure, and the manifest-based installable app approach could be reused if MyBizOS offers a mobile-first view.

### Key Differences
- Velvet Signal is a single-purpose phone app; MyBizOS is a full CRM platform
- Velvet Signal uses polling; MyBizOS should use Realtime subscriptions from the start
- Velvet Signal's auth redirect is disabled (single-user feel); MyBizOS needs strict multi-tenant auth
- Velvet Signal stores Twilio creds in the profile row; MyBizOS may want a separate integrations/credentials table
- The schema tables for workflows, agents, and pipelines exist but have zero implementation -- MyBizOS will build these properly

### Recommended Approach
Rather than importing Velvet Signal code wholesale, extract the proven patterns:
- Twilio webhook handling and TwiML generation
- Voice SDK browser integration
- Contact data model with tags and custom fields
- Message storage and conversation grouping logic
- Supabase RLS policy patterns

---

## 8. Dependencies

### Production
| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15.1.0 | Framework |
| react / react-dom | ^19.0.0 | UI |
| @supabase/ssr | ^0.9.0 | Supabase server-side rendering |
| @supabase/supabase-js | ^2.99.3 | Supabase client |
| @twilio/voice-sdk | ^2.12.0 | Browser voice calling |
| twilio | ^5.4.0 | Server-side Twilio SDK |
| zod | ^4.3.6 | Schema validation |

### Dev
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4.0.0 | CSS framework |
| @tailwindcss/postcss | ^4.0.0 | PostCSS plugin |
| typescript | ^5.7.0 | Type checking |
| tsx | ^4.19.0 | TypeScript execution for scripts |

### Setup Requirements
1. Node.js 20.x
2. Twilio account with AU phone number + TwiML App + API Key
3. Supabase project with schema migrations applied
4. Vercel (or Railway) for deployment with env vars configured
5. Twilio Console webhook URLs pointing to deployed app
