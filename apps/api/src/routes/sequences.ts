import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import type { SequenceStep, SequenceTriggerConfig } from '@mybizos/db';

const sequences = new Hono();

sequences.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const stepConfigSchema = z.object({
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body: z.string().optional(),
  delay_hours: z.number().positive().optional(),
  tag: z.string().optional(),
  prompt: z.string().optional(),
  yes_step: z.number().int().nonnegative().optional(),
  no_step: z.number().int().nonnegative().optional(),
});

const stepSchema = z.object({
  type: z.enum(['send_email', 'send_sms', 'wait', 'add_tag', 'remove_tag', 'ai_decision']),
  config: stepConfigSchema,
});

const triggerConfigSchema = z.object({
  tag: z.string().optional(),
  stage: z.string().optional(),
  form_id: z.string().optional(),
});

const createSequenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional().default(null),
  triggerType: z.enum([
    'manual',
    'tag_added',
    'deal_stage_changed',
    'form_submitted',
    'appointment_completed',
    'contact_created',
  ]).default('manual'),
  triggerConfig: triggerConfigSchema.default({}),
  steps: z.array(stepSchema).default([]),
});

const updateSequenceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  triggerType: z.enum([
    'manual',
    'tag_added',
    'deal_stage_changed',
    'form_submitted',
    'appointment_completed',
    'contact_created',
  ]).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  steps: z.array(stepSchema).optional(),
});

const enrollSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/sequences — list all sequences
 */
sequences.get('/', async (c) => {
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.list(orgId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.get('/:id', async (c) => {
  const sequenceId = c.req.param('id');
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.getById(orgId, sequenceId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSequenceSchema.parse(body);
  const serviceData = {
    ...parsed,
    steps: parsed.steps as SequenceStep[],
    triggerConfig: parsed.triggerConfig as SequenceTriggerConfig,
  };
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.create(orgId, serviceData);
    return c.json({ data: result }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.patch('/:id', async (c) => {
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSequenceSchema.parse(body);
  const serviceData = {
    ...parsed,
    steps: parsed.steps as SequenceStep[] | undefined,
    triggerConfig: parsed.triggerConfig as SequenceTriggerConfig | undefined,
  };
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.update(orgId, sequenceId, serviceData);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.delete('/:id', async (c) => {
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    await sequenceService.delete(orgId, c.req.param('id'));
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
  return c.json({ data: { message: 'Sequence deleted successfully' } });
});

sequences.post('/:id/activate', async (c) => {
  const sequenceId = c.req.param('id');
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.activate(orgId, sequenceId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.post('/:id/deactivate', async (c) => {
  const sequenceId = c.req.param('id');
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.deactivate(orgId, sequenceId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.post('/:id/enroll', async (c) => {
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = enrollSchema.parse(body);
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.enroll(orgId, sequenceId, parsed.contactId);
    return c.json({ data: result }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.post('/:id/unenroll', async (c) => {
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = enrollSchema.parse(body);
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.unenroll(orgId, sequenceId, parsed.contactId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

/**
 * DELETE /orgs/:orgId/sequences/:id/enrollments/:enrollmentId — cancel a specific enrollment
 */
sequences.delete('/:id/enrollments/:enrollmentId', async (c) => {
  const sequenceId = c.req.param('id');
  const enrollmentId = c.req.param('enrollmentId');
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.cancelEnrollment(orgId, sequenceId, enrollmentId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

sequences.get('/:id/enrollments', async (c) => {
  const sequenceId = c.req.param('id');
  try {
    const { sequenceService } = await import('../services/sequence-service.js');
    const orgId = c.get('orgId');
    const result = await sequenceService.getEnrollments(orgId, sequenceId);
    return c.json({ data: result });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { sequences as sequenceRoutes };
