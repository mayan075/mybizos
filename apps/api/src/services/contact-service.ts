import {
  db,
  contacts,
  activities,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, or, ilike, sql, desc, asc, arrayContains, count } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface ContactFilters {
  search?: string;
  source?: string;
  tag?: string;
  minScore?: number;
  maxScore?: number;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'aiScore' | 'firstName';
  sortOrder?: 'asc' | 'desc';
}

export const contactService = {
  async list(orgId: string, filters: ContactFilters) {
    const conditions = [withOrgScope(contacts.orgId, orgId)];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, pattern),
          ilike(contacts.lastName, pattern),
          ilike(contacts.email, pattern),
          ilike(contacts.phone, pattern),
        )!,
      );
    }

    if (filters.source) {
      conditions.push(eq(contacts.source, filters.source as typeof contacts.source.enumValues[number]));
    }

    if (filters.tag) {
      conditions.push(arrayContains(contacts.tags, [filters.tag]));
    }

    if (filters.minScore !== undefined) {
      conditions.push(sql`${contacts.aiScore} >= ${filters.minScore}`);
    }

    if (filters.maxScore !== undefined) {
      conditions.push(sql`${contacts.aiScore} <= ${filters.maxScore}`);
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(whereClause);

    const total = totalResult?.value ?? 0;

    const orderColumn = filters.sortBy === 'aiScore'
      ? contacts.aiScore
      : filters.sortBy === 'firstName'
        ? contacts.firstName
        : contacts.createdAt;

    const orderDir = filters.sortOrder === 'asc' ? asc : desc;

    const offset = (filters.page - 1) * filters.limit;

    const rows = await db
      .select()
      .from(contacts)
      .where(whereClause)
      .orderBy(orderDir(orderColumn))
      .limit(filters.limit)
      .offset(offset);

    return { contacts: rows, total };
  },

  async getById(orgId: string, contactId: string) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(
        withOrgScope(contacts.orgId, orgId),
        eq(contacts.id, contactId),
      ));

    if (!contact) {
      throw Errors.notFound('Contact');
    }

    const timeline = await db
      .select()
      .from(activities)
      .where(and(
        withOrgScope(activities.orgId, orgId),
        eq(activities.contactId, contactId),
      ))
      .orderBy(desc(activities.createdAt))
      .limit(50);

    return { contact, timeline };
  },

  async create(
    orgId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      companyId?: string | null;
      source?: typeof contacts.source.enumValues[number];
      tags?: string[];
      customFields?: Record<string, unknown>;
    },
  ) {
    const [created] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        companyId: data.companyId ?? null,
        source: data.source ?? 'manual',
        tags: data.tags ?? [],
        customFields: data.customFields ?? {},
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create contact');
    }

    logger.info('Contact created', { orgId, contactId: created.id });
    return created;
  },

  async update(
    orgId: string,
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      companyId?: string | null;
      source?: typeof contacts.source.enumValues[number];
      aiScore?: number;
      tags?: string[];
      customFields?: Record<string, unknown>;
    },
  ) {
    const [updated] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(contacts.orgId, orgId),
        eq(contacts.id, contactId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Contact');
    }

    logger.info('Contact updated', { orgId, contactId });
    return updated;
  },

  async softDelete(orgId: string, contactId: string) {
    // Soft delete by removing from active set — we use a real DELETE here
    // since the schema does not have an is_archived column.
    // If soft-delete is needed, add an `is_archived` column to contacts.
    const result = await db
      .delete(contacts)
      .where(and(
        withOrgScope(contacts.orgId, orgId),
        eq(contacts.id, contactId),
      ))
      .returning({ id: contacts.id });

    if (result.length === 0) {
      throw Errors.notFound('Contact');
    }

    logger.info('Contact deleted', { orgId, contactId });
  },

  async importCsv(
    orgId: string,
    csvRows: Array<Record<string, string>>,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const validRows: Array<{
      orgId: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      source: typeof contacts.source.enumValues[number];
      tags: string[];
      customFields: Record<string, unknown>;
    }> = [];

    for (const row of csvRows) {
      const firstName = row['first_name'] ?? row['firstName'];
      const lastName = row['last_name'] ?? row['lastName'];

      if (!firstName || !lastName) {
        skipped++;
        errors.push(`Row missing first_name or last_name: ${JSON.stringify(row)}`);
        continue;
      }

      validRows.push({
        orgId,
        firstName,
        lastName,
        email: row['email'] ?? null,
        phone: row['phone'] ?? null,
        source: 'import',
        tags: row['tags'] ? row['tags'].split(',').map((t) => t.trim()) : [],
        customFields: {},
      });
    }

    if (validRows.length > 0) {
      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        await db.insert(contacts).values(chunk);
        imported += chunk.length;
      }
    }

    logger.info('CSV import completed', { orgId, imported, skipped });
    return { imported, skipped, errors };
  },
};
