import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { sequenceService } from '../services/sequence-service.js';

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
  const orgId = c.get('orgId');
  const result = await sequenceService.list(orgId);

  return c.json({ data: result });
});

/**
 * GET /orgs/:orgId/sequences/:id — get a single sequence
 */
sequences.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');
  const result = await sequenceService.getById(orgId, sequenceId);

  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/sequences — create a new sequence
 */
sequences.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createSequenceSchema.parse(body);

  const result = await sequenceService.create(orgId, parsed);
  return c.json({ data: result }, 201);
});

/**
 * PATCH /orgs/:orgId/sequences/:id — update a sequence
 */
sequences.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSequenceSchema.parse(body);

  const result = await sequenceService.update(orgId, sequenceId, parsed);
  return c.json({ data: result });
});

/**
 * DELETE /orgs/:orgId/sequences/:id — delete a sequence
 */
sequences.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');

  await sequenceService.delete(orgId, sequenceId);
  return c.json({ data: { message: 'Sequence deleted successfully' } });
});

/**
 * POST /orgs/:orgId/sequences/:id/activate — activate a sequence
 */
sequences.post('/:id/activate', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');

  const result = await sequenceService.activate(orgId, sequenceId);
  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/sequences/:id/deactivate — deactivate a sequence
 */
sequences.post('/:id/deactivate', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');

  const result = await sequenceService.deactivate(orgId, sequenceId);
  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/sequences/:id/enroll — enroll a contact in a sequence
 */
sequences.post('/:id/enroll', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = enrollSchema.parse(body);

  const result = await sequenceService.enroll(orgId, sequenceId, parsed.contactId);
  return c.json({ data: result }, 201);
});

/**
 * POST /orgs/:orgId/sequences/:id/unenroll — unenroll a contact from a sequence
 */
sequences.post('/:id/unenroll', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = enrollSchema.parse(body);

  const result = await sequenceService.unenroll(orgId, sequenceId, parsed.contactId);
  return c.json({ data: result });
});

/**
 * GET /orgs/:orgId/sequences/:id/enrollments — list enrolled contacts
 */
sequences.get('/:id/enrollments', async (c) => {
  const orgId = c.get('orgId');
  const sequenceId = c.req.param('id');

  const result = await sequenceService.getEnrollments(orgId, sequenceId);
  return c.json({ data: result });
});

export { sequences as sequenceRoutes };
