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
  type: z.enum(['phone', 'sms', 'chat', 'review']),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  vertical: z.enum([
    'rubbish_removals', 'moving_company', 'plumbing', 'hvac', 'electrical',
    'roofing', 'landscaping', 'pest_control', 'cleaning', 'general_contractor',
  ]),
  settings: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

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
    const { aiService } = await import('../services/ai-service.js');
    const agents = await aiService.listAgents(orgId);
    return c.json({ data: agents });
  } catch (err) {
    logger.error('Failed to list AI agents', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * GET /orgs/:orgId/ai-agents/:id — get single AI agent
 */
ai.get('/ai-agents/:id', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  try {
    const { aiService } = await import('../services/ai-service.js');
    const agent = await aiService.getAgentById(orgId, agentId);
    return c.json({ data: agent });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return c.json({ error: 'AI agent not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    logger.error('Failed to get AI agent', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/ai-agents — create a new AI agent
 */
ai.post('/ai-agents', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', status: 422, details: errors }, 422);
  }

  // AI compliance: phone agent greeting must include AI disclosure
  if (parsed.data.type === 'phone' && !parsed.data.systemPrompt.toLowerCase().includes('ai assistant')) {
    return c.json({
      error: 'Phone agent system prompt must include AI disclosure (e.g., "AI assistant")',
      code: 'VALIDATION_ERROR',
      status: 400,
    }, 400);
  }

  try {
    const { aiService } = await import('../services/ai-service.js');
    const { vertical, ...rest } = parsed.data;
    const agent = await aiService.createAgent(orgId, { ...rest, industry: vertical });
    logger.info('AI Agent created', { orgId, agentId: agent.id, type: parsed.data.type });
    return c.json({ data: agent }, 201);
  } catch (err) {
    logger.error('Failed to create AI agent', { error: err instanceof Error ? err.message : String(err) });
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
  const parsed = updateAgentSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', status: 422, details: errors }, 422);
  }

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

  try {
    const { aiService } = await import('../services/ai-service.js');
    const agent = await aiService.updateAgent(orgId, agentId, parsed.data);
    return c.json({ data: agent });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return c.json({ error: 'AI agent not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    logger.error('Failed to update AI agent', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * DELETE /orgs/:orgId/ai-agents/:id — delete an AI agent
 */
ai.delete('/ai-agents/:id', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  try {
    const { aiService } = await import('../services/ai-service.js');
    await aiService.deleteAgent(orgId, agentId);
    return c.json({ data: { message: 'Agent deleted' } });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return c.json({ error: 'AI agent not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    logger.error('Failed to delete AI agent', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/ai-agents/:id/link-phone — DEPRECATED
 * Phone linking is no longer needed. Gemini Live sessions are ephemeral —
 * the AI agent is resolved from the phone number at call time via phone-routing-service.
 * Configure your Twilio number's webhook to point to /voice/twiml and it will auto-route.
 */
ai.post('/ai-agents/:id/link-phone', async (c) => {
  return c.json({
    error: 'Phone linking via Vapi is deprecated. Configure your Twilio webhook to point to the HararAI API instead. The AI agent is resolved automatically from the phone number.',
    code: 'DEPRECATED',
    status: 410,
  }, 410);
});

ai.delete('/ai-agents/:id/unlink-phone', async (c) => {
  return c.json({
    error: 'Phone unlinking via Vapi is deprecated.',
    code: 'DEPRECATED',
    status: 410,
  }, 410);
});

/**
 * GET /orgs/:orgId/ai-agents/:id/call-logs — list recent call logs
 */
ai.get('/ai-agents/:id/call-logs', async (c) => {
  const orgId = c.get('orgId');
  const agentId = c.req.param('id');
  const limit = Number(c.req.query('limit') ?? '10');

  try {
    const { db, aiCallLogs } = await import('@hararai/db');
    const { and, eq, desc } = await import('drizzle-orm');

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
  } catch (err) {
    logger.error('Failed to list call logs', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * POST /orgs/:orgId/ai/score-lead — manually trigger lead scoring
 * Uses Claude AI when ANTHROPIC_API_KEY is configured, otherwise falls back to rule-based.
 */
ai.post('/ai/score-lead', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = scoreLeadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Contact ID is required', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  try {
    const { leadScoringService } = await import('../services/lead-scoring-service.js');
    const result = await leadScoringService.scoreContact(orgId, parsed.data.contactId);
    return c.json({ data: result });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return c.json({ error: 'Contact not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    logger.error('Failed to score lead', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { ai as aiRoutes };
