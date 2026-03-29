/**
 * AI Booking Tools — Claude tool definitions and execution handlers.
 *
 * Exports:
 *   BOOKING_TOOLS  — array of 6 Anthropic tool definitions to pass to the
 *                    Claude `tools` parameter.
 *   executeBookingTool — dispatcher that runs the correct handler for a given
 *                        tool call and always returns a JSON string result.
 */

import Anthropic from '@anthropic-ai/sdk';
import { db, bookableServices, appointments, withOrgScope } from '@hararai/db';
import { eq, and, ilike } from 'drizzle-orm';
import { schedulingService } from './scheduling-service.js';
import { waitlistService } from './waitlist-service.js';
import { googleCalendarSyncService } from './google-calendar-sync-service.js';
import { logger } from '../middleware/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingContext {
  orgId: string;
  contactId: string;
  /** The channel the contact is communicating through, used to set bookedVia. */
  channel: 'webchat' | 'sms' | 'whatsapp' | 'email' | 'call';
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const BOOKING_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description:
      'Check available appointment slots for a service within a date range. ' +
      'Use this when the contact asks what times are available, wants to see ' +
      'open slots, or asks when they can book. Pass serviceName for a fuzzy ' +
      'match when you do not yet have a serviceId.',
    input_schema: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description:
            'Human-readable service name for fuzzy matching (e.g. "haircut", "consultation"). ' +
            'Use this when you do not have a serviceId yet.',
        },
        serviceId: {
          type: 'string',
          description: 'Exact UUID of the bookable service (preferred over serviceName when known).',
        },
        dateRange: {
          type: 'object',
          description: 'The date window to check availability within.',
          properties: {
            start: {
              type: 'string',
              description: 'Start date in ISO format YYYY-MM-DD.',
            },
            end: {
              type: 'string',
              description: 'End date in ISO format YYYY-MM-DD.',
            },
          },
          required: ['start', 'end'],
        },
        preferredTimeOfDay: {
          type: 'string',
          enum: ['morning', 'afternoon', 'evening'],
          description: 'Optional preference to filter slots by time of day.',
        },
      },
      required: ['dateRange'],
    },
  },
  {
    name: 'propose_booking',
    description:
      'Propose a specific appointment slot to the contact before confirming it. ' +
      'Use this after check_availability to present a concrete time and get the ' +
      "contact's agreement. Re-checks that the slot is still available in real time.",
    input_schema: {
      type: 'object',
      properties: {
        serviceId: {
          type: 'string',
          description: 'UUID of the bookable service.',
        },
        date: {
          type: 'string',
          description: 'Date in ISO format YYYY-MM-DD.',
        },
        startTime: {
          type: 'string',
          description: 'Start time as an ISO datetime string (e.g. "2026-04-01T09:00:00").',
        },
        teamMemberId: {
          type: 'string',
          description: 'UUID of the team member / staff who will perform the service.',
        },
      },
      required: ['serviceId', 'date', 'startTime', 'teamMemberId'],
    },
  },
  {
    name: 'confirm_booking',
    description:
      'Confirm and create an appointment after the contact has agreed to a proposed slot. ' +
      'Only call this tool once the contact has explicitly agreed to the time. ' +
      'Creates the appointment and syncs to Google Calendar if connected.',
    input_schema: {
      type: 'object',
      properties: {
        serviceId: {
          type: 'string',
          description: 'UUID of the bookable service.',
        },
        date: {
          type: 'string',
          description: 'Date in ISO format YYYY-MM-DD.',
        },
        startTime: {
          type: 'string',
          description: 'Start time as an ISO datetime string (e.g. "2026-04-01T09:00:00").',
        },
        endTime: {
          type: 'string',
          description: 'End time as an ISO datetime string (e.g. "2026-04-01T10:00:00").',
        },
        teamMemberId: {
          type: 'string',
          description: 'UUID of the team member who will perform the service.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or special requests from the contact.',
        },
      },
      required: ['serviceId', 'date', 'startTime', 'endTime', 'teamMemberId'],
    },
  },
  {
    name: 'reschedule_appointment',
    description:
      'Move an existing appointment to a new date and time. ' +
      'Use this when the contact wants to change when their appointment is. ' +
      'Verifies ownership before rescheduling and updates Google Calendar.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'UUID of the appointment to reschedule.',
        },
        newDate: {
          type: 'string',
          description: 'New date in ISO format YYYY-MM-DD.',
        },
        newStartTime: {
          type: 'string',
          description: 'New start time as an ISO datetime string (e.g. "2026-04-05T14:00:00").',
        },
      },
      required: ['appointmentId', 'newDate', 'newStartTime'],
    },
  },
  {
    name: 'cancel_appointment',
    description:
      'Cancel an existing appointment. Use this when the contact wants to cancel ' +
      'their booking. Verifies that the appointment belongs to this contact before ' +
      'cancelling and removes the Google Calendar event if present.',
    input_schema: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'UUID of the appointment to cancel.',
        },
        reason: {
          type: 'string',
          description: "Optional reason for cancellation provided by the contact.",
        },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'add_to_waitlist',
    description:
      'Add the contact to the waitlist for a service when no suitable slots are ' +
      'available. Use this when availability is full, the contact cannot find a ' +
      'time that works, or they explicitly ask to be waitlisted.',
    input_schema: {
      type: 'object',
      properties: {
        serviceId: {
          type: 'string',
          description: 'UUID of the bookable service the contact wants to waitlist for.',
        },
        preferredDateRange: {
          type: 'object',
          description: 'Optional preferred date window for the waitlist entry.',
          properties: {
            start: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            end: { type: 'string', description: 'End date YYYY-MM-DD.' },
          },
        },
        preferredTimeOfDay: {
          type: 'string',
          enum: ['morning', 'afternoon', 'evening'],
          description: 'Optional preferred time of day.',
        },
        notes: {
          type: 'string',
          description: 'Any notes or special requests to record on the waitlist entry.',
        },
      },
      required: [],
    },
  },
];

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve a serviceId from either an explicit ID or a fuzzy name match.
 * Returns the service row or null if not found.
 */
async function resolveServiceId(
  orgId: string,
  input: { serviceId?: string; serviceName?: string },
) {
  if (input.serviceId) {
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          eq(bookableServices.id, input.serviceId),
          eq(bookableServices.isActive, true),
        ),
      )
      .limit(1);
    return service ?? null;
  }

  if (input.serviceName) {
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, orgId),
          ilike(bookableServices.name, `%${input.serviceName}%`),
          eq(bookableServices.isActive, true),
        ),
      )
      .limit(1);
    return service ?? null;
  }

  return null;
}

/**
 * Map a BookingContext channel to the bookedVia enum value.
 */
function channelToBookedVia(
  channel: BookingContext['channel'],
): 'ai_webchat' | 'ai_sms' | 'ai_whatsapp' | 'ai_email' | 'ai_call' {
  switch (channel) {
    case 'sms': return 'ai_sms';
    case 'whatsapp': return 'ai_whatsapp';
    case 'email': return 'ai_email';
    case 'call': return 'ai_call';
    default: return 'ai_webchat';
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckAvailability(
  input: {
    serviceName?: string;
    serviceId?: string;
    dateRange: { start: string; end: string };
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  },
  ctx: BookingContext,
): Promise<string> {
  const service = await resolveServiceId(ctx.orgId, input);

  if (!service) {
    // Return a list of available services so Claude can guide the contact
    const services = await db
      .select({ id: bookableServices.id, name: bookableServices.name })
      .from(bookableServices)
      .where(
        and(
          withOrgScope(bookableServices.orgId, ctx.orgId),
          eq(bookableServices.isActive, true),
        ),
      );

    return JSON.stringify({
      error: 'Service not found',
      availableServices: services,
    });
  }

  const result = await schedulingService.getAvailabilityForAI(ctx.orgId, {
    serviceId: service.id,
    startDate: input.dateRange.start,
    endDate: input.dateRange.end,
    preferredTimeOfDay: input.preferredTimeOfDay,
  });

  return JSON.stringify({
    service: result.service,
    slots: result.slots.slice(0, 10),
    totalAvailable: result.totalAvailable,
  });
}

async function handleProposeBooking(
  input: {
    serviceId: string;
    date: string;
    startTime: string;
    teamMemberId: string;
  },
  ctx: BookingContext,
): Promise<string> {
  // Re-check availability for just the requested date
  const result = await schedulingService.getAvailabilityForAI(ctx.orgId, {
    serviceId: input.serviceId,
    startDate: input.date,
    endDate: input.date,
  });

  const requestedSlot = result.slots.find(
    (s) =>
      s.teamMemberId === input.teamMemberId &&
      s.startTime.startsWith(input.startTime.slice(0, 16)),
  );

  if (requestedSlot) {
    return JSON.stringify({
      available: true,
      proposal: requestedSlot,
      service: result.service,
      message: 'Slot is available. Please confirm with the contact before calling confirm_booking.',
    });
  }

  // Slot is gone — offer alternatives
  return JSON.stringify({
    available: false,
    alternatives: result.slots.slice(0, 5),
    message: 'The requested slot is no longer available. Here are alternatives.',
  });
}

async function handleConfirmBooking(
  input: {
    serviceId: string;
    date: string;
    startTime: string;
    endTime: string;
    teamMemberId: string;
    notes?: string;
  },
  ctx: BookingContext,
): Promise<string> {
  // Fetch service name for the appointment title
  const [service] = await db
    .select({ name: bookableServices.name, durationMinutes: bookableServices.durationMinutes })
    .from(bookableServices)
    .where(
      and(
        withOrgScope(bookableServices.orgId, ctx.orgId),
        eq(bookableServices.id, input.serviceId),
      ),
    )
    .limit(1);

  const title = service ? service.name : 'Appointment';
  const startTime = new Date(input.startTime + (input.startTime.endsWith('Z') ? '' : 'Z'));
  const endTime = new Date(input.endTime + (input.endTime.endsWith('Z') ? '' : 'Z'));

  try {
    const appointment = await schedulingService.createAppointment(ctx.orgId, {
      contactId: ctx.contactId,
      title,
      startTime,
      endTime,
      assignedTo: input.teamMemberId,
      notes: input.notes ?? null,
      serviceId: input.serviceId,
      bookedVia: channelToBookedVia(ctx.channel),
    });

    // Push to Google Calendar asynchronously — do not block the response
    googleCalendarSyncService
      .pushAppointmentToGoogle(appointment.id, ctx.orgId, input.teamMemberId, {
        summary: title,
        description: input.notes ?? '',
        startTime,
        endTime,
      })
      .catch((err: unknown) => {
        logger.error('Async Google Calendar push failed after confirm_booking', {
          appointmentId: appointment.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return JSON.stringify({
      success: true,
      appointmentId: appointment.id,
      title,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.toLowerCase().includes('conflict')) {
      // Slot was taken — fetch alternatives
      const result = await schedulingService.getAvailabilityForAI(ctx.orgId, {
        serviceId: input.serviceId,
        startDate: input.date,
        endDate: input.date,
      });

      return JSON.stringify({
        success: false,
        error: 'Time slot conflicts with an existing appointment',
        alternatives: result.slots.slice(0, 5),
      });
    }

    return JSON.stringify({ success: false, error: message });
  }
}

async function handleRescheduleAppointment(
  input: {
    appointmentId: string;
    newDate: string;
    newStartTime: string;
  },
  ctx: BookingContext,
): Promise<string> {
  // Verify the appointment belongs to this contact
  const [existing] = await db
    .select()
    .from(appointments)
    .where(
      and(
        withOrgScope(appointments.orgId, ctx.orgId),
        eq(appointments.id, input.appointmentId),
        eq(appointments.contactId, ctx.contactId),
      ),
    )
    .limit(1);

  if (!existing) {
    return JSON.stringify({ success: false, error: 'Appointment not found or access denied' });
  }

  // Calculate new end time by preserving the original duration
  const originalDurationMs =
    existing.endTime.getTime() - existing.startTime.getTime();

  const newStart = new Date(
    input.newStartTime + (input.newStartTime.endsWith('Z') ? '' : 'Z'),
  );
  const newEnd = new Date(newStart.getTime() + originalDurationMs);

  try {
    const updated = await schedulingService.updateAppointment(
      ctx.orgId,
      input.appointmentId,
      {
        startTime: newStart,
        endTime: newEnd,
      },
    );

    // Update Google Calendar asynchronously
    if (existing.googleEventId && existing.assignedTo) {
      googleCalendarSyncService
        .updateGoogleEvent(
          input.appointmentId,
          ctx.orgId,
          existing.assignedTo,
          existing.googleEventId,
          {
            startTime: newStart,
            endTime: newEnd,
          },
        )
        .catch((err: unknown) => {
          logger.error('Async Google Calendar update failed after reschedule', {
            appointmentId: input.appointmentId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return JSON.stringify({
      success: true,
      appointmentId: updated.id,
      newStartTime: updated.startTime,
      newEndTime: updated.endTime,
      status: updated.status,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleCancelAppointment(
  input: { appointmentId: string; reason?: string },
  ctx: BookingContext,
): Promise<string> {
  // Verify the appointment belongs to this contact
  const [existing] = await db
    .select()
    .from(appointments)
    .where(
      and(
        withOrgScope(appointments.orgId, ctx.orgId),
        eq(appointments.id, input.appointmentId),
        eq(appointments.contactId, ctx.contactId),
      ),
    )
    .limit(1);

  if (!existing) {
    return JSON.stringify({ success: false, error: 'Appointment not found or access denied' });
  }

  try {
    const cancelled = await schedulingService.cancelAppointment(
      ctx.orgId,
      input.appointmentId,
    );

    // Delete from Google Calendar asynchronously
    if (existing.googleEventId && existing.assignedTo) {
      googleCalendarSyncService
        .deleteGoogleEvent(ctx.orgId, existing.assignedTo, existing.googleEventId)
        .catch((err: unknown) => {
          logger.error('Async Google Calendar delete failed after cancel', {
            appointmentId: input.appointmentId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return JSON.stringify({
      success: true,
      appointmentId: cancelled.id,
      status: cancelled.status,
      reason: input.reason ?? null,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleAddToWaitlist(
  input: {
    serviceId?: string;
    preferredDateRange?: { start: string; end: string };
    preferredTimeOfDay?: string;
    notes?: string;
  },
  ctx: BookingContext,
): Promise<string> {
  try {
    const entry = await waitlistService.create(ctx.orgId, {
      contactId: ctx.contactId,
      serviceId: input.serviceId ?? null,
      preferredDateRange: input.preferredDateRange ?? null,
      preferredTimeOfDay: input.preferredTimeOfDay ?? null,
      notes: input.notes ?? null,
    });

    return JSON.stringify({
      success: true,
      waitlistId: entry.id,
      status: entry.status,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Execute a booking tool by name with the provided input.
 * Always returns a JSON string — never throws.
 */
export async function executeBookingTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: BookingContext,
): Promise<string> {
  try {
    switch (toolName) {
      case 'check_availability':
        return await handleCheckAvailability(
          toolInput as Parameters<typeof handleCheckAvailability>[0],
          ctx,
        );
      case 'propose_booking':
        return await handleProposeBooking(
          toolInput as Parameters<typeof handleProposeBooking>[0],
          ctx,
        );
      case 'confirm_booking':
        return await handleConfirmBooking(
          toolInput as Parameters<typeof handleConfirmBooking>[0],
          ctx,
        );
      case 'reschedule_appointment':
        return await handleRescheduleAppointment(
          toolInput as Parameters<typeof handleRescheduleAppointment>[0],
          ctx,
        );
      case 'cancel_appointment':
        return await handleCancelAppointment(
          toolInput as Parameters<typeof handleCancelAppointment>[0],
          ctx,
        );
      case 'add_to_waitlist':
        return await handleAddToWaitlist(
          toolInput as Parameters<typeof handleAddToWaitlist>[0],
          ctx,
        );
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    logger.error('Unexpected error in executeBookingTool', {
      toolName,
      error: err instanceof Error ? err.message : String(err),
    });
    return JSON.stringify({
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    });
  }
}
