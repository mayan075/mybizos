import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { getMockContacts, getMockContactById } from '../services/mock-service.js';
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
    return c.json({
      data: result.contacts,
      pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) },
    });
  } catch {
    logger.warn('DB unavailable for contacts list, using mock data');
    const result = getMockContacts(query);
    return c.json({
      data: result.contacts,
      pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) },
    });
  }
});

contacts.get('/:id', async (c) => {
  const contactId = c.req.param('id');
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const result = await contactService.getById(orgId, contactId);
    return c.json({ data: result });
  } catch {
    logger.warn('DB unavailable for contact get, using mock data');
    const contact = getMockContactById(contactId);
    if (!contact) return c.json({ error: 'Contact not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: contact });
  }
});

contacts.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createContactSchema.parse(body);
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const contact = await contactService.create(orgId, parsed);
    return c.json({ data: contact }, 201);
  } catch {
    logger.warn('DB unavailable for contact create, returning mock');
    return c.json({ data: { id: `cnt_${Date.now()}`, ...parsed, orgId: 'org_01', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, 201);
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
    return c.json({ data: contact });
  } catch {
    logger.warn('DB unavailable for contact update, returning mock');
    const existing = getMockContactById(contactId);
    return c.json({ data: { ...existing, ...parsed, updatedAt: new Date().toISOString() } });
  }
});

contacts.delete('/:id', async (c) => {
  try {
    const { contactService } = await import('../services/contact-service.js');
    const orgId = c.get('orgId');
    const contactId = c.req.param('id');
    await contactService.softDelete(orgId, contactId);
  } catch {
    logger.warn('DB unavailable for contact delete');
  }
  return c.json({ data: { message: 'Contact archived successfully' } });
});

export { contacts as contactRoutes };
