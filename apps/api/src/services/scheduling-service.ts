import {
  db,
  appointments,
  availabilityRules,
  contacts,
  organizations,
  withOrgScope,
  bookableServices,
  serviceTeamMembers,
  users,
  googleCalendarBusyBlocks,
} from '@hararai/db';
import { eq, and, gte, lte, or, desc, asc, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { sequenceTriggerService } from './sequence-trigger-service.js';

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
      serviceId?: string | null;
      bookedVia?: typeof appointments.bookedVia.enumValues[number] | null;
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
        serviceId: data.serviceId ?? null,
        bookedVia: data.bookedVia ?? null,
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

    // Fire sequence trigger when appointment is marked completed
    if (data.status === 'completed' && updated.contactId) {
      sequenceTriggerService.onAppointmentCompleted(orgId, updated.contactId).catch(() => {
        // Errors already logged inside the trigger service
      });
    }

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

  async getAvailabilityForAI(
    orgId: string,
    params: {
      serviceId: string;
      startDate: string; // ISO date "2026-04-01"
      endDate: string;   // ISO date "2026-04-03"
      preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
    },
  ) {
    // 1. Get the bookable service and verify it's active
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.id, params.serviceId),
        eq(bookableServices.isActive, true),
      ));

    if (!service) {
      return { service: null, slots: [], totalAvailable: 0 };
    }

    // 2. Get team members for this service joined with users
    const teamMembers = await db
      .select({
        userId: serviceTeamMembers.userId,
        userName: users.name,
      })
      .from(serviceTeamMembers)
      .innerJoin(users, eq(serviceTeamMembers.userId, users.id))
      .where(and(
        withOrgScope(serviceTeamMembers.orgId, orgId),
        eq(serviceTeamMembers.serviceId, params.serviceId),
      ));

    // 3. Generate array of dates from startDate to endDate
    const dates: string[] = [];
    const cursor = new Date(`${params.startDate}T00:00:00Z`);
    const endDateObj = new Date(`${params.endDate}T00:00:00Z`);
    while (cursor <= endDateObj) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const slotDurationMinutes = service.durationMinutes;
    const bufferMinutes = service.bufferMinutes;
    const totalSlotMinutes = slotDurationMinutes + bufferMinutes;
    const now = new Date();

    const slots: {
      date: string;
      startTime: string;
      endTime: string;
      teamMemberId: string;
      teamMemberName: string;
    }[] = [];

    // 4. For each team member, for each date
    for (const member of teamMembers) {
      for (const date of dates) {
        const dateObj = new Date(`${date}T00:00:00Z`);
        const dayOfWeek = days[dateObj.getUTCDay()];

        if (!dayOfWeek) continue;

        // Get availability rules for this team member on this day
        const rules = await db
          .select()
          .from(availabilityRules)
          .where(and(
            withOrgScope(availabilityRules.orgId, orgId),
            eq(availabilityRules.userId, member.userId),
            eq(availabilityRules.dayOfWeek, dayOfWeek),
            eq(availabilityRules.isActive, true),
          ));

        if (rules.length === 0) continue;

        const dayStart = new Date(`${date}T00:00:00Z`);
        const dayEnd = new Date(`${date}T23:59:59Z`);

        // Get existing appointments (non-cancelled, non-no_show)
        const existingAppointments = await db
          .select({
            startTime: appointments.startTime,
            endTime: appointments.endTime,
          })
          .from(appointments)
          .where(and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.assignedTo, member.userId),
            gte(appointments.startTime, dayStart),
            lte(appointments.startTime, dayEnd),
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
          ));

        // Get Google Calendar busy blocks
        const busyBlocks = await db
          .select({
            startTime: googleCalendarBusyBlocks.startTime,
            endTime: googleCalendarBusyBlocks.endTime,
          })
          .from(googleCalendarBusyBlocks)
          .where(and(
            withOrgScope(googleCalendarBusyBlocks.orgId, orgId),
            eq(googleCalendarBusyBlocks.userId, member.userId),
            gte(googleCalendarBusyBlocks.startTime, dayStart),
            lte(googleCalendarBusyBlocks.startTime, dayEnd),
          ));

        // Combine into busy times array
        const busyTimes = [
          ...existingAppointments,
          ...busyBlocks,
        ];

        // Generate time slots based on service duration + buffer
        for (const rule of rules) {
          const [startH, startM] = rule.startTime.split(':').map(Number) as [number, number];
          const [endH, endM] = rule.endTime.split(':').map(Number) as [number, number];

          const ruleStartMinutes = startH * 60 + startM;
          const ruleEndMinutes = endH * 60 + endM;

          for (
            let slotStart = ruleStartMinutes;
            slotStart + slotDurationMinutes <= ruleEndMinutes;
            slotStart += totalSlotMinutes
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

            // Skip slots in the past
            if (slotStartDate <= now) continue;

            // Skip slots that conflict with busy times
            const hasConflict = busyTimes.some((busy) => {
              return busy.startTime < slotEndDate && busy.endTime > slotStartDate;
            });

            if (hasConflict) continue;

            slots.push({
              date,
              startTime,
              endTime,
              teamMemberId: member.userId,
              teamMemberName: member.userName,
            });
          }
        }
      }
    }

    // 5. Filter by preferredTimeOfDay if specified
    let filteredSlots = slots;
    if (params.preferredTimeOfDay) {
      filteredSlots = slots.filter((slot) => {
        const hour = parseInt(slot.startTime.slice(11, 13), 10);
        if (params.preferredTimeOfDay === 'morning') return hour >= 0 && hour < 12;
        if (params.preferredTimeOfDay === 'afternoon') return hour >= 12 && hour < 17;
        if (params.preferredTimeOfDay === 'evening') return hour >= 17 && hour < 24;
        return true;
      });
    }

    // 6. Sort by startTime
    filteredSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // 7. Return result
    return {
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
      },
      slots: filteredSlots,
      totalAvailable: filteredSlots.length,
    };
  },
};
