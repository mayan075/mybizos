import {
  db,
  appointments,
  availabilityRules,
  contacts,
  organizations,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, gte, lte, or, desc, asc, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export const schedulingService = {
  async listAppointments(
    orgId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: typeof appointments.status.enumValues[number];
      assignedTo?: string;
    },
  ) {
    const conditions = [withOrgScope(appointments.orgId, orgId)];

    if (filters?.startDate) {
      conditions.push(gte(appointments.startTime, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(appointments.startTime, filters.endDate));
    }

    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }

    if (filters?.assignedTo) {
      conditions.push(eq(appointments.assignedTo, filters.assignedTo));
    }

    const rows = await db
      .select({
        appointment: appointments,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,
      })
      .from(appointments)
      .leftJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(asc(appointments.startTime));

    return rows;
  },

  async getById(orgId: string, appointmentId: string) {
    const [result] = await db
      .select({
        appointment: appointments,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,
      })
      .from(appointments)
      .leftJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        eq(appointments.id, appointmentId),
      ));

    if (!result) {
      throw Errors.notFound('Appointment');
    }

    return result;
  },

  async createAppointment(
    orgId: string,
    data: {
      contactId: string;
      title: string;
      description?: string | null;
      startTime: Date;
      endTime: Date;
      status?: typeof appointments.status.enumValues[number];
      assignedTo?: string | null;
      location?: string | null;
      notes?: string | null;
    },
  ) {
    // Conflict check: no double-booking for the same assignee at the same time
    if (data.assignedTo) {
      const conflicts = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(
          withOrgScope(appointments.orgId, orgId),
          eq(appointments.assignedTo, data.assignedTo),
          // Overlapping time check: existing.start < new.end AND existing.end > new.start
          sql`${appointments.startTime} < ${data.endTime}`,
          sql`${appointments.endTime} > ${data.startTime}`,
          // Only check against non-cancelled appointments
          sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
        ));

      if (conflicts.length > 0) {
        throw Errors.conflict('Time slot conflicts with an existing appointment');
      }
    }

    const [created] = await db
      .insert(appointments)
      .values({
        orgId,
        contactId: data.contactId,
        title: data.title,
        description: data.description ?? null,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status ?? 'scheduled',
        assignedTo: data.assignedTo ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create appointment');
    }

    logger.info('Appointment created', { orgId, appointmentId: created.id });
    return created;
  },

  async updateAppointment(
    orgId: string,
    appointmentId: string,
    data: {
      title?: string;
      description?: string | null;
      startTime?: Date;
      endTime?: Date;
      status?: typeof appointments.status.enumValues[number];
      assignedTo?: string | null;
      location?: string | null;
      notes?: string | null;
    },
  ) {
    const [updated] = await db
      .update(appointments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        eq(appointments.id, appointmentId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Appointment');
    }

    logger.info('Appointment updated', { orgId, appointmentId, status: updated.status });
    return updated;
  },

  async cancelAppointment(orgId: string, appointmentId: string) {
    const [updated] = await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        eq(appointments.id, appointmentId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Appointment');
    }

    logger.info('Appointment cancelled', { orgId, appointmentId });
    return updated;
  },

  async getAvailability(
    orgId: string,
    userId: string,
    date: string,
    slotDurationMinutes = 90,
  ): Promise<AvailabilitySlot[]> {
    // Get the day of week from the date
    const dateObj = new Date(date);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = days[dateObj.getUTCDay()];

    if (!dayOfWeek) {
      throw Errors.badRequest('Invalid date');
    }

    // Get availability rules for this user on this day
    const rules = await db
      .select()
      .from(availabilityRules)
      .where(and(
        withOrgScope(availabilityRules.orgId, orgId),
        eq(availabilityRules.userId, userId),
        eq(availabilityRules.dayOfWeek, dayOfWeek),
        eq(availabilityRules.isActive, true),
      ));

    if (rules.length === 0) {
      return [];
    }

    // Get existing appointments for this user on this date
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    const existingAppointments = await db
      .select({
        startTime: appointments.startTime,
        endTime: appointments.endTime,
      })
      .from(appointments)
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        eq(appointments.assignedTo, userId),
        gte(appointments.startTime, dayStart),
        lte(appointments.startTime, dayEnd),
        sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
      ));

    // Generate slots from availability rules
    const slots: AvailabilitySlot[] = [];

    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number) as [number, number];
      const [endH, endM] = rule.endTime.split(':').map(Number) as [number, number];

      const ruleStartMinutes = startH * 60 + startM;
      const ruleEndMinutes = endH * 60 + endM;

      for (
        let slotStart = ruleStartMinutes;
        slotStart + slotDurationMinutes <= ruleEndMinutes;
        slotStart += slotDurationMinutes
      ) {
        const slotEnd = slotStart + slotDurationMinutes;

        const slotStartH = Math.floor(slotStart / 60);
        const slotStartM = slotStart % 60;
        const slotEndH = Math.floor(slotEnd / 60);
        const slotEndM = slotEnd % 60;

        const startTime = `${date}T${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00`;
        const endTime = `${date}T${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}:00`;

        const slotStartDate = new Date(startTime + 'Z');
        const slotEndDate = new Date(endTime + 'Z');

        // Check if this slot conflicts with any existing appointment
        const isBooked = existingAppointments.some((apt) => {
          return apt.startTime < slotEndDate && apt.endTime > slotStartDate;
        });

        slots.push({
          date,
          startTime,
          endTime,
          available: !isBooked,
        });
      }
    }

    return slots;
  },

  async publicBook(
    orgSlug: string,
    data: {
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      title: string;
      startTime: string;
      endTime: string;
    },
  ) {
    // Look up the org by slug
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug));

    if (!org) {
      throw Errors.notFound('Organization');
    }

    // Create or find the contact
    const nameParts = data.contactName.split(' ');
    const firstName = nameParts[0] ?? data.contactName;
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    let [existingContact] = await db
      .select()
      .from(contacts)
      .where(and(
        withOrgScope(contacts.orgId, org.id),
        eq(contacts.phone, data.contactPhone),
      ));

    if (!existingContact) {
      [existingContact] = await db
        .insert(contacts)
        .values({
          orgId: org.id,
          firstName,
          lastName,
          email: data.contactEmail,
          phone: data.contactPhone,
          source: 'webform',
          tags: [],
          customFields: {},
        })
        .returning();
    }

    if (!existingContact) {
      throw Errors.internal('Failed to create contact for public booking');
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const [appointment] = await db
      .insert(appointments)
      .values({
        orgId: org.id,
        contactId: existingContact.id,
        title: data.title,
        description: `Public booking by ${data.contactName} (${data.contactEmail})`,
        startTime,
        endTime,
        status: 'scheduled',
        location: 'TBD',
      })
      .returning();

    if (!appointment) {
      throw Errors.internal('Failed to create appointment');
    }

    logger.info('Public booking created', { orgSlug, appointmentId: appointment.id });
    return appointment;
  },
};
