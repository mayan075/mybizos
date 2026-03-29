# AI Agent Configuration — Design Spec

**Date:** 2026-03-30
**Status:** Approved (v2 — gaps addressed)
**Scope:** v1 — Agent creation, customization, voice selection, test calls

---

## Overview

A full AI Agent configuration system where users create, customize, and test their phone AI agents. Template-based by default with advanced prompt editing for power users. This is the product's killer feature.

**User flows:**
- Standalone AI Agents page for creating/editing agents (name, prompt, voice, settings)
- Phone setup wizard creates a default agent as part of the flow
- First-time onboarding creates a working agent in under 2 minutes
- Start with one agent per org, data structured to support multi-agent routing later

---

## Architecture

### Components
- **Frontend:** New `/dashboard/settings/ai-agents` page with agent list + detail editor
- **Backend:** Existing CRUD API at `/orgs/:orgId/ai-agents` (minor additions for test call)
- **Database:** Existing `ai_agents` table, settings stored in JSONB columns
- **Integration:** Gemini Live voice preview + live test call from browser

### Data Flow
1. User creates agent → picks vertical → template generates system prompt
2. User customizes business details (services, prices) → prompt auto-updates
3. User picks voice → preview plays sample → saves to `geminiConfig.voiceName`
4. User hits "Test Call" → browser Gemini session with their config → they hear their agent
5. Real call comes in → system loads agent config → bridges to Gemini Live

---

## First-Run Onboarding Flow

The first time a user signs up, we need to get them to a working agent as fast as possible. No blank slate — guided setup.

### Trigger
- After org creation, if `ai_agents` count for org is 0, redirect to `/dashboard/settings/ai-agents/new`
- Also triggered from the phone setup wizard (after connecting Twilio number)

### Guided First-Agent Setup (3 steps, single page)

**Step 1 — "Tell us about your business"**
- Business name (pre-filled from org)
- Vertical picker (large cards with icons, not a dropdown)
- This auto-populates the services list with sensible defaults for the vertical

**Step 2 — "Meet your AI receptionist"**
- Auto-generated agent name based on vertical (e.g. "Sam" for removals, "Alex" for plumbing)
- User can change the name
- Voice picker (show 3-4 recommended voices for their vertical, "See all" expands to full grid)
- Greeting preview text (pre-filled, editable)

**Step 3 — "Try it out"**
- Shows the generated prompt summary (not the raw prompt — a friendly "Here's what your agent knows" card)
- Big "Test Call" button
- "Looks good — Activate" button to go live
- "Customize more" link → opens full agent editor

### Default Agent Config
When auto-created, the agent gets:
- Name: vertical-appropriate default
- System prompt: full vertical template with org's business name
- Voice: "Kore" (warm, professional — good default)
- Tone: "balanced"
- Services: pre-filled from vertical defaults
- Recording: on
- Escalation threshold: 4
- Emergency keywords: vertical-appropriate defaults
- Max duration: 15 minutes
- Active: true

---

## Agent Editor UI

Single-page editor with sections (not a multi-step wizard). Explicit **Save** button at top-right (sticky). Unsaved changes trigger a browser "are you sure?" prompt on navigate-away.

### Agent Basics (top bar)
- Agent name (text input, e.g. "Sam")
- Type badge: Phone (only type for v1, others greyed out as "coming soon")
- Active/Inactive toggle (prominent, top-right)
- **Save** button (primary, sticky top-right, disabled when no changes)
- Delete button (with confirmation dialog)

### Business Context (structured form)
- Business name (auto-filled from org settings)
- Vertical picker (dropdown: plumbing, HVAC, electrical, rubbish removals, moving, landscaping, pest control, cleaning, roofing, general contractor)
- **Services list** — dynamic rows:
  - Service name (text)
  - Price range low/high (numbers)
  - Add/remove rows
  - Changing vertical pre-fills with new defaults (with confirmation if existing services exist)
- Values auto-injected into prompt template

### Voice & Personality
- **Voice picker** — grid of cards for Gemini voices (Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Zephyr)
  - Each card: name, tone description, play button for sample
- **Greeting** — text input for opening line
- **Tone slider** — Professional ↔ Friendly (maps to prompt adjectives)

### Call Settings
- Max call duration (slider, 5-30 min, default 15)
- Record calls toggle (default on)
- Escalation threshold (misunderstandings before transfer, default 4)
- Emergency keywords (comma-separated, pre-filled with defaults)

### Advanced Prompt (collapsed by default)
- Toggle to expand full system prompt textarea
- "Reset to template" button
- Warning: "Editing directly disconnects from template settings above"
- When in custom mode, structured form becomes read-only with note
- **Compliance validation** (see Prompt Guardrails section below)

### Test & Logs (bottom section)
- **"Test Call" button** — browser-based Gemini Live session with current config
- Test call status indicator and timer
- **Recent calls** — last 10 call logs (date, duration, outcome, expandable transcript)

---

## Prompt Template System

### Vertical-Specific Templates

Each vertical gets its own template with trade-specific knowledge, qualifying questions, and service defaults. Templates share a common structure but differ in domain content.

#### Common Template Structure
```
You are {agentName}, a {tone} AI phone assistant for {businessName}.

CALL HANDLING RULES:
[shared across all verticals]

{verticalKnowledge}

SERVICES & PRICING:
{servicesBlock}

VOICE STYLE:
[shared across all verticals]
```

#### Vertical: Plumbing
```
PLUMBING KNOWLEDGE:
- Common services: drain cleaning, water heater repair/replacement, leak repair,
  toilet repair, faucet installation, sewer line inspection, garbage disposal
- Emergency services available 24/7 with premium rate
- Always ask: What's the issue? How long has it been happening? Is there active water damage?
- For water heater issues: ask tank vs tankless, age of unit, gas vs electric
- For drain issues: ask which drain, previous issues, solutions already tried
- Service call/diagnostic fee typically applies, credited toward repair
- Licensed and insured, all work guaranteed
```
Default services: Drain cleaning ($150-350), Water heater repair ($200-500), Leak repair ($150-400), Toilet repair ($100-300), Faucet installation ($150-350)

#### Vertical: HVAC
```
HVAC KNOWLEDGE:
- Common services: AC repair, AC tune-up, furnace repair, furnace tune-up,
  full system replacement, duct cleaning, thermostat installation
- Seasonal maintenance plans available
- Emergency services available 24/7 for no heat/no AC
- Always ask: Heating or cooling? Symptoms (no air, weak air, noise, smell)?
  Age of system? When last serviced?
- Ask about home size for replacement quotes
```
Default services: AC repair ($150-600), AC tune-up ($80-150), Furnace repair ($150-500), Duct cleaning ($300-600), System replacement ($5000-15000)

#### Vertical: Rubbish Removals
```
RUBBISH REMOVAL KNOWLEDGE:
- Common services: general rubbish, green waste, furniture, construction waste,
  full house cleanouts, deceased estate clearance
- Always ask: What type of rubbish? How much (cubic meters or truck loads)?
  Access to property? Stairs involved? Any hazardous materials?
- Same-day service may be available depending on schedule
- Free quotes for larger jobs
- We recycle and donate where possible
- Pricing depends on volume and type — offer to send someone for a free assessment
```
Default services: General rubbish ($150-400), Green waste ($100-300), Furniture removal ($100-350), Construction waste ($200-500), House cleanout ($500-2000)

#### Vertical: Electrical
```
ELECTRICAL KNOWLEDGE:
- Common services: outlet/switch repair, panel upgrades, lighting installation,
  ceiling fan install, smoke detector install, whole-home rewiring, EV charger install
- Emergency services for outages, sparking, burning smells
- Always ask: What's happening? How old is the home's wiring? Any recent renovations?
- All work must be done by licensed electrician — emphasize safety
- Permit may be required for panel upgrades and rewiring
```
Default services: Outlet/switch repair ($100-250), Lighting install ($150-400), Panel upgrade ($1500-3500), Ceiling fan ($200-450), EV charger ($500-1500)

#### Vertical: General Contractor (fallback)
```
GENERAL KNOWLEDGE:
- We handle a variety of home services and projects
- Always ask: What kind of work do you need? What's the scope?
  Any timeline or budget in mind?
- We can schedule a free on-site estimate for larger projects
- Licensed and insured
```
Default services: (empty — user fills in their own)

*Additional verticals (landscaping, pest control, cleaning, roofing, moving) follow the same pattern — specific knowledge block + default services. Built incrementally as users request them.*

### Template Variables
```
{businessName}       → from org settings
{agentName}          → from agent basics
{greeting}           → from voice & personality
{tone}               → "professional" | "friendly" | "warm and professional"
{verticalKnowledge}  → selected from vertical template above
{servicesBlock}      → auto-generated from services list
{escalationCount}    → from call settings
{emergencyKeywords}  → from call settings
```

### Shared Template Sections

#### Call Handling Rules (all verticals)
```
CALL HANDLING RULES:
1. Start every call with: "{greeting}"
2. This call may be recorded — mention this in your greeting.
3. Be patient with audio quality — phone calls can have background noise.
   Ask callers to repeat if needed, but do NOT escalate to a human unless
   the caller explicitly asks or you cannot understand after {escalationCount} attempts.
4. Only provide price RANGES, never exact prices.
5. If the customer mentions any emergency keyword ({emergencyKeywords}),
   immediately acknowledge the emergency and let them know you're alerting the team.
6. Always be professional, warm, and conversational.
7. Collect customer name, phone number, and address when booking appointments.
8. Confirm all appointment details before finalizing.
9. You are an AI assistant — never claim to be human.
```

#### Voice Style (all verticals)
```
VOICE STYLE:
- Keep responses short and conversational (1-2 sentences at a time)
- Sound {tone}, not scripted or robotic
- Use natural language — "sure", "absolutely", "no worries"
- Wait for the caller to finish speaking before responding
- If the caller goes quiet, gently prompt: "Are you still there?"
- End calls warmly: "Thanks for calling {businessName}. Have a great day!"
```

### Prompt Modes
- `template` mode: structured form drives prompt generation
- `custom` mode: user edits raw prompt, form becomes read-only
- "Reset to template" regenerates from current form values
- Flag stored as `settings.promptMode`

---

## Prompt Guardrails (Compliance Validation)

When a user saves a custom prompt, we validate it before allowing save:

### Required Elements (hard block — cannot save without these)
1. **AI disclosure** — prompt must contain language instructing the agent to identify as AI. Check for: "AI assistant", "AI receptionist", "artificial intelligence", or similar. If missing, show error: "Your prompt must instruct the agent to disclose that it's an AI. This is a legal requirement."
2. **No exact pricing** — scan for patterns like "$150" without a range. Warn (not block): "We noticed what looks like exact pricing. AI agents should only quote price ranges to avoid liability."

### Recommended Elements (warning — can save but shows yellow banner)
- Recording disclosure (mention that calls may be recorded)
- Emergency handling instruction
- Escalation/transfer instruction

### Implementation
- Validation runs client-side on save (instant feedback)
- Also validated server-side in the PATCH/POST endpoint (defense in depth)
- Custom prompts that fail hard validation return a 422 with specific error messages

---

## Voice Preview & Test Call

### Voice Preview (sample generation)

**Approach:** Generate samples on-demand via Gemini Live API and cache them.

**Flow:**
1. When user clicks play on a voice card, check if cached sample exists for that voice
2. If not cached: hit backend endpoint `POST /orgs/:orgId/gemini/voice-sample`
   - Backend opens a short Gemini Live session with that voice
   - Sends text: "Hi, thanks for calling! How can I help you today?"
   - Captures the audio response (PCM → convert to MP3/WAV)
   - Caches in-memory (or S3 if we have it) with a 24-hour TTL
   - Returns audio blob to frontend
3. If cached: return cached audio immediately
4. Frontend plays via Web Audio API

**Fallback:** If generation fails, show "Preview unavailable" and let user select anyway. Voice selection should never be blocked by preview.

### Test Call (live browser session)

**Flow:**
1. User clicks "Test Call" → browser requests mic permission
2. Frontend calls `POST /orgs/:orgId/gemini/test-session` with current agent config
   - Endpoint generates ephemeral token using the agent's system prompt + voice
   - Returns token + WebSocket URL
3. Browser opens WebSocket to Gemini Live using ephemeral token
4. Audio streams bidirectionally: mic → Gemini, Gemini → speakers
5. Floating panel shows: timer, waveform visualizer, "End Test" button
6. User ends test → WebSocket closes, panel disappears

**Wallet policy:**
- Test calls are **free** — do NOT debit the wallet
- Rate limit: max 10 test calls per org per hour (prevent abuse)
- Test calls are NOT logged to `ai_call_logs` (they're tests, not real calls)
- Backend marks the session with a `test: true` flag to distinguish from real calls

### Recording & Transcription
- `settings.recordingEnabled` toggle on agent
- When enabled, the Gemini call bridge captures input/output transcripts (already built)
- Stored in `ai_call_logs.transcript` column
- Displayed in agent editor's Recent Calls section as expandable text
- Each log entry shows: date, duration, caller phone, outcome badge, transcript toggle

---

## Data Model

### `ai_agents.settings` JSONB additions
```json
{
  "promptMode": "template",
  "greeting": "Hi, this is Sam from Northern Removals. This call may be recorded. How can I help you today?",
  "tone": "balanced",
  "services": [
    { "name": "General rubbish removal", "priceLow": 150, "priceHigh": 400 },
    { "name": "Green waste removal", "priceLow": 100, "priceHigh": 300 }
  ],
  "maxDurationMinutes": 15,
  "recordingEnabled": true,
  "escalationThreshold": 4,
  "emergencyKeywords": ["flooding", "gas leak", "fire", "carbon monoxide", "burst pipe"]
}
```

### `ai_agents.geminiConfig` JSONB (existing)
```json
{
  "voiceName": "Kore"
}
```

### No new tables or migrations needed
All data fits in existing JSONB columns. Services list may become its own table later if needed for invoicing/appointment integration.

### Agent-to-phone routing
- v1: One phone agent per org (system finds active phone agent for the org)
- Data structured to support per-number agent routing later (add `agentId` to phone number config)

---

## Save Behavior

- **Explicit save** — Save button at top-right, sticky on scroll
- Save button shows "Save" when clean, "Save Changes" with dot indicator when dirty
- **Unsaved changes protection** — browser `beforeunload` prompt + in-app "Unsaved changes" dialog if navigating within the app
- **Optimistic save** — show success toast immediately, revert on API error
- **Save validates** — runs compliance checks before submitting to API
- **No autosave** — too risky for prompt editing; a bad autosave could put a broken agent live

---

## Scope Boundaries (v1)

**In scope:**
- Agent CRUD (create, edit, delete, list)
- First-run guided agent setup (3-step onboarding)
- Vertical-specific prompt templates (plumbing, HVAC, rubbish removals, electrical, general)
- Advanced raw prompt editing with compliance guardrails
- Gemini voice selection with on-demand sample generation
- Live test call from browser (free, rate-limited)
- Call recording toggle
- Call transcription display
- Call settings (duration, escalation, emergency keywords)
- Explicit save with unsaved-changes protection

**Out of scope (future):**
- SMS/chat/review agent types
- Multi-agent per org / per-number routing
- Voice cloning or custom voices
- Prompt A/B testing
- Call analytics dashboard
- Services table (separate from JSONB)
- Multi-language support
- Additional verticals beyond the initial 5
