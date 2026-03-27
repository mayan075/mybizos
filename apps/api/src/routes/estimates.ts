import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { logger } from '../middleware/logger.js';

const estimateRoutes = new Hono();
estimateRoutes.use('*', authMiddleware, orgScopeMiddleware);

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

const createEstimateSchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  validUntil: z.string(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional(),
});

const updateEstimateSchema = createEstimateSchema.partial();

const listSchema = z.object({
  status: z.string().optional(),
  contactId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

estimateRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');
  const query = listSchema.parse({
    status: c.req.query('status'),
    contactId: c.req.query('contactId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  try {
    const { db, estimates, contacts, withOrgScope } = await import('@mybizos/db');
    const { and, eq, desc, count } = await import('drizzle-orm');

    const conditions = [withOrgScope(estimates.orgId, orgId)];
    if (query.status) conditions.push(eq(estimates.status, query.status as typeof estimates.status.enumValues[number]));
    if (query.contactId) conditions.push(eq(estimates.contactId, query.contactId));

    const whereClause = and(...conditions);
    const [totalResult] = await db.select({ value: count() }).from(estimates).where(whereClause);
    const total = totalResult?.value ?? 0;
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        estimate: estimates,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
      })
      .from(estimates)
      .leftJoin(contacts, eq(estimates.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(estimates.createdAt))
      .limit(query.limit)
      .offset(offset);

    const data = rows.map((r) => ({
      ...r.estimate,
      contactName: r.contactFirstName && r.contactLastName ? `${r.contactFirstName} ${r.contactLastName}` : null,
      contactEmail: r.contactEmail,
    }));

    return c.json({ data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  } catch (err) {
    logger.error('Failed to list estimates', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  try {
    const { db, estimates, contacts, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const [row] = await db.select({ estimate: estimates, contactFirstName: contacts.firstName, contactLastName: contacts.lastName, contactEmail: contacts.email })
      .from(estimates).leftJoin(contacts, eq(estimates.contactId, contacts.id))
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId)));

    if (!row) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: { ...row.estimate, contactName: row.contactFirstName && row.contactLastName ? `${row.contactFirstName} ${row.contactLastName}` : null, contactEmail: row.contactEmail } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.post('/', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createEstimateSchema.parse(body);

  try {
    const { db, estimates, withOrgScope } = await import('@mybizos/db');
    const { count } = await import('drizzle-orm');

    const [countResult] = await db.select({ value: count() }).from(estimates).where(withOrgScope(estimates.orgId, orgId));
    const num = (countResult?.value ?? 0) + 1;
    const estimateNumber = `EST-${String(num).padStart(4, '0')}`;

    const subtotal = parsed.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (parsed.taxRate / 100);
    const total = subtotal + taxAmount;

    const [created] = await db.insert(estimates).values({
      orgId,
      contactId: parsed.contactId ?? null,
      dealId: parsed.dealId ?? null,
      estimateNumber,
      validUntil: new Date(parsed.validUntil),
      lineItems: parsed.lineItems,
      subtotal: String(subtotal),
      taxRate: String(parsed.taxRate),
      taxAmount: String(taxAmount),
      total: String(total),
      currency: parsed.currency,
      notes: parsed.notes ?? null,
    }).returning();

    if (!created) return c.json({ error: 'Failed to create estimate', code: 'INTERNAL_ERROR', status: 500 }, 500);
    logger.info('Estimate created', { orgId, estimateId: created.id, estimateNumber });
    return c.json({ data: created }, 201);
  } catch (err) {
    logger.error('Failed to create estimate', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.patch('/:id', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateEstimateSchema.parse(body);

  try {
    const { db, estimates, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.contactId !== undefined) updateData.contactId = parsed.contactId;
    if (parsed.validUntil !== undefined) updateData.validUntil = new Date(parsed.validUntil);
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

    const [updated] = await db.update(estimates).set(updateData)
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId))).returning();

    if (!updated) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.post('/:id/send', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  try {
    const { db, estimates, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const [updated] = await db.update(estimates)
      .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId))).returning();

    if (!updated) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.post('/:id/accept', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  try {
    const { db, estimates, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const [updated] = await db.update(estimates)
      .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId))).returning();

    if (!updated) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: updated });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.post('/:id/convert-to-invoice', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  try {
    const { db, estimates, invoices, withOrgScope } = await import('@mybizos/db');
    const { and, eq, count } = await import('drizzle-orm');

    const [estimate] = await db.select().from(estimates)
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId)));

    if (!estimate) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);

    // Generate invoice number
    const [countResult] = await db.select({ value: count() }).from(invoices).where(withOrgScope(invoices.orgId, orgId));
    const num = (countResult?.value ?? 0) + 1;
    const invoiceNumber = `INV-${String(num).padStart(4, '0')}`;

    // Create invoice from estimate
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const [invoice] = await db.insert(invoices).values({
      orgId,
      contactId: estimate.contactId,
      dealId: estimate.dealId,
      invoiceNumber,
      dueDate,
      lineItems: estimate.lineItems,
      subtotal: estimate.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      total: estimate.total,
      currency: estimate.currency,
      notes: estimate.notes,
    }).returning();

    // Link estimate to invoice
    await db.update(estimates).set({ convertedToInvoiceId: invoice!.id, updatedAt: new Date() })
      .where(eq(estimates.id, estimateId));

    logger.info('Estimate converted to invoice', { orgId, estimateId, invoiceId: invoice!.id });
    return c.json({ data: invoice }, 201);
  } catch (err) {
    logger.error('Failed to convert estimate', { orgId, error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

estimateRoutes.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const estimateId = c.req.param('id');
  try {
    const { db, estimates, withOrgScope } = await import('@mybizos/db');
    const { and, eq } = await import('drizzle-orm');

    const result = await db.delete(estimates)
      .where(and(withOrgScope(estimates.orgId, orgId), eq(estimates.id, estimateId))).returning({ id: estimates.id });

    if (result.length === 0) return c.json({ error: 'Estimate not found', code: 'NOT_FOUND', status: 404 }, 404);
    return c.json({ data: { message: 'Estimate deleted' } });
  } catch (err) {
    return c.json({ error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }, 503);
  }
});

export { estimateRoutes };
