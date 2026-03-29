# AI Agent Configuration — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** v1 — Agent creation, customization, voice selection, test calls

---

## Overview

A full AI Agent configuration system where users create, customize, and test their phone AI agents. Template-based by default with advanced prompt editing for power users. This is the product's killer feature.

**User flows:**
- Standalone AI Agents page for creating/editing agents (name, prompt, voice, settings)
- Phone setup wizard creates a default agent as part of the flow
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

## Agent Editor UI

Single-page editor with sections (not a multi-step wizard):

### Agent Basics (top bar)
- Agent name (text input, e.g. "Sam")
- Type badge: Phone (only type for v1, others greyed out as "coming soon")
- Active/Inactive toggle (prominent, top-right)
- Delete button (with confirmation)

### Business Context (structured form)
- Business name (auto-filled from org settings)
- Vertical picker (dropdown: plumbing, HVAC, electrical, rubbish removals, etc.)
- **Services list** — dynamic rows:
  - Service name (text)
  - Price range low/high (numbers)
  - Add/remove rows
- Values auto-injected into prompt template

### Voice & Personality
- **Voice picker** — grid of cards for Gemini voices (Kore, Puck, Charon, Fenrir, Aoede, Leda, Orus, Zephyr)
  - Each card: name, tone description, play button for sample
- **Greeting** — text input for opening line
- **Tone slider** — Professional <-> Friendly (maps to prompt adjectives)

### Call Settings
- Max call duration (slider, 5-30 min, default 15)
- Record calls toggle (default on)
- Escalation threshold (misunderstandings before transfer, default 4)
- Emergency keywords (comma-separated, pre-filled with defaults)

### Advanced Prompt (collapsed by default)
- Toggle to expand full system prompt textarea
- "Reset to template" button
- Warning: "Editing directly disconnects from template settings above"
- When in custom mode, structured form becomes read-only

### Test & Logs (bottom section)
- **"Test Call" button** — browser-based Gemini Live session with current config
- **Recent calls** — last 10 call logs (date, duration, outcome, expandable transcript)

---

## Prompt Template System

### Template Variables
```
{businessName}      → from org settings
{agentName}         → from agent basics
{greeting}          → from voice & personality
{tone}              → "professional" | "friendly" | "warm and professional"
{servicesBlock}     → auto-generated from services list
{escalationCount}   → from call settings
{emergencyKeywords} → from call settings
```

### Template Structure
```
You are {agentName}, a {tone} AI phone assistant for {businessName}.

CALL HANDLING RULES:
1. Start every call with: "{greeting}"
2. Be patient with audio quality — phone calls can have noise. Ask callers to
   repeat if needed, but do NOT escalate unless they ask or you cannot understand
   after {escalationCount} attempts.
3. Only provide price RANGES, never exact prices.
4. If the customer mentions any emergency keyword ({emergencyKeywords}),
   immediately acknowledge and alert the team.
5. Always be professional, warm, and conversational.
6. Collect customer name, phone, and address when booking.
7. Confirm all appointment details before finalizing.

SERVICES & PRICING:
{servicesBlock}

VOICE STYLE:
- Keep responses short (1-2 sentences at a time)
- Sound {tone}, not scripted
- Use natural filler words occasionally
- Wait for the caller to finish before responding
```

### Prompt Modes
- `template` mode: structured form drives prompt generation
- `custom` mode: user edits raw prompt, form becomes read-only
- "Reset to template" regenerates from current form values
- Flag stored as `settings.promptMode`

---

## Voice Preview & Test Call

### Voice Preview (sample playback)
- Pre-recorded clips for each Gemini voice
- Static audio files served from frontend
- Play/pause on each voice card — no API call needed

### Test Call (live browser session)
- Uses existing `/orgs/:orgId/gemini/session-token` endpoint
- Pass current (unsaved) agent config in request
- Browser Web Audio API + WebSocket → direct to Gemini (no Twilio, no phone cost)
- Floating panel: "Testing agent... [Stop Test]" with timer
- User talks through mic, hears agent through speakers

### Recording & Transcription
- `settings.recordingEnabled` toggle on agent
- Gemini call bridge already captures input/output transcripts
- Stored in `ai_call_logs.transcript`
- Displayed in agent editor's Recent Calls section

---

## Data Model

### `ai_agents.settings` JSONB additions
```json
{
  "promptMode": "template | custom",
  "greeting": "Hi, this is Sam from Northern Removals...",
  "tone": "professional | friendly | balanced",
  "services": [
    { "name": "General rubbish removal", "priceLow": 150, "priceHigh": 400 },
    { "name": "Green waste removal", "priceLow": 100, "priceHigh": 300 }
  ],
  "maxDurationMinutes": 15,
  "recordingEnabled": true,
  "escalationThreshold": 4,
  "emergencyKeywords": ["flooding", "gas leak", "fire", "carbon monoxide"]
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

## Scope Boundaries (v1)

**In scope:**
- Agent CRUD (create, edit, delete, list)
- Template-based prompt generation with vertical-specific templates
- Advanced raw prompt editing
- Gemini voice selection with sample playback
- Live test call from browser
- Call recording toggle
- Call transcription display
- Call settings (duration, escalation, emergency keywords)

**Out of scope (future):**
- SMS/chat/review agent types
- Multi-agent per org / per-number routing
- Voice cloning or custom voices
- Prompt A/B testing
- Call analytics dashboard
- Services table (separate from JSONB)
- Multi-language support
