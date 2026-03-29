import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { platformAssistantService } from '../services/platform-assistant-service.js';
import { logger } from '../middleware/logger.js';

const assistantRouter = new Hono();

assistantRouter.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  contactId: z.string().uuid().optional(),
  channel: z.string().optional(),
});

// ── Routes ──

/**
 * POST /orgs/:orgId/assistant/chat
 *
 * Send a message to the AI assistant. The assistant uses real business data
 * from the database to provide context-aware answers via Claude API.
 */
assistantRouter.post('/chat', async (c) => {
  const orgId = c.get('orgId');

  const body = await c.req.json();
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return c.json(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', status: 400, details: errors },
      400,
    );
  }

  const { message, history } = parsed.data;

  try {
    const result = await platformAssistantService.chat(orgId, message, history, {
      contactId: parsed.data.contactId,
      channel: parsed.data.channel,
    });

    return c.json({
      response: result.response,
      context: result.context ?? null,
    });
  } catch (err) {
    logger.error('Assistant chat failed', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: 'Failed to generate response', code: 'ASSISTANT_ERROR', status: 500 },
      500,
    );
  }
});

/**
 * GET /orgs/:orgId/assistant/suggestions
 *
 * Returns contextual suggestions based on the current business state.
 * For example: "Add your first contact", "3 deals need follow-up", etc.
 */
assistantRouter.get('/suggestions', async (c) => {
  const orgId = c.get('orgId');

  try {
    const suggestions = await platformAssistantService.getSuggestions(orgId);
    return c.json({ suggestions });
  } catch (err) {
    logger.error('Failed to get assistant suggestions', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ suggestions: [] });
  }
});

export { assistantRouter as assistantRoutes };
