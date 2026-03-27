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
    'salon_spa', 'dental', 'auto_repair', 'real_estate', 'other',
  ]),
  settings: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  settings: z.record(z.unknown()).optional(),
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
    const agent = await aiService.createAgent(orgId, parsed.data);
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
 * POST /orgs/:orgId/ai/score-lead — manually trigger lead scoring
 */
ai.post('/ai/score-lead', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = scoreLeadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Contact ID is required', code: 'VALIDATION_ERROR', status: 422 }, 422);
  }

  try {
    const { contactService } = await import('../services/contact-service.js');
    const contact = await contactService.getById(orgId, parsed.data.contactId);

    // Simple rule-based lead scoring (Claude API scoring can be added later)
    let score = 50; // base
    if (contact.email) score += 10;
    if (contact.phone) score += 10;
    if (contact.source === 'referral') score += 15;
    if (contact.source === 'phone') score += 10;
    if (contact.tags && contact.tags.length > 0) score += 5;
    score = Math.min(score, 100);

    // Update the contact's lead score
    await contactService.update(orgId, parsed.data.contactId, { leadScore: score });

    return c.json({ data: { contactId: parsed.data.contactId, score, method: 'rule-based' } });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return c.json({ error: 'Contact not found', code: 'NOT_FOUND', status: 404 }, 404);
    }
    logger.error('Failed to score lead', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { ai as aiRoutes };
