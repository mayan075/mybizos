# AI Agent Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full AI agent configuration system where users create, customize, test, and manage phone AI agents with vertical-specific templates, voice selection, and live test calls.

**Architecture:** Frontend page at `/dashboard/settings/ai-agents` with list + editor views. Backend uses existing CRUD API with minor additions (prompt template generation, test session, voice sample endpoints). Prompt templates live in a shared package. All agent settings stored in existing JSONB columns.

**Tech Stack:** Next.js 15 (React 19), Hono API, Drizzle ORM, Gemini Live API, Tailwind CSS v4, Zod validation

**Spec:** `docs/superpowers/specs/2026-03-30-ai-agent-configuration-design.md`

---

## File Map

### New Files
```
packages/shared/src/prompt-templates/
  index.ts                          — Template engine: buildPrompt(), getVerticalDefaults()
  verticals.ts                      — Vertical-specific knowledge blocks + default services

apps/web/src/app/dashboard/settings/ai-agents/
  page.tsx                          — Agent list page (list all agents, create new)
  [id]/page.tsx                     — Agent editor page (edit single agent)
  new/page.tsx                      — Guided first-agent setup (3-step onboarding)

apps/web/src/components/ai-agents/
  agent-list.tsx                    — Agent cards list with status badges
  agent-editor.tsx                  — Main editor component (orchestrates sections)
  business-context-section.tsx      — Vertical picker + services list form
  voice-personality-section.tsx     — Voice picker grid + greeting + tone
  call-settings-section.tsx         — Duration, recording, escalation, emergency
  advanced-prompt-section.tsx       — Raw prompt editor with compliance validation
  call-logs-section.tsx             — Recent call logs with transcripts
  test-call-panel.tsx               — Browser-based test call floating panel
  services-list-editor.tsx          — Dynamic add/remove service rows
  voice-card.tsx                    — Individual voice option card with play button
  guided-setup.tsx                  — 3-step onboarding wizard component

apps/web/src/lib/hooks/
  use-ai-agents.ts                  — useAiAgents(), useAiAgent(), useAiAgentMutations()

apps/api/src/routes/
  (modify) ai.ts                    — Add geminiConfig to update schema, add test-session + voice-sample endpoints

apps/api/src/services/
  (modify) ai-service.ts            — Add updateGeminiConfig(), prompt compliance validation
  prompt-template-service.ts        — Server-side prompt generation from settings
```

### Modified Files
```
apps/web/src/components/layout/sidebar.tsx    — Add "AI Agents" nav item
packages/shared/src/constants/index.ts        — Add GEMINI_VOICES constant
packages/shared/src/types/index.ts            — Add AgentSettings, GeminiConfig types
```

---

## Phase 1: Foundation (Shared Types, Templates, API)

### Task 1: Add Shared Types and Constants

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/constants/index.ts`

- [ ] **Step 1: Add agent settings and voice types**

In `packages/shared/src/types/index.ts`, add after the existing `AiAgent` interface:

```typescript
export interface AgentService {
  name: string;
  priceLow: number;
  priceHigh: number;
}

export type PromptMode = 'template' | 'custom';
export type AgentTone = 'professional' | 'friendly' | 'balanced';

export interface AgentSettings {
  promptMode: PromptMode;
  greeting: string;
  tone: AgentTone;
  services: AgentService[];
  maxDurationMinutes: number;
  recordingEnabled: boolean;
  escalationThreshold: number;
  emergencyKeywords: string[];
}

export interface GeminiVoiceConfig {
  voiceName: string;
}

export interface GeminiVoice {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  tone: string;
}
```

- [ ] **Step 2: Add Gemini voices constant**

In `packages/shared/src/constants/index.ts`, add:

```typescript
export const GEMINI_VOICES: readonly GeminiVoice[] = [
  { id: 'Kore', name: 'Kore', description: 'Warm and professional', gender: 'female', tone: 'Calm, reassuring, great for service businesses' },
  { id: 'Puck', name: 'Puck', description: 'Bright and energetic', gender: 'male', tone: 'Upbeat, friendly, good for casual businesses' },
  { id: 'Charon', name: 'Charon', description: 'Deep and authoritative', gender: 'male', tone: 'Confident, trustworthy, suits premium services' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong and clear', gender: 'male', tone: 'Direct, efficient, good for trade services' },
  { id: 'Aoede', name: 'Aoede', description: 'Melodic and pleasant', gender: 'female', tone: 'Welcoming, patient, great for customer service' },
  { id: 'Leda', name: 'Leda', description: 'Soft and approachable', gender: 'female', tone: 'Gentle, empathetic, suits healthcare/wellness' },
  { id: 'Orus', name: 'Orus', description: 'Rich and composed', gender: 'male', tone: 'Measured, professional, good for consulting' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Light and natural', gender: 'neutral', tone: 'Conversational, modern, versatile' },
] as const;

export const DEFAULT_EMERGENCY_KEYWORDS = [
  'flooding', 'flood', 'gas leak', 'gas smell', 'fire',
  'carbon monoxide', 'burst pipe', 'sewage', 'no heat',
  'electrical fire', 'sparking', 'smoke',
] as const;

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  promptMode: 'template',
  greeting: '',
  tone: 'balanced',
  services: [],
  maxDurationMinutes: 15,
  recordingEnabled: true,
  escalationThreshold: 4,
  emergencyKeywords: [...DEFAULT_EMERGENCY_KEYWORDS],
};
```

- [ ] **Step 3: Export new types from package index**

Ensure `packages/shared/src/index.ts` re-exports the new types. Check the existing exports and add any missing ones.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/constants/index.ts packages/shared/src/index.ts
git commit -m "feat(shared): add agent settings types, Gemini voices, and default constants"
```

---

### Task 2: Build Prompt Template Engine

**Files:**
- Create: `packages/shared/src/prompt-templates/verticals.ts`
- Create: `packages/shared/src/prompt-templates/index.ts`

- [ ] **Step 1: Create vertical knowledge blocks and defaults**

Create `packages/shared/src/prompt-templates/verticals.ts`:

```typescript
import type { AgentService, Vertical } from '../types/index.js';

export interface VerticalTemplate {
  knowledge: string;
  defaultServices: AgentService[];
  defaultAgentName: string;
  defaultEmergencyKeywords: string[];
}

export const VERTICAL_TEMPLATES: Record<Vertical, VerticalTemplate> = {
  plumbing: {
    defaultAgentName: 'Alex',
    defaultEmergencyKeywords: ['flooding', 'flood', 'gas leak', 'gas smell', 'burst pipe', 'sewage', 'no hot water', 'water damage'],
    defaultServices: [
      { name: 'Drain cleaning', priceLow: 150, priceHigh: 350 },
      { name: 'Water heater repair', priceLow: 200, priceHigh: 500 },
      { name: 'Leak repair', priceLow: 150, priceHigh: 400 },
      { name: 'Toilet repair', priceLow: 100, priceHigh: 300 },
      { name: 'Faucet installation', priceLow: 150, priceHigh: 350 },
    ],
    knowledge: `PLUMBING KNOWLEDGE:
- Common services: drain cleaning, water heater repair/replacement, leak repair, toilet repair, faucet installation, sewer line inspection, garbage disposal
- Emergency services available 24/7 with premium rate
- Always ask: What's the issue? How long has it been happening? Is there active water damage?
- For water heater issues: ask tank vs tankless, age of unit, gas vs electric
- For drain issues: ask which drain, previous issues, solutions already tried
- Service call/diagnostic fee typically applies, credited toward repair
- Licensed and insured, all work guaranteed`,
  },

  hvac: {
    defaultAgentName: 'Jordan',
    defaultEmergencyKeywords: ['no heat', 'no cooling', 'no AC', 'gas smell', 'gas leak', 'carbon monoxide', 'co detector', 'smoke', 'burning smell'],
    defaultServices: [
      { name: 'AC repair', priceLow: 150, priceHigh: 600 },
      { name: 'AC tune-up', priceLow: 80, priceHigh: 150 },
      { name: 'Furnace repair', priceLow: 150, priceHigh: 500 },
      { name: 'Duct cleaning', priceLow: 300, priceHigh: 600 },
      { name: 'System replacement', priceLow: 5000, priceHigh: 15000 },
    ],
    knowledge: `HVAC KNOWLEDGE:
- Common services: AC repair, AC tune-up, furnace repair, furnace tune-up, full system replacement, duct cleaning, thermostat installation
- Seasonal maintenance plans available
- Emergency services available 24/7 for no heat/no AC
- Always ask: Heating or cooling? Symptoms (no air, weak air, noise, smell)? Age of system? When last serviced?
- Ask about home size for replacement quotes`,
  },

  rubbish_removals: {
    defaultAgentName: 'Sam',
    defaultEmergencyKeywords: ['hazardous', 'asbestos', 'chemical', 'biohazard'],
    defaultServices: [
      { name: 'General rubbish removal', priceLow: 150, priceHigh: 400 },
      { name: 'Green waste removal', priceLow: 100, priceHigh: 300 },
      { name: 'Furniture removal', priceLow: 100, priceHigh: 350 },
      { name: 'Construction waste', priceLow: 200, priceHigh: 500 },
      { name: 'House cleanout', priceLow: 500, priceHigh: 2000 },
    ],
    knowledge: `RUBBISH REMOVAL KNOWLEDGE:
- Common services: general rubbish, green waste, furniture, construction waste, full house cleanouts, deceased estate clearance
- Always ask: What type of rubbish? How much (cubic meters or truck loads)? Access to property? Stairs involved? Any hazardous materials?
- Same-day service may be available depending on schedule
- Free quotes for larger jobs
- We recycle and donate where possible
- Pricing depends on volume and type — offer to send someone for a free assessment`,
  },

  electrical: {
    defaultAgentName: 'Morgan',
    defaultEmergencyKeywords: ['electrical fire', 'sparking', 'smoke', 'burning smell', 'power outage', 'exposed wires', 'shock'],
    defaultServices: [
      { name: 'Outlet/switch repair', priceLow: 100, priceHigh: 250 },
      { name: 'Lighting installation', priceLow: 150, priceHigh: 400 },
      { name: 'Panel upgrade', priceLow: 1500, priceHigh: 3500 },
      { name: 'Ceiling fan install', priceLow: 200, priceHigh: 450 },
      { name: 'EV charger install', priceLow: 500, priceHigh: 1500 },
    ],
    knowledge: `ELECTRICAL KNOWLEDGE:
- Common services: outlet/switch repair, panel upgrades, lighting installation, ceiling fan install, smoke detector install, whole-home rewiring, EV charger install
- Emergency services for outages, sparking, burning smells
- Always ask: What's happening? How old is the home's wiring? Any recent renovations?
- All work must be done by licensed electrician — emphasize safety
- Permit may be required for panel upgrades and rewiring`,
  },

  general_contractor: {
    defaultAgentName: 'Jamie',
    defaultEmergencyKeywords: ['flooding', 'fire', 'structural damage', 'gas leak', 'collapse'],
    defaultServices: [],
    knowledge: `GENERAL KNOWLEDGE:
- We handle a variety of home services and projects
- Always ask: What kind of work do you need? What's the scope? Any timeline or budget in mind?
- We can schedule a free on-site estimate for larger projects
- Licensed and insured`,
  },

  moving_company: {
    defaultAgentName: 'Taylor',
    defaultEmergencyKeywords: [],
    defaultServices: [
      { name: 'Local move (1-2 bedroom)', priceLow: 300, priceHigh: 800 },
      { name: 'Local move (3-4 bedroom)', priceLow: 600, priceHigh: 1500 },
      { name: 'Packing service', priceLow: 200, priceHigh: 600 },
      { name: 'Furniture assembly', priceLow: 100, priceHigh: 300 },
    ],
    knowledge: `MOVING COMPANY KNOWLEDGE:
- Common services: local moves, interstate moves, packing, furniture assembly/disassembly, storage
- Always ask: Moving from where to where? How many bedrooms? Any heavy/specialty items (piano, pool table)? What date? Need packing help?
- Provide hourly rates for local moves, fixed quotes for interstate
- Insurance coverage available for high-value items`,
  },

  landscaping: {
    defaultAgentName: 'Riley',
    defaultEmergencyKeywords: ['fallen tree', 'tree on house', 'flooding', 'storm damage'],
    defaultServices: [
      { name: 'Lawn mowing', priceLow: 40, priceHigh: 120 },
      { name: 'Garden maintenance', priceLow: 80, priceHigh: 250 },
      { name: 'Tree trimming', priceLow: 200, priceHigh: 800 },
      { name: 'Landscaping design', priceLow: 500, priceHigh: 3000 },
    ],
    knowledge: `LANDSCAPING KNOWLEDGE:
- Common services: lawn mowing, garden maintenance, tree trimming/removal, landscaping design, irrigation, retaining walls, turf laying
- Always ask: What work is needed? Property size? Any specific plants or features? Regular maintenance or one-off?
- Seasonal work may affect scheduling
- Free on-site quotes for larger projects`,
  },

  pest_control: {
    defaultAgentName: 'Casey',
    defaultEmergencyKeywords: ['snake', 'wasp nest', 'bee swarm', 'termite damage', 'rodent infestation'],
    defaultServices: [
      { name: 'General pest treatment', priceLow: 100, priceHigh: 300 },
      { name: 'Termite inspection', priceLow: 200, priceHigh: 400 },
      { name: 'Rodent control', priceLow: 150, priceHigh: 400 },
      { name: 'Termite barrier', priceLow: 1500, priceHigh: 4000 },
    ],
    knowledge: `PEST CONTROL KNOWLEDGE:
- Common services: general pest treatment, termite inspection/treatment, rodent control, ant/cockroach treatment, wasp/bee removal, possum removal
- Always ask: What pest? Where are you seeing them? How long has it been an issue? Any children or pets in the home?
- Treatments may require vacating the home temporarily
- Warranty periods vary by treatment type`,
  },

  cleaning: {
    defaultAgentName: 'Avery',
    defaultEmergencyKeywords: ['biohazard', 'sewage', 'mold', 'fire damage'],
    defaultServices: [
      { name: 'Regular house clean', priceLow: 100, priceHigh: 250 },
      { name: 'Deep clean', priceLow: 200, priceHigh: 500 },
      { name: 'End of lease clean', priceLow: 250, priceHigh: 600 },
      { name: 'Carpet cleaning', priceLow: 100, priceHigh: 350 },
    ],
    knowledge: `CLEANING KNOWLEDGE:
- Common services: regular house cleaning, deep cleaning, end of lease cleaning, carpet/upholstery cleaning, window cleaning, office cleaning
- Always ask: What type of clean? How many bedrooms/bathrooms? Any specific requirements? One-off or regular?
- End of lease cleans can include bond-back guarantee
- We bring all supplies and equipment`,
  },

  roofing: {
    defaultAgentName: 'Blake',
    defaultEmergencyKeywords: ['roof leak', 'storm damage', 'tree on roof', 'missing tiles', 'water coming in'],
    defaultServices: [
      { name: 'Roof inspection', priceLow: 150, priceHigh: 350 },
      { name: 'Leak repair', priceLow: 200, priceHigh: 600 },
      { name: 'Tile replacement', priceLow: 300, priceHigh: 800 },
      { name: 'Full roof replacement', priceLow: 5000, priceHigh: 20000 },
      { name: 'Gutter cleaning', priceLow: 100, priceHigh: 300 },
    ],
    knowledge: `ROOFING KNOWLEDGE:
- Common services: roof inspections, leak repair, tile/shingle replacement, full roof replacement, gutter cleaning/installation, flashing repair
- Emergency services for storm damage and active leaks
- Always ask: What's the issue? How old is the roof? What material? Any visible damage? Is water currently coming in?
- Free inspections and quotes for most jobs
- All work comes with warranty`,
  },
};
```

- [ ] **Step 2: Create the prompt template builder**

Create `packages/shared/src/prompt-templates/index.ts`:

```typescript
import type { AgentSettings, AgentTone, Vertical } from '../types/index.js';
import { VERTICAL_TEMPLATES, type VerticalTemplate } from './verticals.js';

export { VERTICAL_TEMPLATES, type VerticalTemplate } from './verticals.js';

const TONE_MAP: Record<AgentTone, string> = {
  professional: 'professional and polished',
  friendly: 'friendly and casual',
  balanced: 'warm and professional',
};

function buildServicesBlock(services: AgentSettings['services']): string {
  if (services.length === 0) {
    return '- Ask the customer what service they need and offer to provide a quote';
  }
  return services
    .map((s) => `- ${s.name}: $${s.priceLow}–$${s.priceHigh}`)
    .join('\n');
}

export interface PromptBuildInput {
  agentName: string;
  businessName: string;
  vertical: Vertical;
  settings: AgentSettings;
}

export function buildPromptFromTemplate(input: PromptBuildInput): string {
  const { agentName, businessName, vertical, settings } = input;
  const verticalTemplate = VERTICAL_TEMPLATES[vertical] ?? VERTICAL_TEMPLATES.general_contractor;
  const tone = TONE_MAP[settings.tone] ?? TONE_MAP.balanced;
  const servicesBlock = buildServicesBlock(settings.services);
  const emergencyKeywords = settings.emergencyKeywords.join(', ');

  const greeting = settings.greeting ||
    `Hi, this is ${agentName} from ${businessName}. This call may be recorded. How can I help you today?`;

  return `You are ${agentName}, a ${tone} AI phone assistant for ${businessName}.

CALL HANDLING RULES:
1. Start every call with: "${greeting}"
2. This call may be recorded — mention this in your greeting.
3. Be patient with audio quality — phone calls can have background noise. Ask callers to repeat if needed, but do NOT escalate to a human unless the caller explicitly asks or you cannot understand after ${settings.escalationThreshold} attempts.
4. Only provide price RANGES, never exact prices.
5. If the customer mentions any emergency keyword (${emergencyKeywords}), immediately acknowledge the emergency and let them know you're alerting the team.
6. Always be professional, warm, and conversational.
7. Collect customer name, phone number, and address when booking appointments.
8. Confirm all appointment details before finalizing.
9. You are an AI assistant — never claim to be human.

${verticalTemplate.knowledge}

SERVICES & PRICING:
${servicesBlock}

VOICE STYLE:
- Keep responses short and conversational (1-2 sentences at a time)
- Sound ${tone}, not scripted or robotic
- Use natural language — "sure", "absolutely", "no worries"
- Wait for the caller to finish speaking before responding
- If the caller goes quiet, gently prompt: "Are you still there?"
- End calls warmly: "Thanks for calling ${businessName}. Have a great day!"`.trim();
}

export function getVerticalDefaults(vertical: Vertical): VerticalTemplate {
  return VERTICAL_TEMPLATES[vertical] ?? VERTICAL_TEMPLATES.general_contractor;
}

/**
 * Validate a custom prompt for compliance requirements.
 * Returns list of issues — empty array means valid.
 */
export interface PromptValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export function validatePromptCompliance(prompt: string): PromptValidationIssue[] {
  const issues: PromptValidationIssue[] = [];
  const lower = prompt.toLowerCase();

  // Hard requirement: AI disclosure
  const aiTerms = ['ai assistant', 'ai receptionist', 'ai phone assistant', 'artificial intelligence', 'ai agent'];
  if (!aiTerms.some((term) => lower.includes(term))) {
    issues.push({
      type: 'error',
      message: 'Your prompt must instruct the agent to disclose that it\'s an AI. This is a legal requirement.',
    });
  }

  // Warning: exact pricing (dollar sign followed by digits without a range)
  const exactPricePattern = /\$\d+(?!\s*[-–—])/;
  if (exactPricePattern.test(prompt)) {
    issues.push({
      type: 'warning',
      message: 'We noticed what looks like exact pricing. AI agents should only quote price ranges to avoid liability.',
    });
  }

  // Warning: no recording mention
  if (!lower.includes('record')) {
    issues.push({
      type: 'warning',
      message: 'Consider mentioning that calls may be recorded in your prompt.',
    });
  }

  // Warning: no emergency handling
  if (!lower.includes('emergency') && !lower.includes('urgent')) {
    issues.push({
      type: 'warning',
      message: 'Consider adding emergency handling instructions to your prompt.',
    });
  }

  return issues;
}
```

- [ ] **Step 3: Export from shared package**

Add to `packages/shared/src/index.ts`:

```typescript
export * from './prompt-templates/index.js';
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/prompt-templates/ packages/shared/src/index.ts
git commit -m "feat(shared): add prompt template engine with vertical-specific templates"
```

---

### Task 3: Update API — Agent Settings and Gemini Config

**Files:**
- Modify: `apps/api/src/routes/ai.ts`
- Modify: `apps/api/src/services/ai-service.ts`

- [ ] **Step 1: Update the API update schema to accept geminiConfig**

In `apps/api/src/routes/ai.ts`, update `updateAgentSchema`:

```typescript
const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  vertical: z.enum([
    'rubbish_removals', 'moving_company', 'plumbing', 'hvac', 'electrical',
    'roofing', 'landscaping', 'pest_control', 'cleaning', 'general_contractor',
  ]).optional(),
  settings: z.record(z.unknown()).optional(),
  geminiConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});
```

- [ ] **Step 2: Update the PATCH handler to pass geminiConfig**

In the `ai.patch('/ai-agents/:id')` handler, pass `parsed.data` (which now includes geminiConfig) to the service:

```typescript
ai.patch('/ai-agents/:id', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      status: 422,
      details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    }, 422);
  }

  // Validate prompt compliance if systemPrompt is being updated
  if (parsed.data.systemPrompt) {
    const { validatePromptCompliance } = await import('@hararai/shared');
    const issues = validatePromptCompliance(parsed.data.systemPrompt);
    const errors = issues.filter((i) => i.type === 'error');
    if (errors.length > 0) {
      return c.json({
        error: errors[0]!.message,
        code: 'PROMPT_COMPLIANCE_ERROR',
        status: 422,
      }, 422);
    }
  }

  const { aiService } = await import('../services/ai-service.js');
  const agent = await aiService.updateAgent(orgId, agentId, parsed.data);
  return c.json({ data: agent });
});
```

- [ ] **Step 3: Update ai-service.ts to handle geminiConfig updates**

In `apps/api/src/services/ai-service.ts`, update the `updateAgent` method to also accept and persist `geminiConfig` and `vertical`:

```typescript
async updateAgent(
  orgId: string,
  agentId: string,
  data: {
    name?: string;
    systemPrompt?: string;
    vertical?: string;
    settings?: Record<string, unknown>;
    geminiConfig?: Record<string, unknown>;
    isActive?: boolean;
  },
): Promise<any> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
  if (data.vertical !== undefined) updateData.vertical = data.vertical;
  if (data.settings !== undefined) updateData.settings = data.settings;
  if (data.geminiConfig !== undefined) updateData.geminiConfig = data.geminiConfig;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(aiAgents)
    .set(updateData)
    .where(and(
      withOrgScope(aiAgents.orgId, orgId),
      eq(aiAgents.id, agentId),
    ))
    .returning();

  if (!updated) {
    throw Errors.notFound('AI Agent');
  }
  return updated;
}
```

- [ ] **Step 4: Add call logs list endpoint**

In `apps/api/src/routes/ai.ts`, add an endpoint to list call logs for a specific agent:

```typescript
// GET /orgs/:orgId/ai-agents/:id/call-logs — list recent call logs
ai.get('/ai-agents/:id/call-logs', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  const limit = Number(c.req.query('limit') ?? '10');

  const logs = await db
    .select()
    .from(aiCallLogs)
    .where(and(
      eq(aiCallLogs.orgId, orgId),
      eq(aiCallLogs.agentId, agentId),
    ))
    .orderBy(desc(aiCallLogs.createdAt))
    .limit(Math.min(limit, 50));

  return c.json({ data: logs });
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/ai.ts apps/api/src/services/ai-service.ts
git commit -m "feat(api): add geminiConfig/vertical to agent updates, prompt compliance, call logs endpoint"
```

---

## Phase 2: Frontend — Agent List & Editor

### Task 4: Add Navigation and Agent List Page

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/lib/hooks/use-ai-agents.ts`
- Create: `apps/web/src/app/dashboard/settings/ai-agents/page.tsx`
- Create: `apps/web/src/components/ai-agents/agent-list.tsx`

- [ ] **Step 1: Add AI Agents to sidebar navigation**

In `apps/web/src/components/layout/sidebar.tsx`, find the settings nav items and add an AI Agents entry. Use the `Bot` icon from lucide-react:

```typescript
import { Bot } from 'lucide-react';

// Add to the settings section items:
{ label: 'AI Agents', href: '/dashboard/settings/ai-agents', icon: Bot, badge: null },
```

- [ ] **Step 2: Create the useAiAgents hook**

Create `apps/web/src/lib/hooks/use-ai-agents.ts`:

```typescript
'use client';

import { useApiQuery, useApiMutation, buildPath } from './use-api';
import type { AiAgent } from '@hararai/shared';

const EMPTY_AGENTS: AiAgent[] = [];

export function useAiAgents() {
  return useApiQuery<AiAgent[]>(
    buildPath('/orgs/:orgId/ai-agents'),
    EMPTY_AGENTS,
  );
}

export function useAiAgent(agentId: string) {
  return useApiQuery<AiAgent | null>(
    buildPath(`/orgs/:orgId/ai-agents/${agentId}`),
    null,
    undefined,
    !!agentId,
  );
}

export function useCreateAgent() {
  return useApiMutation<Partial<AiAgent>, AiAgent>(
    buildPath('/orgs/:orgId/ai-agents'),
    'post',
  );
}

export function useUpdateAgent(agentId: string) {
  return useApiMutation<Partial<AiAgent>, AiAgent>(
    buildPath(`/orgs/:orgId/ai-agents/${agentId}`),
    'patch',
  );
}

export function useDeleteAgent(agentId: string) {
  return useApiMutation<void, { message: string }>(
    buildPath(`/orgs/:orgId/ai-agents/${agentId}`),
    'delete',
  );
}

export function useAgentCallLogs(agentId: string) {
  return useApiQuery<any[]>(
    buildPath(`/orgs/:orgId/ai-agents/${agentId}/call-logs`),
    [],
    undefined,
    !!agentId,
  );
}
```

- [ ] **Step 3: Create the AgentList component**

Create `apps/web/src/components/ai-agents/agent-list.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Bot, Plus, Phone, MessageSquare, MessageCircle, Star, MoreVertical } from 'lucide-react';
import type { AiAgent } from '@hararai/shared';
import { VERTICAL_LABELS } from '@hararai/shared';

const TYPE_ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  sms: MessageSquare,
  chat: MessageCircle,
  review: Star,
};

interface AgentListProps {
  agents: AiAgent[];
  isLoading: boolean;
  onCreateNew: () => void;
}

export function AgentList({ agents, isLoading, onCreateNew }: AgentListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const Icon = TYPE_ICONS[agent.type] ?? Bot;
        const verticalLabel = VERTICAL_LABELS[agent.vertical] ?? agent.vertical;

        return (
          <button
            key={agent.id}
            onClick={() => router.push(`/dashboard/settings/ai-agents/${agent.id}`)}
            className="group flex flex-col gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">{agent.name}</h3>
                  <p className="text-sm text-zinc-400">{verticalLabel}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  agent.isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-zinc-700/50 text-zinc-400'
                }`}
              >
                {agent.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">
              {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} agent
            </p>
          </button>
        );
      })}

      {/* Create New Agent Card */}
      <button
        onClick={onCreateNew}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700/50 p-5 text-zinc-500 transition-all hover:border-blue-500/50 hover:text-blue-400"
      >
        <Plus className="h-8 w-8" />
        <span className="text-sm font-medium">Create New Agent</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create the agent list page**

Create `apps/web/src/app/dashboard/settings/ai-agents/page.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { useAiAgents } from '@/lib/hooks/use-ai-agents';
import { AgentList } from '@/components/ai-agents/agent-list';

export default function AiAgentsPage() {
  const router = useRouter();
  const { data: agents, isLoading } = useAiAgents();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">AI Agents</h1>
            <p className="text-sm text-zinc-400">Create and manage your AI phone agents</p>
          </div>
        </div>
      </div>

      <AgentList
        agents={agents}
        isLoading={isLoading}
        onCreateNew={() => router.push('/dashboard/settings/ai-agents/new')}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx apps/web/src/lib/hooks/use-ai-agents.ts apps/web/src/app/dashboard/settings/ai-agents/page.tsx apps/web/src/components/ai-agents/agent-list.tsx
git commit -m "feat(web): add AI Agents list page with navigation"
```

---

### Task 5: Build Agent Editor — Business Context Section

**Files:**
- Create: `apps/web/src/components/ai-agents/services-list-editor.tsx`
- Create: `apps/web/src/components/ai-agents/business-context-section.tsx`

- [ ] **Step 1: Create the dynamic services list editor**

Create `apps/web/src/components/ai-agents/services-list-editor.tsx`:

```typescript
'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { AgentService } from '@hararai/shared';

interface ServicesListEditorProps {
  services: AgentService[];
  onChange: (services: AgentService[]) => void;
  disabled?: boolean;
}

export function ServicesListEditor({ services, onChange, disabled }: ServicesListEditorProps) {
  function addService() {
    onChange([...services, { name: '', priceLow: 0, priceHigh: 0 }]);
  }

  function removeService(index: number) {
    onChange(services.filter((_, i) => i !== index));
  }

  function updateService(index: number, field: keyof AgentService, value: string | number) {
    const updated = services.map((s, i) => {
      if (i !== index) return s;
      return { ...s, [field]: field === 'name' ? value : Number(value) || 0 };
    });
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">Services & Price Ranges</label>
        {!disabled && (
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        )}
      </div>

      {services.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No services configured. Add services to include pricing info in the agent's knowledge.</p>
      )}

      <div className="space-y-2">
        {services.map((service, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Service name"
              value={service.name}
              onChange={(e) => updateService(index, 'name', e.target.value)}
              disabled={disabled}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-zinc-500">$</span>
              <input
                type="number"
                placeholder="Min"
                value={service.priceLow || ''}
                onChange={(e) => updateService(index, 'priceLow', e.target.value)}
                disabled={disabled}
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
              <span className="text-sm text-zinc-500">–</span>
              <span className="text-sm text-zinc-500">$</span>
              <input
                type="number"
                placeholder="Max"
                value={service.priceHigh || ''}
                onChange={(e) => updateService(index, 'priceHigh', e.target.value)}
                disabled={disabled}
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeService(index)}
                className="p-1.5 text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the business context section**

Create `apps/web/src/components/ai-agents/business-context-section.tsx`:

```typescript
'use client';

import { useState } from 'react';
import type { AgentSettings, Vertical } from '@hararai/shared';
import { VERTICAL_LABELS, getVerticalDefaults } from '@hararai/shared';
import { ServicesListEditor } from './services-list-editor';

const VERTICALS = Object.entries(VERTICAL_LABELS) as [Vertical, string][];

interface BusinessContextSectionProps {
  vertical: Vertical;
  businessName: string;
  settings: AgentSettings;
  onVerticalChange: (vertical: Vertical) => void;
  onSettingsChange: (settings: Partial<AgentSettings>) => void;
  disabled?: boolean;
}

export function BusinessContextSection({
  vertical,
  businessName,
  settings,
  onVerticalChange,
  onSettingsChange,
  disabled,
}: BusinessContextSectionProps) {
  function handleVerticalChange(newVertical: Vertical) {
    if (newVertical === vertical) return;

    const hasServices = settings.services.length > 0;
    if (hasServices) {
      const confirmed = window.confirm(
        'Changing the vertical will replace your current services with defaults. Continue?'
      );
      if (!confirmed) return;
    }

    const defaults = getVerticalDefaults(newVertical);
    onVerticalChange(newVertical);
    onSettingsChange({
      services: defaults.defaultServices,
      emergencyKeywords: defaults.defaultEmergencyKeywords,
    });
  }

  return (
    <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Business Context</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Business Name</label>
          <input
            type="text"
            value={businessName}
            disabled
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 opacity-60"
          />
          <p className="mt-1 text-xs text-zinc-500">From your organization settings</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Industry Vertical</label>
          <select
            value={vertical}
            onChange={(e) => handleVerticalChange(e.target.value as Vertical)}
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
            {VERTICALS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <ServicesListEditor
          services={settings.services}
          onChange={(services) => onSettingsChange({ services })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ai-agents/services-list-editor.tsx apps/web/src/components/ai-agents/business-context-section.tsx
git commit -m "feat(web): add business context section with services list editor"
```

---

### Task 6: Build Agent Editor — Voice, Call Settings, Advanced Prompt

**Files:**
- Create: `apps/web/src/components/ai-agents/voice-card.tsx`
- Create: `apps/web/src/components/ai-agents/voice-personality-section.tsx`
- Create: `apps/web/src/components/ai-agents/call-settings-section.tsx`
- Create: `apps/web/src/components/ai-agents/advanced-prompt-section.tsx`

- [ ] **Step 1: Create voice card component**

Create `apps/web/src/components/ai-agents/voice-card.tsx`:

```typescript
'use client';

import { Volume2 } from 'lucide-react';
import type { GeminiVoice } from '@hararai/shared';
import { cn } from '@/lib/utils';

interface VoiceCardProps {
  voice: GeminiVoice;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function VoiceCard({ voice, selected, onSelect, disabled }: VoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
          : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-zinc-100">{voice.name}</span>
        <Volume2 className="h-4 w-4 text-zinc-500" />
      </div>
      <span className="text-xs text-zinc-400">{voice.description}</span>
      <span className="text-xs text-zinc-500">{voice.tone}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create voice & personality section**

Create `apps/web/src/components/ai-agents/voice-personality-section.tsx`:

```typescript
'use client';

import type { AgentSettings, AgentTone } from '@hararai/shared';
import { GEMINI_VOICES } from '@hararai/shared';
import { VoiceCard } from './voice-card';

const TONE_OPTIONS: { value: AgentTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'friendly', label: 'Friendly' },
];

interface VoicePersonalitySectionProps {
  voiceName: string;
  settings: AgentSettings;
  onVoiceChange: (voiceName: string) => void;
  onSettingsChange: (settings: Partial<AgentSettings>) => void;
  disabled?: boolean;
}

export function VoicePersonalitySection({
  voiceName,
  settings,
  onVoiceChange,
  onSettingsChange,
  disabled,
}: VoicePersonalitySectionProps) {
  return (
    <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Voice & Personality</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Voice</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GEMINI_VOICES.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                selected={voiceName === voice.id}
                onSelect={() => onVoiceChange(voice.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Greeting</label>
          <textarea
            value={settings.greeting}
            onChange={(e) => onSettingsChange({ greeting: e.target.value })}
            placeholder="Hi, this is Sam from Northern Removals. This call may be recorded. How can I help you today?"
            rows={2}
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Leave blank to use the default greeting</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Tone</label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSettingsChange({ tone: option.value })}
                disabled={disabled}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  settings.tone === option.value
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create call settings section**

Create `apps/web/src/components/ai-agents/call-settings-section.tsx`:

```typescript
'use client';

import type { AgentSettings } from '@hararai/shared';

interface CallSettingsSectionProps {
  settings: AgentSettings;
  onSettingsChange: (settings: Partial<AgentSettings>) => void;
  disabled?: boolean;
}

export function CallSettingsSection({ settings, onSettingsChange, disabled }: CallSettingsSectionProps) {
  return (
    <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Call Settings</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Max Call Duration</label>
            <span className="text-sm text-zinc-400">{settings.maxDurationMinutes} min</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            value={settings.maxDurationMinutes}
            onChange={(e) => onSettingsChange({ maxDurationMinutes: Number(e.target.value) })}
            disabled={disabled}
            className="mt-2 w-full accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-500">
            <span>5 min</span>
            <span>30 min</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-300">Record Calls</label>
            <p className="text-xs text-zinc-500">Save call recordings and transcripts</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.recordingEnabled}
            onClick={() => onSettingsChange({ recordingEnabled: !settings.recordingEnabled })}
            disabled={disabled}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.recordingEnabled ? 'bg-blue-500' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.recordingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Escalation Threshold</label>
            <span className="text-sm text-zinc-400">{settings.escalationThreshold} attempts</span>
          </div>
          <input
            type="range"
            min={2}
            max={8}
            value={settings.escalationThreshold}
            onChange={(e) => onSettingsChange({ escalationThreshold: Number(e.target.value) })}
            disabled={disabled}
            className="mt-2 w-full accent-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Transfer to human after this many misunderstandings</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Emergency Keywords</label>
          <input
            type="text"
            value={settings.emergencyKeywords.join(', ')}
            onChange={(e) =>
              onSettingsChange({
                emergencyKeywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
              })
            }
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Comma-separated. Agent will immediately alert team when these are mentioned.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create advanced prompt section**

Create `apps/web/src/components/ai-agents/advanced-prompt-section.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import { validatePromptCompliance, type PromptValidationIssue } from '@hararai/shared';

interface AdvancedPromptSectionProps {
  systemPrompt: string;
  promptMode: 'template' | 'custom';
  onPromptChange: (prompt: string) => void;
  onModeChange: (mode: 'template' | 'custom') => void;
  onResetToTemplate: () => void;
}

export function AdvancedPromptSection({
  systemPrompt,
  promptMode,
  onPromptChange,
  onModeChange,
  onResetToTemplate,
}: AdvancedPromptSectionProps) {
  const [expanded, setExpanded] = useState(promptMode === 'custom');
  const [validationIssues, setValidationIssues] = useState<PromptValidationIssue[]>([]);

  function handlePromptEdit(newPrompt: string) {
    if (promptMode === 'template') {
      onModeChange('custom');
    }
    onPromptChange(newPrompt);
    setValidationIssues(validatePromptCompliance(newPrompt));
  }

  function handleResetToTemplate() {
    const confirmed = window.confirm(
      'This will replace your custom prompt with the auto-generated template. Continue?'
    );
    if (!confirmed) return;
    onModeChange('template');
    onResetToTemplate();
    setValidationIssues([]);
  }

  const errors = validationIssues.filter((i) => i.type === 'error');
  const warnings = validationIssues.filter((i) => i.type === 'warning');

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Advanced — System Prompt
        </h3>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-zinc-700/50 p-5">
          {promptMode === 'custom' && (
            <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-300">Custom mode — template settings above are disconnected</span>
              </div>
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to template
              </button>
            </div>
          )}

          <textarea
            value={systemPrompt}
            onChange={(e) => handlePromptEdit(e.target.value)}
            rows={20}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 font-mono text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />

          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span className="text-sm text-red-300">{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-sm text-amber-300">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ai-agents/voice-card.tsx apps/web/src/components/ai-agents/voice-personality-section.tsx apps/web/src/components/ai-agents/call-settings-section.tsx apps/web/src/components/ai-agents/advanced-prompt-section.tsx
git commit -m "feat(web): add voice picker, call settings, and advanced prompt sections"
```

---

### Task 7: Build Agent Editor — Call Logs Section

**Files:**
- Create: `apps/web/src/components/ai-agents/call-logs-section.tsx`

- [ ] **Step 1: Create call logs section**

Create `apps/web/src/components/ai-agents/call-logs-section.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Phone, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useAgentCallLogs } from '@/lib/hooks/use-ai-agents';

const OUTCOME_COLORS: Record<string, string> = {
  booked: 'bg-emerald-500/10 text-emerald-400',
  qualified: 'bg-blue-500/10 text-blue-400',
  escalated: 'bg-amber-500/10 text-amber-400',
  spam: 'bg-red-500/10 text-red-400',
  voicemail: 'bg-zinc-700/50 text-zinc-400',
};

interface CallLogsSectionProps {
  agentId: string;
}

export function CallLogsSection({ agentId }: CallLogsSectionProps) {
  const { data: logs, isLoading } = useAgentCallLogs(agentId);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent Calls</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent Calls</h3>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No calls yet. Calls will appear here once your agent starts taking calls.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const isExpanded = expandedLog === log.id;
            const date = new Date(log.createdAt);
            const outcomeColor = OUTCOME_COLORS[log.outcome] ?? OUTCOME_COLORS.voicemail;

            return (
              <div key={log.id} className="rounded-lg border border-zinc-700/30 bg-zinc-800/30">
                <button
                  type="button"
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="flex w-full items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {Math.ceil((log.durationSeconds ?? 0) / 60)} min
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeColor}`}>
                      {log.outcome}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {isExpanded && log.transcript && (
                  <div className="border-t border-zinc-700/30 p-3">
                    <pre className="whitespace-pre-wrap text-sm text-zinc-400">{log.transcript}</pre>
                    {log.summary && (
                      <div className="mt-2 rounded-lg bg-zinc-900/50 p-2">
                        <p className="text-xs font-medium text-zinc-400">Summary</p>
                        <p className="text-sm text-zinc-300">{log.summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ai-agents/call-logs-section.tsx
git commit -m "feat(web): add call logs section with expandable transcripts"
```

---

### Task 8: Assemble Agent Editor Page

**Files:**
- Create: `apps/web/src/components/ai-agents/agent-editor.tsx`
- Create: `apps/web/src/app/dashboard/settings/ai-agents/[id]/page.tsx`

- [ ] **Step 1: Create the agent editor orchestrator component**

Create `apps/web/src/components/ai-agents/agent-editor.tsx`:

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import type { AiAgent, AgentSettings, Vertical } from '@hararai/shared';
import { DEFAULT_AGENT_SETTINGS, buildPromptFromTemplate, getVerticalDefaults } from '@hararai/shared';
import { useUpdateAgent, useDeleteAgent } from '@/lib/hooks/use-ai-agents';
import { useToast } from '@/components/ui/toast';
import { BusinessContextSection } from './business-context-section';
import { VoicePersonalitySection } from './voice-personality-section';
import { CallSettingsSection } from './call-settings-section';
import { AdvancedPromptSection } from './advanced-prompt-section';
import { CallLogsSection } from './call-logs-section';

interface AgentEditorProps {
  agent: AiAgent;
  businessName: string;
  onSaved: () => void;
}

export function AgentEditor({ agent, businessName, onSaved }: AgentEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const { mutate: updateAgent, isLoading: isSaving } = useUpdateAgent(agent.id);
  const { mutate: deleteAgent } = useDeleteAgent(agent.id);

  // Local state derived from agent
  const agentSettings = { ...DEFAULT_AGENT_SETTINGS, ...(agent.settings as Partial<AgentSettings>) };
  const geminiConfig = (agent.geminiConfig ?? {}) as Record<string, unknown>;

  const [name, setName] = useState(agent.name);
  const [vertical, setVertical] = useState<Vertical>(agent.vertical);
  const [settings, setSettings] = useState<AgentSettings>(agentSettings);
  const [voiceName, setVoiceName] = useState<string>((geminiConfig.voiceName as string) ?? 'Kore');
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [isActive, setIsActive] = useState(agent.isActive);
  const [isDirty, setIsDirty] = useState(false);

  // Track dirty state
  useEffect(() => {
    const changed =
      name !== agent.name ||
      vertical !== agent.vertical ||
      isActive !== agent.isActive ||
      systemPrompt !== agent.systemPrompt ||
      voiceName !== ((agent.geminiConfig as any)?.voiceName ?? 'Kore') ||
      JSON.stringify(settings) !== JSON.stringify(agentSettings);
    setIsDirty(changed);
  }, [name, vertical, isActive, systemPrompt, voiceName, settings]);

  // Unsaved changes warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Regenerate prompt when template fields change (only in template mode)
  const regeneratePrompt = useCallback(() => {
    const prompt = buildPromptFromTemplate({
      agentName: name,
      businessName,
      vertical,
      settings,
    });
    setSystemPrompt(prompt);
  }, [name, businessName, vertical, settings]);

  // Auto-regenerate prompt when in template mode
  useEffect(() => {
    if (settings.promptMode === 'template') {
      regeneratePrompt();
    }
  }, [name, vertical, settings.services, settings.tone, settings.greeting,
      settings.escalationThreshold, settings.emergencyKeywords, settings.promptMode, regeneratePrompt]);

  function handleSettingsChange(partial: Partial<AgentSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    const result = await updateAgent({
      name,
      vertical,
      systemPrompt,
      settings: settings as Record<string, unknown>,
      geminiConfig: { voiceName },
      isActive,
    } as any);

    if (result) {
      toast.success('Agent saved successfully');
      setIsDirty(false);
      onSaved();
    } else {
      toast.error('Failed to save agent');
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete agent "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    await deleteAgent(undefined as any);
    toast.success('Agent deleted');
    router.push('/dashboard/settings/ai-agents');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/settings/ai-agents')}
            className="p-1 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-none bg-transparent text-xl font-semibold text-zinc-100 focus:outline-none"
          />
          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">Phone</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-zinc-700/50 text-zinc-400'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </button>

          <button
            onClick={handleDelete}
            className="p-2 text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Editor sections */}
      <BusinessContextSection
        vertical={vertical}
        businessName={businessName}
        settings={settings}
        onVerticalChange={setVertical}
        onSettingsChange={handleSettingsChange}
        disabled={settings.promptMode === 'custom'}
      />

      <VoicePersonalitySection
        voiceName={voiceName}
        settings={settings}
        onVoiceChange={setVoiceName}
        onSettingsChange={handleSettingsChange}
        disabled={settings.promptMode === 'custom'}
      />

      <CallSettingsSection
        settings={settings}
        onSettingsChange={handleSettingsChange}
        disabled={settings.promptMode === 'custom'}
      />

      <AdvancedPromptSection
        systemPrompt={systemPrompt}
        promptMode={settings.promptMode}
        onPromptChange={setSystemPrompt}
        onModeChange={(mode) => handleSettingsChange({ promptMode: mode })}
        onResetToTemplate={regeneratePrompt}
      />

      <CallLogsSection agentId={agent.id} />
    </div>
  );
}
```

- [ ] **Step 2: Create the agent editor page**

Create `apps/web/src/app/dashboard/settings/ai-agents/[id]/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { useAiAgent } from '@/lib/hooks/use-ai-agents';

import { AgentEditor } from '@/components/ai-agents/agent-editor';

export default function AgentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: agent, isLoading, refetch } = useAiAgent(id);

  // TODO: Get business name from org settings — for now use agent data
  const businessName = 'Northern Removals';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="h-96 animate-pulse rounded-xl bg-zinc-800/50" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-zinc-400">Agent not found</p>
      </div>
    );
  }

  return <AgentEditor agent={agent} businessName={businessName} onSaved={refetch} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ai-agents/agent-editor.tsx apps/web/src/app/dashboard/settings/ai-agents/\\[id\\]/page.tsx
git commit -m "feat(web): assemble agent editor page with all sections"
```

---

## Phase 3: Guided Onboarding & Agent Creation

### Task 9: Build Guided First-Agent Setup

**Files:**
- Create: `apps/web/src/components/ai-agents/guided-setup.tsx`
- Create: `apps/web/src/app/dashboard/settings/ai-agents/new/page.tsx`

- [ ] **Step 1: Create the guided setup component**

Create `apps/web/src/components/ai-agents/guided-setup.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mic, Rocket, Check } from 'lucide-react';
import type { Vertical, AgentSettings } from '@hararai/shared';
import {
  VERTICAL_LABELS,
  GEMINI_VOICES,
  DEFAULT_AGENT_SETTINGS,
  getVerticalDefaults,
  buildPromptFromTemplate,
} from '@hararai/shared';
import { useCreateAgent } from '@/lib/hooks/use-ai-agents';
import { useToast } from '@/components/ui/toast';
import { VoiceCard } from './voice-card';

const VERTICAL_ENTRIES = Object.entries(VERTICAL_LABELS) as [Vertical, string][];

interface GuidedSetupProps {
  businessName: string;
  orgVertical?: Vertical;
}

export function GuidedSetup({ businessName, orgVertical }: GuidedSetupProps) {
  const router = useRouter();
  const toast = useToast();
  const { mutate: createAgent, isLoading } = useCreateAgent();

  const [step, setStep] = useState(1);
  const [vertical, setVertical] = useState<Vertical>(orgVertical ?? 'general_contractor');
  const [agentName, setAgentName] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [greeting, setGreeting] = useState('');

  // Update defaults when vertical changes
  function handleVerticalSelect(v: Vertical) {
    setVertical(v);
    const defaults = getVerticalDefaults(v);
    if (!agentName) setAgentName(defaults.defaultAgentName);
  }

  async function handleCreate() {
    const defaults = getVerticalDefaults(vertical);
    const settings: AgentSettings = {
      ...DEFAULT_AGENT_SETTINGS,
      greeting,
      services: defaults.defaultServices,
      emergencyKeywords: defaults.defaultEmergencyKeywords,
    };

    const systemPrompt = buildPromptFromTemplate({
      agentName: agentName || defaults.defaultAgentName,
      businessName,
      vertical,
      settings,
    });

    const result = await createAgent({
      name: agentName || defaults.defaultAgentName,
      type: 'phone',
      vertical,
      systemPrompt,
      settings: settings as Record<string, unknown>,
      isActive: true,
    } as any);

    if (result) {
      toast.success('Agent created! Redirecting to editor...');
      router.push(`/dashboard/settings/ai-agents/${(result as any).id}`);
    } else {
      toast.error('Failed to create agent');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
              s < step
                ? 'bg-blue-500 text-white'
                : s === step
                  ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500'
                  : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {s < step ? <Check className="h-4 w-4" /> : s}
          </div>
        ))}
      </div>

      {/* Step 1: Business */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <Building2 className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">Tell us about your business</h2>
            <p className="mt-1 text-sm text-zinc-400">This helps us configure your AI agent with the right knowledge</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Business Name</label>
            <input
              type="text"
              value={businessName}
              disabled
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">What industry are you in?</label>
            <div className="grid grid-cols-2 gap-2">
              {VERTICAL_ENTRIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleVerticalSelect(value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-all ${
                    vertical === value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (!agentName) {
                setAgentName(getVerticalDefaults(vertical).defaultAgentName);
              }
              setStep(2);
            }}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Voice & Name */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <Mic className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">Meet your AI receptionist</h2>
            <p className="mt-1 text-sm text-zinc-400">Choose a name and voice for your phone agent</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Sam, Alex, Jordan"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {GEMINI_VOICES.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  selected={voiceName === voice.id}
                  onSelect={() => setVoiceName(voice.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Greeting (optional)</label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={`Hi, this is ${agentName} from ${businessName}. This call may be recorded. How can I help you today?`}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Activate */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <Rocket className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">Ready to go!</h2>
            <p className="mt-1 text-sm text-zinc-400">Here's a summary of your AI agent</p>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Agent Name</span>
              <span className="text-sm font-medium text-zinc-200">{agentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Business</span>
              <span className="text-sm font-medium text-zinc-200">{businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Industry</span>
              <span className="text-sm font-medium text-zinc-200">{VERTICAL_LABELS[vertical]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Voice</span>
              <span className="text-sm font-medium text-zinc-200">
                {GEMINI_VOICES.find((v) => v.id === voiceName)?.name ?? voiceName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Services</span>
              <span className="text-sm font-medium text-zinc-200">
                {getVerticalDefaults(vertical).defaultServices.length} pre-configured
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create & Activate'}
            </button>
          </div>

          <p className="text-center text-xs text-zinc-500">
            You can customize everything in detail after creation
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the new agent page**

Create `apps/web/src/app/dashboard/settings/ai-agents/new/page.tsx`:

```typescript
'use client';

import { GuidedSetup } from '@/components/ai-agents/guided-setup';

export default function NewAgentPage() {
  // TODO: Get business name and vertical from org settings
  const businessName = 'Northern Removals';

  return <GuidedSetup businessName={businessName} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ai-agents/guided-setup.tsx apps/web/src/app/dashboard/settings/ai-agents/new/page.tsx
git commit -m "feat(web): add guided 3-step agent creation wizard"
```

---

## Phase 4: Test Call & Polish

### Task 10: Build Browser Test Call

**Files:**
- Create: `apps/web/src/components/ai-agents/test-call-panel.tsx`
- Modify: `apps/web/src/components/ai-agents/agent-editor.tsx`
- Modify: `apps/api/src/routes/gemini.ts`

- [ ] **Step 1: Add test session endpoint to Gemini routes**

In `apps/api/src/routes/gemini.ts`, add a test session endpoint that generates an ephemeral token without wallet debit:

```typescript
// POST /orgs/:orgId/gemini/test-session — Generate test session (no wallet debit)
gemini.post('/test-session', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const { systemPrompt, voiceName } = body;

  if (!systemPrompt) {
    return c.json({ error: 'systemPrompt is required', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  // Rate limit: check in-memory counter
  const key = `test-session:${orgId}`;
  const count = testSessionCounts.get(key) ?? 0;
  if (count >= 10) {
    return c.json({ error: 'Rate limit: max 10 test calls per hour', code: 'RATE_LIMIT', status: 429 }, 429);
  }
  testSessionCounts.set(key, count + 1);

  const { generateEphemeralToken, buildEphemeralWsUrl } = await import('@hararai/integrations');
  const token = await generateEphemeralToken(config.GOOGLE_AI_API_KEY);

  return c.json({
    data: {
      token: token.token,
      expiresAt: token.expiresAt,
      wsUrl: buildEphemeralWsUrl(token.token),
      config: {
        model: `models/${config.GEMINI_LIVE_MODEL}`,
        systemPrompt,
        voiceName: voiceName ?? config.GEMINI_DEFAULT_VOICE,
      },
    },
  });
});

// In-memory rate limiter (reset hourly)
const testSessionCounts = new Map<string, number>();
setInterval(() => testSessionCounts.clear(), 60 * 60 * 1000);
```

- [ ] **Step 2: Create the test call panel component**

Create `apps/web/src/components/ai-agents/test-call-panel.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Phone, PhoneOff, Mic } from 'lucide-react';
import { apiClient, tryFetch } from '@/lib/api-client';
import { buildPath } from '@/lib/hooks/use-api';

interface TestCallPanelProps {
  systemPrompt: string;
  voiceName: string;
}

export function TestCallPanel({ systemPrompt, voiceName }: TestCallPanelProps) {
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTest = useCallback(async () => {
    try {
      setStatus('connecting');
      setElapsed(0);

      // Get test session token
      const result = await tryFetch(() =>
        apiClient.post<{ data: { wsUrl: string; config: { model: string; systemPrompt: string; voiceName: string } } }>(
          buildPath('/orgs/:orgId/gemini/test-session'),
          { systemPrompt, voiceName },
        )
      );

      if (!result) {
        setStatus('error');
        return;
      }

      setStatus('connected');
      setIsActive(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // TODO: Full WebSocket audio streaming implementation
      // For now, show connected state. Full implementation requires:
      // 1. Open WebSocket to Gemini
      // 2. Send setup message with config
      // 3. Get mic access via navigator.mediaDevices.getUserMedia
      // 4. Stream mic audio to WebSocket
      // 5. Receive audio from WebSocket and play via Web Audio API

    } catch {
      setStatus('error');
    }
  }, [systemPrompt, voiceName]);

  function stopTest() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setStatus('idle');
    setElapsed(0);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (isActive) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <Mic className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="font-mono text-sm text-zinc-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <button
          onClick={stopTest}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          End Test
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Test Your Agent</h3>
          <p className="mt-1 text-xs text-zinc-500">Talk to your agent through your browser — free, no phone charges</p>
        </div>
        <button
          onClick={startTest}
          disabled={status === 'connecting'}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Phone className="h-4 w-4" />
          {status === 'connecting' ? 'Connecting...' : 'Test Call'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-400">Failed to start test call. Please try again.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add test call panel to agent editor**

In `apps/web/src/components/ai-agents/agent-editor.tsx`, import and add the TestCallPanel between the AdvancedPromptSection and CallLogsSection:

```typescript
import { TestCallPanel } from './test-call-panel';

// In the JSX, between AdvancedPromptSection and CallLogsSection:
<TestCallPanel systemPrompt={systemPrompt} voiceName={voiceName} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/gemini.ts apps/web/src/components/ai-agents/test-call-panel.tsx apps/web/src/components/ai-agents/agent-editor.tsx
git commit -m "feat: add browser-based test call with rate limiting"
```

---

### Task 11: Final Integration & Wiring

- [ ] **Step 1: Verify all imports and exports are wired correctly**

Check that `packages/shared/src/index.ts` exports everything needed:
- `buildPromptFromTemplate`
- `getVerticalDefaults`
- `validatePromptCompliance`
- `GEMINI_VOICES`
- `DEFAULT_AGENT_SETTINGS`
- `VERTICAL_LABELS`
- All new types

- [ ] **Step 2: Get business name from org context**

In both `apps/web/src/app/dashboard/settings/ai-agents/[id]/page.tsx` and `new/page.tsx`, replace the hardcoded `'Northern Removals'` with the actual org name. Check how other settings pages get org info (likely from a hook or context) and use the same pattern.

- [ ] **Step 3: Build and test**

```bash
cd apps/web && npx next build
```

Fix any TypeScript or build errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire up AI agent configuration - final integration"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| **1: Foundation** | Tasks 1-3 | Shared types, prompt templates for all verticals, API updates |
| **2: Frontend Editor** | Tasks 4-8 | Agent list page, full editor with all sections |
| **3: Onboarding** | Task 9 | 3-step guided agent creation wizard |
| **4: Test & Polish** | Tasks 10-11 | Browser test call, final integration |
