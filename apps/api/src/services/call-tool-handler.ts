/**
 * Reusable tool call handler for AI voice agent sessions.
 *
 * Extracted from the Vapi webhook handler so the same tool logic
 * can be used by both the Gemini Live bridge and the Vapi webhook
 * during migration. Each tool returns a string result that the
 * voice model speaks back to the caller.
 */

import { eq, and, gte, lte } from 'drizzle-orm';
import {
  db,
  contacts,
  appointments,
  deals,
  pipelines,
  pipelineStages,
  notifications,
  withOrgScope,
} from '@hararai/db';
import { resolveContact } from './contact-resolution-service.js';
import { activityService } from './activity-service.js';
import { logger } from '../middleware/logger.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolCallContext {
  orgId: string;
  callerPhone: string;
  agentId: string;
}

export interface ToolCallResult {
  result: string;
  sideEffects?: {
    contactId?: string;
    appointmentId?: string;
    dealId?: string;
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Execute a voice agent tool call and return the result string.
 * Works with both Gemini Live sessions and Vapi webhooks.
 */
export async function executeToolCall(
  context: ToolCallContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const { orgId, callerPhone, agentId } = context;

  switch (toolName) {
    case 'book_appointment':
      return handleBookAppointment(orgId, callerPhone, args);

    case 'check_availability':
      return handleCheckAvailability(orgId, args);

    case 'transfer_to_human':
      return handleTransferToHuman(orgId, callerPhone, args);

    case 'end_call':
      return handleEndCall(orgId, args);

    default:
      logger.warn('[ToolHandler] Unknown tool call', { toolName, orgId, agentId });
      return { result: `Unknown function: ${toolName}` };
  }
}

// ─── Tool Implementations ───────────────────────────────────────────────────

async function handleBookAppointment(
  orgId: string,
  callerPhone: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const customerName = String(args['customerName'] ?? 'Unknown');
  const phone = String(args['customerPhone'] ?? callerPhone);
  const serviceType = String(args['serviceType'] ?? 'General Service');
  const preferredDate = String(args['preferredDate'] ?? '');
  const preferredTime = String(args['preferredTime'] ?? 'morning');
  const notes = String(args['notes'] ?? '');

  // Resolve contact
  const contact = await resolveContact(orgId, phone, 'phone');

  // Update contact name if we learned it
  if (customerName !== 'Unknown' && contact.firstName === 'Unknown') {
    const [first, ...rest] = customerName.split(' ');
    await db.update(contacts).set({
      firstName: first ?? customerName,
      lastName: rest.join(' ') || '',
    }).where(eq(contacts.id, contact.id));
  }

  // Parse date
  let startTime: Date;
  if (preferredDate) {
    startTime = new Date(preferredDate);
    if (preferredTime === 'morning') startTime.setHours(9, 0, 0, 0);
    else if (preferredTime === 'afternoon') startTime.setHours(13, 0, 0, 0);
    else startTime.setHours(17, 0, 0, 0);
  } else {
    startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(9, 0, 0, 0);
  }

  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);

  // Create appointment
  const [appointment] = await db
    .insert(appointments)
    .values({
      orgId,
      contactId: contact.id,
      title: serviceType,
      description: notes || `Booked via AI phone agent for ${serviceType}`,
      startTime,
      endTime,
      status: 'scheduled',
      location: null,
      notes: `AI-booked. Preferred: ${preferredTime}`,
    })
    .returning();

  // Create deal in default pipeline
  const deal = await createDealFromCall(orgId, contact.id, serviceType, {
    appointmentId: appointment?.id,
    preferredDate,
  });

  // Log activity
  await activityService.logActivity(orgId, {
    contactId: contact.id,
    dealId: deal?.id,
    type: 'appointment_booked',
    title: 'AI phone agent booked appointment',
    description: `${customerName} booked ${serviceType} for ${preferredDate || 'next available'} (${preferredTime})`,
    metadata: { source: 'ai_tool_call' },
  });

  // Send notification to business owner
  await db.insert(notifications).values({
    orgId,
    title: `New booking: ${serviceType}`,
    description: `${customerName} booked ${serviceType} for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    type: 'appointment',
    metadata: { appointmentId: appointment?.id, contactId: contact.id },
  });

  const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  logger.info('[ToolHandler] Appointment booked', {
    orgId,
    contactId: contact.id,
    appointmentId: appointment?.id,
    dealId: deal?.id,
    serviceType,
  });

  return {
    result: `Appointment booked successfully for ${dateStr} at ${timeStr}. Service: ${serviceType}. The customer will receive a confirmation.`,
    sideEffects: {
      contactId: contact.id,
      appointmentId: appointment?.id,
      dealId: deal?.id,
    },
  };
}

async function handleCheckAvailability(
  orgId: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const date = String(args['date'] ?? '');

  let checkDate: Date;
  if (date) {
    checkDate = new Date(date);
  } else {
    checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + 1);
  }

  const dayStart = new Date(checkDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(checkDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppts = await db
    .select({ startTime: appointments.startTime })
    .from(appointments)
    .where(and(
      withOrgScope(appointments.orgId, orgId),
      gte(appointments.startTime, dayStart),
      lte(appointments.startTime, dayEnd),
    ));

  const bookedHours = new Set(
    existingAppts.map(a => new Date(a.startTime).getHours()),
  );

  // Available slots (business hours 8am-5pm, 1-hour slots)
  const available: string[] = [];
  for (let hour = 8; hour < 17; hour++) {
    if (!bookedHours.has(hour)) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      available.push(`${displayHour}:00 ${period}`);
    }
  }

  const dateStr = checkDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (available.length === 0) {
    return {
      result: `Unfortunately, we're fully booked on ${dateStr}. Would you like to check another day?`,
    };
  }

  return {
    result: `Available times on ${dateStr}: ${available.join(', ')}. Which time works best for you?`,
  };
}

async function handleTransferToHuman(
  orgId: string,
  callerPhone: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const reason = String(args['reason'] ?? 'caller_request');
  const summary = String(args['summary'] ?? '');

  logger.info('[ToolHandler] Transfer to human requested', { orgId, reason, summary });

  await db.insert(notifications).values({
    orgId,
    title: 'AI call needs human attention',
    description: `Reason: ${reason}. ${summary}`,
    type: 'call',
    metadata: { reason, customerPhone: callerPhone },
  });

  return {
    result: "I'm transferring you to a team member now. Please hold for just a moment.",
  };
}

async function handleEndCall(
  orgId: string,
  args: Record<string, unknown>,
): Promise<ToolCallResult> {
  const reason = String(args['reason'] ?? 'information_provided');
  const summary = String(args['summary'] ?? '');

  logger.info('[ToolHandler] Call ending', { orgId, reason, summary });

  return {
    result: 'Call ended successfully.',
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createDealFromCall(
  orgId: string,
  contactId: string,
  title: string,
  metadata: Record<string, unknown>,
) {
  const [defaultPipeline] = await db
    .select()
    .from(pipelines)
    .where(and(
      withOrgScope(pipelines.orgId, orgId),
      eq(pipelines.isDefault, true),
    ))
    .limit(1);

  if (!defaultPipeline) {
    logger.warn('[ToolHandler] No default pipeline found', { orgId });
    return null;
  }

  const [newLeadStage] = await db
    .select()
    .from(pipelineStages)
    .where(and(
      eq(pipelineStages.pipelineId, defaultPipeline.id),
      eq(pipelineStages.slug, 'new_lead'),
    ))
    .limit(1);

  if (!newLeadStage) {
    logger.warn('[ToolHandler] No new_lead stage in default pipeline', { orgId });
    return null;
  }

  const [deal] = await db
    .insert(deals)
    .values({
      orgId,
      pipelineId: defaultPipeline.id,
      stageId: newLeadStage.id,
      contactId,
      title,
      value: '0',
      currency: 'AUD',
      metadata: { source: 'ai_phone_call', ...metadata },
    })
    .returning();

  return deal ?? null;
}
