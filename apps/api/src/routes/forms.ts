import { Hono } from 'hono';
import { z } from 'zod';
import { cors } from 'hono/cors';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

// ── Validation Schemas ──

const listFormsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(255),
  description: z.string().optional(),
  fields: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum([
          'text',
          'email',
          'phone',
          'textarea',
          'select',
          'date',
          'number',
          'checkbox',
        ]),
        label: z.string().min(1).max(255),
        placeholder: z.string().default(''),
        required: z.boolean().default(false),
      }),
    )
    .min(1, 'At least one field is required'),
  settings: z
    .object({
      submitButtonText: z.string().default('Submit'),
      successMessage: z
        .string()
        .default('Thank you for your submission!'),
      redirectUrl: z.string().default(''),
      autoCreateContact: z.boolean().default(true),
      autoAddTag: z.string().default(''),
      notificationEmail: z.string().default(''),
    })
    .default({}),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateFormSchema = createFormSchema.partial();

const publicSubmitSchema = z.object({
  data: z.record(z.string(), z.string()),
  source: z.string().default('website'),
});

const listSubmissionsSchema = z.object({
  formId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Authenticated Routes ──

const formRoutes = new Hono();
formRoutes.use('*', authMiddleware, orgScopeMiddleware);

formRoutes.get('/', async (c) => {
  const query = listFormsSchema.parse({
    search: c.req.query('search'),
    status: c.req.query('status'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const result = await formService.list(orgId, query);

  return c.json({
    data: result.forms,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

formRoutes.get('/submissions', async (c) => {
  const query = listSubmissionsSchema.parse({
    formId: c.req.query('formId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const result = await formService.listSubmissions(orgId, query);

  return c.json({
    data: result.submissions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

formRoutes.get('/:id', async (c) => {
  const formId = c.req.param('id');
  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const result = await formService.getById(orgId, formId);

  return c.json({ data: result });
});

formRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createFormSchema.parse(body);

  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const form = await formService.create(orgId, parsed);

  logger.info('Form created', { orgId, formId: form.id });
  return c.json({ data: form }, 201);
});

formRoutes.patch('/:id', async (c) => {
  const formId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateFormSchema.parse(body);

  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const form = await formService.update(orgId, formId, parsed);

  return c.json({ data: form });
});

formRoutes.delete('/:id', async (c) => {
  const formId = c.req.param('id');
  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  await formService.remove(orgId, formId);

  return c.json({ data: { message: 'Form deleted successfully' } });
});

formRoutes.get('/:id/submissions', async (c) => {
  const formId = c.req.param('id');
  const query = listSubmissionsSchema.parse({
    formId,
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');
  const result = await formService.listSubmissions(orgId, query);

  return c.json({
    data: result.submissions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

formRoutes.get('/:id/embed', async (c) => {
  const formId = c.req.param('id');
  const { formService } = await import('../services/form-service.js');
  const orgId = c.get('orgId');

  // Verify form exists and belongs to this org
  await formService.getById(orgId, formId);

  const webUrl = config.CORS_ORIGIN || 'http://localhost:3000';
  const embedUrl = `${webUrl}/embed/forms/${formId}`;
  const embedCode = `<iframe src="${embedUrl}" style="width:100%;min-height:500px;border:none;" title="Contact Form"></iframe>`;

  return c.json({
    data: {
      embedUrl,
      embedCode,
    },
  });
});

// ── Public Routes (no auth) ──

const publicFormRoutes = new Hono();

// Permissive CORS for embedded forms on external sites
publicFormRoutes.use(
  '/public/forms/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

publicFormRoutes.get('/public/forms/:formId', async (c) => {
  const formId = c.req.param('formId');
  const { formService } = await import('../services/form-service.js');
  const form = await formService.getPublicForm(formId);

  return c.json({
    data: {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.fields,
      settings: form.settings,
    },
  });
});

publicFormRoutes.post('/public/forms/:formId/submit', async (c) => {
  const formId = c.req.param('formId');
  const body = await c.req.json();
  const parsed = publicSubmitSchema.parse(body);

  const { formService } = await import('../services/form-service.js');
  const result = await formService.submitPublicForm(formId, parsed);

  return c.json(
    {
      data: {
        submissionId: result.submission.id,
        contactCreated: !!result.contactId,
      },
    },
    201,
  );
});

export { formRoutes, publicFormRoutes };
