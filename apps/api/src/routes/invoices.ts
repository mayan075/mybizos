import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const invoiceRoutes = new Hono();
invoiceRoutes.use('*', authMiddleware, orgScopeMiddleware);

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

const createInvoiceSchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  dueDate: z.string(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

const listSchema = z.object({
  status: z.string().optional(),
  contactId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

invoiceRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = listSchema.parse({
    status: c.req.query('status'),
    contactId: c.req.query('contactId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { db, invoices, contacts, withOrgScope } = await import('@hararai/db');
    const { and, eq, desc, count } = await import('drizzle-orm');

    const conditions = [withOrgScope(invoices.orgId, orgId)];
    if (query.status) conditions.push(eq(invoices.status, query.status as typeof invoices.status.enumValues[number]));
    if (query.contactId) conditions.push(eq(invoices.contactId, query.contactId));

    const whereClause = and(...conditions);
    const [totalResult] = await db.select({ value: count() }).from(invoices).where(whereClause);
    const total = totalResult?.value ?? 0;
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        invoice: invoices,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
      })
      .from(invoices)
      .leftJoin(contacts, and(eq(invoices.contactId, contacts.id), eq(contacts.orgId, invoices.orgId)))
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .limit(query.limit)
      .offset(offset);

    const data = rows.map((r) => ({
      ...r.invoice,
      contactName: r.contactFirstName && r.contactLastName ? `${r.contactFirstName} ${r.contactLastName}` : null,
      contactEmail: r.contactEmail,
    }));

    return c.json({ data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (err) {
    logger.error('Failed to list invoices', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const invoiceId = c.req.param('id');
  try {
    const { db, invoices, contacts, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const [row] = await db.select({ invoice: invoices, contactFirstName: contacts.firstName, contactLastName: contacts.lastName, contactEmail: contacts.email })
      .from(invoices).leftJoin(contacts, eq(invoices.contactId, contacts.id))
      .where(and(withOrgScope(invoices.orgId, orgId), eq(invoices.id, invoiceId)));

    if (!row) return c.json({ error: 'Invoice not found', code: 'NOT_FOUND', status: 404 }, 404);

    return c.json({ data: { ...row.invoice, contactName: row.contactFirstName && row.contactLastName ? `${row.contactFirstName} ${row.contactLastName}` : null, contactEmail: row.contactEmail } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createInvoiceSchema.parse(body);

  try {
    const { db, invoices, withOrgScope } = await import('@hararai/db');
    const { count, and } = await import('drizzle-orm');

    // Generate invoice number
    const [countResult] = await db.select({ value: count() }).from(invoices).where(withOrgScope(invoices.orgId, orgId));
    const num = (countResult?.value ?? 0) + 1;
    const invoiceNumber = `INV-${String(num).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = parsed.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (parsed.taxRate / 100);
    const total = subtotal + taxAmount;

    const [created] = await db.insert(invoices).values({
      orgId,
      contactId: parsed.contactId ?? null,
      dealId: parsed.dealId ?? null,
      invoiceNumber,
      dueDate: new Date(parsed.dueDate),
      lineItems: parsed.lineItems,
      subtotal: String(subtotal),
      taxRate: String(parsed.taxRate),
      taxAmount: String(taxAmount),
      total: String(total),
      currency: parsed.currency,
      notes: parsed.notes ?? null,
    }).returning();

    if (!created) return c.json({ error: 'Failed to create invoice', code: 'INTERNAL_ERROR', status: 500 }, 500);

    logger.info('Invoice created', { orgId, invoiceId: created.id, invoiceNumber });
    return c.json({ data: created }, 201);
  } catch (err) {
    logger.error('Failed to create invoice', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const invoiceId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateInvoiceSchema.parse(body);

  try {
    const { db, invoices, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.contactId !== undefined) updateData.contactId = parsed.contactId;
    if (parsed.dueDate !== undefined) updateData.dueDate = new Date(parsed.dueDate);
    if (parsed.lineItems !== undefined) {
      updateData.lineItems = parsed.lineItems;
      const subtotal = parsed.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const taxRate = parsed.taxRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      updateData.subtotal = String(subtotal);
      updateData.taxAmount = String(taxAmount);
      updateData.total = String(subtotal + taxAmount);
    }
    if (parsed.taxRate !== undefined) updateData.taxRate = String(parsed.taxRate);
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;
    if (parsed.currency !== undefined) updateData.currency = parsed.currency;

    const [updated] = await db.update(invoices).set(updateData)
      .where(and(withOrgScope(invoices.orgId, orgId), eq(invoices.id, invoiceId))).returning();

    if (!updated) return c.json({ error: 'Invoice not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.post('/:id/send', async (c) => {
  const orgId = c.get('orgId');
  const invoiceId = c.req.param('id');
  try {
    const { db, invoices, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const [updated] = await db.update(invoices)
      .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
      .where(and(withOrgScope(invoices.orgId, orgId), eq(invoices.id, invoiceId))).returning();

    if (!updated) return c.json({ error: 'Invoice not found', code: 'NOT_FOUND', status: 404 }, 404);
    logger.info('Invoice sent', { orgId, invoiceId });
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.post('/:id/mark-paid', async (c) => {
  const orgId = c.get('orgId');
  const invoiceId = c.req.param('id');
  try {
    const { db, invoices, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const [updated] = await db.update(invoices)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(and(withOrgScope(invoices.orgId, orgId), eq(invoices.id, invoiceId))).returning();

    if (!updated) return c.json({ error: 'Invoice not found', code: 'NOT_FOUND', status: 404 }, 404);
    logger.info('Invoice marked paid', { orgId, invoiceId });
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

invoiceRoutes.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const invoiceId = c.req.param('id');
  try {
    const { db, invoices, withOrgScope } = await import('@hararai/db');
    const { and, eq } = await import('drizzle-orm');

    const result = await db.delete(invoices)
      .where(and(withOrgScope(invoices.orgId, orgId), eq(invoices.id, invoiceId))).returning({ id: invoices.id });

    if (result.length === 0) return c.json({ error: 'Invoice not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: { message: 'Invoice deleted' } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { invoiceRoutes };
