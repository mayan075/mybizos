import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { contactService } from '../services/contact-service.js';

const contacts = new Hono();

contacts.use('*', authMiddleware, orgScopeMiddleware);

// ── Validation Schemas ──

const listContactsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  source: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  company: z.string().nullable().optional().default(null),
  source: z.string().default('manual'),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
});

const updateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

const csvImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1, 'At least one row is required'),
});

// ── Routes ──

/**
 * GET /orgs/:orgId/contacts — list contacts (paginated, searchable, filterable)
 */
contacts.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = listContactsSchema.parse({
    search: c.req.query('search'),
    status: c.req.query('status'),
    source: c.req.query('source'),
    tag: c.req.query('tag'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await contactService.list(orgId, query);

  return c.json({
    data: result.contacts,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});

/**
 * GET /orgs/:orgId/contacts/:id — get a single contact with timeline
 */
contacts.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const contactId = c.req.param('id');
  const result = await contactService.getById(orgId, contactId);

  return c.json({ data: result });
});

/**
 * POST /orgs/:orgId/contacts — create a new contact
 */
contacts.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createContactSchema.parse(body);

  const contact = await contactService.create(orgId, parsed);
  return c.json({ data: contact }, 201);
});

/**
 * PATCH /orgs/:orgId/contacts/:id — update a contact
 */
contacts.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const contactId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateContactSchema.parse(body);

  const contact = await contactService.update(orgId, contactId, parsed);
  return c.json({ data: contact });
});

/**
 * DELETE /orgs/:orgId/contacts/:id — soft delete a contact
 */
contacts.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const contactId = c.req.param('id');

  await contactService.softDelete(orgId, contactId);
  return c.json({ data: { message: 'Contact archived successfully' } });
});

/**
 * POST /orgs/:orgId/contacts/import — CSV import
 */
contacts.post('/import', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = csvImportSchema.parse(body);

  const result = await contactService.importCsv(orgId, parsed.rows);
  return c.json({ data: result }, 201);
});

export { contacts as contactRoutes };
