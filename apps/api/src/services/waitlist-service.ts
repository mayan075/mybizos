import {
  db,
  waitlist,
  contacts,
  bookableServices,
  withOrgScope,
} from '@hararai/db';
import { eq, and, desc } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export const waitlistService = {
  async list(orgId: string, filters?: { status?: string }) {
    const conditions = [withOrgScope(waitlist.orgId, orgId)];

    if (filters?.status) {
      conditions.push(eq(waitlist.status, filters.status as 'pending' | 'notified' | 'booked' | 'expired'));
    }

    const rows = await db
      .select({
        id: waitlist.id,
        orgId: waitlist.orgId,
        contactId: waitlist.contactId,
        serviceId: waitlist.serviceId,
        preferredDateRange: waitlist.preferredDateRange,
        preferredTimeOfDay: waitlist.preferredTimeOfDay,
        status: waitlist.status,
        notes: waitlist.notes,
        createdAt: waitlist.createdAt,
        updatedAt: waitlist.updatedAt,
        contactName: contacts.firstName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
        serviceName: bookableServices.name,
      })
      .from(waitlist)
      .leftJoin(contacts, eq(waitlist.contactId, contacts.id))
      .leftJoin(bookableServices, eq(waitlist.serviceId, bookableServices.id))
      .where(and(...conditions))
      .orderBy(desc(waitlist.createdAt));

    return rows;
  },

  async create(
    orgId: string,
    data: {
      contactId: string;
      serviceId?: string | null;
      preferredDateRange?: unknown | null;
      preferredTimeOfDay?: string | null;
      notes?: string | null;
    },
  ) {
    const [created] = await db
      .insert(waitlist)
      .values({
        orgId,
        contactId: data.contactId,
        serviceId: data.serviceId ?? null,
        preferredDateRange: data.preferredDateRange ?? null,
        preferredTimeOfDay: data.preferredTimeOfDay ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create waitlist entry');
    }

    logger.info('Waitlist entry created', { orgId, waitlistId: created.id });
    return created;
  },

  async updateStatus(
    orgId: string,
    waitlistId: string,
    status: 'pending' | 'notified' | 'booked' | 'expired',
  ) {
    const [updated] = await db
      .update(waitlist)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(waitlist.orgId, orgId),
        eq(waitlist.id, waitlistId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('WaitlistEntry');
    }

    logger.info('Waitlist entry status updated', { orgId, waitlistId, status });
    return updated;
  },

  async remove(orgId: string, waitlistId: string) {
    const [deleted] = await db
      .delete(waitlist)
      .where(and(
        withOrgScope(waitlist.orgId, orgId),
        eq(waitlist.id, waitlistId),
      ))
      .returning();

    if (!deleted) {
      throw Errors.notFound('WaitlistEntry');
    }

    logger.info('Waitlist entry deleted', { orgId, waitlistId });
    return deleted;
  },
};
