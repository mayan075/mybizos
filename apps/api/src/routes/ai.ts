import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const ai = new Hono();

ai.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  type: z.enum(['phone', 'sms', 'email']),
  greeting: z.string().min(1, 'Greeting message is required'),
  businessContext: z.string().min(1, 'Business context is required'),
  escalationRules: z.object({
    maxMisunderstandings: z.number().int().positive().default(2),
    emergencyKeywords: z.array(z.string()).default(['flooding', 'gas leak', 'fire', 'emergency']),
    escalationPhone: z.string().optional(),
    escalationEmail: z.string().email().optional(),
  }),
  priceRanges: z
    .array(
      z.object({
        service: z.string(),
        minPrice: z.number().nonnegative(),
        maxPrice: z.number().nonnegative(),
      }),
    )
    .default([]),
  enabled: z.boolean().default(true),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  greeting: z.string().min(1).optional(),
  businessContext: z.string().min(1).optional(),
  escalationRules: z
    .object({
      maxMisunderstandings: z.number().int().positive().optional(),
      emergencyKeywords: z.array(z.string()).optional(),
      escalationPhone: z.string().optional(),
      escalationEmail: z.string().email().optional(),
    })
    .optional(),
  priceRanges: z
    .array(
      z.object({
        service: z.string(),
        minPrice: z.number().nonnegative(),
        maxPrice: z.number().nonnegative(),
      }),
    )
    .optional(),
  enabled: z.boolean().optional(),
});

const scoreLeadSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
});

// ── Mock data ──

interface AiAgent {
  id: string;
  orgId: string;
  name: string;
  type: 'phone' | 'sms' | 'email';
  greeting: string;
  businessContext: string;
  escalationRules: {
    maxMisunderstandings: number;
    emergencyKeywords: string[];
    escalationPhone?: string;
    escalationEmail?: string;
  };
  priceRanges: Array<{ service: string; minPrice: number; maxPrice: number }>;
  enabled: boolean;
  totalCalls: number;
  totalLeadsQualified: number;
  createdAt: string;
  updatedAt: string;
}

const mockAgents: AiAgent[] = [
  {
    id: 'agent_01',
    orgId: 'org_01',
    name: 'Main Phone Agent',
    type: 'phone',
    greeting:
      "Hi, this is Acme HVAC & Plumbing's AI assistant. This call may be recorded. How can I help you today?",
    businessContext:
      'Acme HVAC & Plumbing serves the Springfield, IL area. We offer HVAC installation, repair, and maintenance as well as plumbing services for residential and commercial customers.',
    escalationRules: {
      maxMisunderstandings: 2,
      emergencyKeywords: ['flooding', 'gas leak', 'fire', 'emergency', 'burst pipe'],
      escalationPhone: '+15559999999',
    },
    priceRanges: [
      { service: 'HVAC Inspection', minPrice: 75, maxPrice: 150 },
      { service: 'Furnace Repair', minPrice: 150, maxPrice: 500 },
      { service: 'AC Installation', minPrice: 3000, maxPrice: 8000 },
      { service: 'Plumbing Repair', minPrice: 100, maxPrice: 350 },
    ],
    enabled: true,
    totalCalls: 147,
    totalLeadsQualified: 89,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent_02',
    orgId: 'org_01',
    name: 'SMS Follow-Up Agent',
    type: 'sms',
    greeting:
      "Hi! This is Acme HVAC & Plumbing's assistant. How can I help you today?",
    businessContext:
      'Follow up with leads, confirm appointments, and answer basic service questions via SMS.',
    escalationRules: {
      maxMisunderstandings: 2,
      emergencyKeywords: ['flooding', 'gas leak', 'fire', 'emergency'],
    },
    priceRanges: [],
    enabled: true,
    totalCalls: 0,
    totalLeadsQualified: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

// ── Routes ──

/**
 * GET /orgs/:orgId/ai-agents — list all AI agents
 */
ai.get('/ai-agents', async (c) => {
  const orgId = c.get('orgId');
  const agents = mockAgents.filter((a) => a.orgId === orgId);
  return c.json({ data: agents });
});

/**
 * POST /orgs/:orgId/ai-agents — create/configure a new AI agent
 */
ai.post('/ai-agents', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createAgentSchema.parse(body);

  // Validate AI compliance: greeting must include disclosure
  if (parsed.type === 'phone' && !parsed.greeting.toLowerCase().includes('ai assistant')) {
    return c.json(
      {
        error: 'Phone agent greeting must include AI disclosure (e.g., "AI assistant")',
        code: 'VALIDATION_ERROR',
        status: 400,
      },
      400,
    );
  }

  const now = new Date().toISOString();
  const agent: AiAgent = {
    id: `agent_${Date.now()}`,
    orgId,
    ...parsed,
    totalCalls: 0,
    totalLeadsQualified: 0,
    createdAt: now,
    updatedAt: now,
  };

  mockAgents.push(agent);
  logger.info('AI agent created', { orgId, agentId: agent.id, type: agent.type });

  return c.json({ data: agent }, 201);
});

/**
 * PATCH /orgs/:orgId/ai-agents/:id — update agent settings
 */
ai.patch('/ai-agents/:id', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAgentSchema.parse(body);

  const idx = mockAgents.findIndex((a) => a.id === agentId && a.orgId === orgId);
  if (idx === -1) {
    return c.json(
      { error: 'AI agent not found', code: 'NOT_FOUND', status: 404 },
      404,
    );
  }

  const existing = mockAgents[idx] as AiAgent;

  // Validate AI compliance on greeting updates
  if (parsed.greeting && existing.type === 'phone' && !parsed.greeting.toLowerCase().includes('ai assistant')) {
    return c.json(
      {
        error: 'Phone agent greeting must include AI disclosure (e.g., "AI assistant")',
        code: 'VALIDATION_ERROR',
        status: 400,
      },
      400,
    );
  }

  const updated: AiAgent = {
    ...existing,
    ...parsed,
    escalationRules: parsed.escalationRules
      ? { ...existing.escalationRules, ...parsed.escalationRules }
      : existing.escalationRules,
    updatedAt: new Date().toISOString(),
  };
  mockAgents[idx] = updated;

  logger.info('AI agent updated', { orgId, agentId });
  return c.json({ data: updated });
});

/**
 * POST /orgs/:orgId/ai/score-lead — manually trigger lead scoring
 */
ai.post('/ai/score-lead', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = scoreLeadSchema.parse(body);

  // Mock lead scoring response — in production this will call Claude API
  const score = {
    contactId: parsed.contactId,
    score: 78,
    grade: 'A' as const,
    factors: [
      { factor: 'Responded to AI agent', weight: 25, score: 25 },
      { factor: 'Booked appointment', weight: 30, score: 30 },
      { factor: 'Service value estimate', weight: 20, score: 15 },
      { factor: 'Response time', weight: 15, score: 8 },
      { factor: 'Engagement level', weight: 10, score: 0 },
    ],
    recommendation: 'High-priority lead. Customer has booked an appointment and shows strong buying signals. Follow up within 24 hours.',
    scoredAt: new Date().toISOString(),
  };

  logger.info('Lead scored', { orgId, contactId: parsed.contactId, score: score.score });
  return c.json({ data: score });
});

export { ai as aiRoutes };
