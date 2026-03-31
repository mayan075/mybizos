import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

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
  source: z.enum(['email', 'phone', 'manual', 'sms', 'webform', 'referral', 'google_ads', 'facebook_ads', 'yelp', 'import']).default('manual'),
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
  source: z.enum(['email', 'phone', 'manual', 'sms', 'webform', 'referral', 'google_ads', 'facebook_ads', 'yelp', 'import']).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

// ── Routes ──

contacts.get('/', async (c) => {
  const query = listContactsSchema.parse({
    search: c.req.query('search'),
    status: c.req.query('status'),
    source: c.req.query('source'),
    tag: c.req.query('tag'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const result = await contactService.list(orgId, query);
    logger.info('Contacts list served from REAL DATABASE', { orgId, count: result.contacts.length, total: result.total });
    return c.json({
      data: result.contacts,
      pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) },
      _source: 'database',
    });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

contacts.get('/:id', async (c) => {
  const contactId = c.req.param('id');
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const result = await contactService.getById(orgId, contactId);
    logger.info('Contact detail served from REAL DATABASE', { orgId, contactId });
    return c.json({ data: result, _source: 'database' });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

contacts.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createContactSchema.parse(body);
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const contact = await contactService.create(orgId, parsed);
    logger.info('Contact created in REAL DATABASE', { orgId, contactId: contact.id });
    return c.json({ data: contact }, 201);
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

contacts.patch('/:id', async (c) => {
  const contactId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateContactSchema.parse(body);
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const contact = await contactService.update(orgId, contactId, parsed);
    logger.info('Contact updated in REAL DATABASE', { orgId, contactId });
    return c.json({ data: contact });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

// ── Bulk Import ──

const importContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  source: z.string().nullable().optional().default(null),
  tags: z.string().nullable().optional().default(null),
});

const bulkImportSchema = z.object({
  contacts: z.array(importContactSchema).min(1, 'At least one contact is required').max(5000, 'Maximum 5000 contacts per import'),
});

contacts.post('/import', async (c) => {
  const body = await c.req.json();
  const parsed = bulkImportSchema.parse(body);

  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');

    // Convert to the format the service expects
    const csvRows = parsed.contacts.map((contact) => ({
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      tags: contact.tags ?? '',
    }));

    const result = await contactService.importCsv(orgId, csvRows);
    logger.info('Bulk import completed', { orgId, imported: result.imported, skipped: result.skipped });
    return c.json({ data: result }, 201);
  } catch (err) {
    logger.error('Bulk import failed', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Import failed', code: 'IMPORT_FAILED', status: 500 }, 500);
  }
});

contacts.delete('/:id', async (c) => {
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const contactId = c.req.param('id');
    await contactService.softDelete(orgId, contactId);
    logger.info('Contact deleted from REAL DATABASE', { orgId, contactId });
    return c.json({ data: { message: 'Contact archived successfully' } });
  } catch (err) {
    logger.error('Database unavailable', { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { contacts as contactRoutes };
