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

// ── Routes ──

/**
 * GET /orgs/:orgId/ai-agents — list all AI agents
 */
ai.get('/ai-agents', async (c) => {
  const orgId = c.get('orgId');
  try {
    const { db } = await import('@mybizos/db');
    // TODO: implement real DB query for ai_agents table with orgId scope
    throw new Error('AI agents database table not yet implemented');
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
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

  try {
    const { db } = await import('@mybizos/db');
    // TODO: implement real DB insert for ai_agents table with orgId scope
    throw new Error('AI agents database table not yet implemented');
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * PATCH /orgs/:orgId/ai-agents/:id — update agent settings
 */
ai.patch('/ai-agents/:id', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAgentSchema.parse(body);

  try {
    const { db } = await import('@mybizos/db');
    // TODO: implement real DB update for ai_agents table with orgId scope
    throw new Error('AI agents database table not yet implemented');
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/ai/score-lead — manually trigger lead scoring
 */
ai.post('/ai/score-lead', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = scoreLeadSchema.parse(body);

  try {
    const { db } = await import('@mybizos/db');
    // TODO: implement real lead scoring via Claude API with orgId-scoped contact data
    throw new Error('Lead scoring service not yet implemented');
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { ai as aiRoutes };
