import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  db,
  organizations,
  contacts,
  conversations,
  aiAgents,
  aiCallLogs,
  pipelines,
  pipelineStages,
  orgMembers,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, asc } from 'drizzle-orm';
import { TwilioClient } from '@mybizos/integrations';
import { ClaudeClient } from '@mybizos/ai';
import { config } from '../../config.js';
import { logger } from '../../middleware/logger.js';
import { contactService } from '../../services/contact-service.js';
import { conversationService } from '../../services/conversation-service.js';
import { activityService } from '../../services/activity-service.js';
import { schedulingService } from '../../services/scheduling-service.js';
import { dealService } from '../../services/deal-service.js';

const vapiWebhooks = new Hono();

// ── Validation Schemas ──

const callEndedSchema = z.object({
  message: z.object({
    type: z.literal('end-of-call-report'),
    endedReason: z.string().optional(),
    call: z.object({
      id: z.string(),
      assistantId: z.string().optional(),
      type: z.string().optional(),
      startedAt: z.string().optional(),
      endedAt: z.string().optional(),
      cost: z.number().optional(),
      phoneNumber: z.object({
        id: z.string().optional(),
        number: z.string().optional(),
      }).optional(),
      customer: z.object({
        number: z.string().optional(),
      }).optional(),
    }),
    transcript: z.string().optional(),
    messages: z.array(z.object({
      role: z.string(),
      message: z.string().optional(),
      time: z.number().optional(),
      secondsFromStart: z.number().optional(),
    })).optional(),
    summary: z.string().optional(),
    recordingUrl: z.string().optional(),
    durationSeconds: z.number().optional(),
  }),
});

const toolCallSchema = z.object({
  message: z.object({
    type: z.literal('tool-calls'),
    call: z.object({
      id: z.string(),
      assistantId: z.string().optional(),
      phoneNumber: z.object({
        number: z.string().optional(),
      }).optional(),
      customer: z.object({
        number: z.string().optional(),
      }).optional(),
    }),
    toolCallList: z.array(z.object({
      id: z.string(),
      type: z.string(),
      function: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()),
      }),
    })),
  }),
});

// ── Signature Verification ──

function verifyVapiSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', config.VAPI_WEBHOOK_SECRET)
    .update(body, 'utf-8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── Helpers ──

function getTwilioClient(): TwilioClient {
  return new TwilioClient({
    accountSid: config.TWILIO_ACCOUNT_SID,
    authToken: config.TWILIO_AUTH_TOKEN,
    defaultFromNumber: config.TWILIO_PHONE_NUMBER,
  });
}

function getClaudeClient(): ClaudeClient {
  return new ClaudeClient({ apiKey: config.ANTHROPIC_API_KEY });
}

/** Find the org that owns a given phone number. */
async function findOrgByPhoneNumber(phoneNumber: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.phone, phoneNumber));
  return org ?? null;
}

/** Find the org's active phone AI agent. */
async function findPhoneAgent(orgId: string) {
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(
      withOrgScope(aiAgents.orgId, orgId),
      eq(aiAgents.type, 'phone'),
      eq(aiAgents.isActive, true),
    ));
  return agent ?? null;
}

/** Get the org owner's phone number. */
async function getOwnerPhone(orgId: string): Promise<string | null> {
  const [org] = await db
    .select({ phone: organizations.phone })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return org?.phone ?? null;
}

/** Determine call outcome from summary text. */
function determineOutcome(
  summary: string,
): typeof aiCallLogs.outcome.enumValues[number] {
  const lower = summary.toLowerCase();
  if (lower.includes('appointment') || lower.includes('booked') || lower.includes('scheduled')) {
    return 'booked';
  }
  if (lower.includes('qualified') || lower.includes('interested') || lower.includes('estimate')) {
    return 'qualified';
  }
  if (lower.includes('transfer') || lower.includes('escalat') || lower.includes('emergency')) {
    return 'escalated';
  }
  if (lower.includes('spam') || lower.includes('wrong number') || lower.includes('solicitor')) {
    return 'spam';
  }
  return 'voicemail';
}

// ── Routes ──

/**
 * POST /webhooks/vapi/call-ended -- end-of-call report from Vapi
 *
 * Processes:
 * 1. Store transcript in ai_call_logs
 * 2. Generate call summary using Claude
 * 3. Create/update contact from caller info
 * 4. If appointment booked -> create appointment
 * 5. If lead qualified -> create deal in first pipeline stage
 * 6. Log activity on contact timeline
 * 7. Send owner SMS notification
 */
vapiWebhooks.post('/call-ended', async (c) => {
  const rawBody = await c.req.text();

  // Verify Vapi webhook signature
  const signature = c.req.header('X-Vapi-Signature') ?? '';
  if (config.NODE_ENV === 'production') {
    if (!verifyVapiSignature(rawBody, signature)) {
      logger.warn('Invalid Vapi webhook signature for call-ended');
      return c.json({ error: 'Invalid signature' }, 403);
    }
  }

  const payload = callEndedSchema.parse(JSON.parse(rawBody));
  const { message } = payload;
  const call = message.call;

  logger.info('Vapi call ended', {
    callId: call.id,
    duration: message.durationSeconds,
    endedReason: message.endedReason,
  });

  // Determine which org this call belongs to
  const orgPhoneNumber = call.phoneNumber?.number;
  if (!orgPhoneNumber) {
    logger.warn('Vapi call-ended missing phone number', { callId: call.id });
    return c.json({ received: true });
  }

  const org = await findOrgByPhoneNumber(orgPhoneNumber);
  if (!org) {
    logger.warn('No org found for Vapi call phone number', { number: orgPhoneNumber });
    return c.json({ received: true });
  }

  const phoneAgent = await findPhoneAgent(org.id);
  if (!phoneAgent) {
    logger.warn('No phone agent found for org', { orgId: org.id });
    return c.json({ received: true });
  }

  // Step 3: Create/update contact from caller info
  const callerNumber = call.customer?.number;
  let contact = null;
  if (callerNumber) {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(
        withOrgScope(contacts.orgId, org.id),
        eq(contacts.phone, callerNumber),
      ));

    if (existing) {
      contact = existing;
    } else {
      contact = await contactService.create(org.id, {
        firstName: 'Unknown',
        lastName: callerNumber,
        phone: callerNumber,
        source: 'phone',
      });
      logger.info('Auto-created contact from Vapi call', {
        orgId: org.id,
        contactId: contact.id,
        phone: callerNumber,
      });
    }
  }

  // Step 2: Generate call summary using Claude if transcript exists
  let summary = message.summary ?? '';
  const transcript = message.transcript ?? '';

  if (transcript && !summary) {
    try {
      const claude = getClaudeClient();
      summary = await claude.complete(
        'You are a business call analyzer for a home services company. Summarize this phone call transcript in 2-3 sentences. Include: the caller\'s intent, any services discussed, and the outcome (e.g., appointment booked, quote requested, information provided). Be concise.',
        transcript,
        { maxTokens: 256 },
      );
    } catch (err) {
      logger.error('Failed to generate call summary', {
        error: err instanceof Error ? err.message : String(err),
      });
      summary = 'Call transcript available but summary generation failed.';
    }
  }

  // Determine outcome
  const outcome = determineOutcome(summary || transcript);

  // Determine sentiment from summary
  let sentiment = 'neutral';
  if (summary) {
    const lower = summary.toLowerCase();
    if (lower.includes('happy') || lower.includes('pleased') || lower.includes('thank')) {
      sentiment = 'positive';
    } else if (lower.includes('frustrated') || lower.includes('angry') || lower.includes('upset') || lower.includes('complaint')) {
      sentiment = 'negative';
    }
  }

  // Step 1: Store in ai_call_logs
  const callLog = await db
    .insert(aiCallLogs)
    .values({
      orgId: org.id,
      agentId: phoneAgent.id,
      contactId: contact?.id ?? null,
      twilioCallSid: call.id,
      direction: 'inbound',
      durationSeconds: message.durationSeconds ?? 0,
      recordingUrl: message.recordingUrl ?? null,
      transcript,
      summary,
      sentiment,
      outcome,
    })
    .returning();

  const createdCallLog = callLog[0];

  // Step 6: Log activity on contact timeline
  if (contact) {
    await activityService.logActivity(org.id, {
      contactId: contact.id,
      type: 'ai_interaction',
      title: `AI phone call - ${outcome}`,
      description: summary,
      metadata: {
        callId: call.id,
        callLogId: createdCallLog?.id,
        duration: message.durationSeconds,
        outcome,
        sentiment,
      },
    });
  }

  // Step 4: If appointment booked, create appointment
  if (outcome === 'booked' && contact) {
    try {
      // Parse appointment details from transcript/summary
      // In a real system, Vapi tool calls would have already created the appointment
      // This is a fallback for cases where the tool call didn't fire
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(10, 30, 0, 0);

      await schedulingService.createAppointment(org.id, {
        contactId: contact.id,
        title: `Service appointment - ${contact.firstName} ${contact.lastName}`,
        description: `Booked via AI phone agent. ${summary}`,
        startTime: tomorrow,
        endTime,
        notes: `Booked during AI call ${call.id}`,
      });

      await activityService.logActivity(org.id, {
        contactId: contact.id,
        type: 'appointment_booked',
        title: 'Appointment booked via AI phone call',
        description: summary,
      });

      logger.info('Appointment created from Vapi call', { orgId: org.id, contactId: contact.id });
    } catch (err) {
      logger.error('Failed to create appointment from Vapi call', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 5: If lead qualified, create deal in first pipeline stage
  if ((outcome === 'qualified' || outcome === 'booked') && contact) {
    try {
      // Find the org's default pipeline and its first stage
      const [defaultPipeline] = await db
        .select()
        .from(pipelines)
        .where(and(
          withOrgScope(pipelines.orgId, org.id),
          eq(pipelines.isDefault, true),
        ));

      if (defaultPipeline) {
        const [firstStage] = await db
          .select()
          .from(pipelineStages)
          .where(and(
            withOrgScope(pipelineStages.orgId, org.id),
            eq(pipelineStages.pipelineId, defaultPipeline.id),
          ))
          .orderBy(asc(pipelineStages.position))
          .limit(1);

        if (firstStage) {
          await dealService.create(org.id, {
            pipelineId: defaultPipeline.id,
            stageId: firstStage.id,
            contactId: contact.id,
            title: `${contact.firstName} ${contact.lastName} - AI Call Lead`,
            metadata: {
              source: 'ai_phone_call',
              callId: call.id,
              outcome,
            },
          });

          logger.info('Deal created from Vapi call', { orgId: org.id, contactId: contact.id });
        }
      }
    } catch (err) {
      logger.error('Failed to create deal from Vapi call', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 7: Send owner SMS notification
  try {
    const ownerPhone = await getOwnerPhone(org.id);
    if (ownerPhone) {
      const twilio = getTwilioClient();
      const contactName = contact
        ? `${contact.firstName} ${contact.lastName}`
        : callerNumber ?? 'Unknown';

      const outcomeLabel = outcome === 'booked' ? 'booked appointment'
        : outcome === 'qualified' ? 'qualified lead'
        : outcome === 'escalated' ? 'needs follow-up'
        : outcome === 'spam' ? 'spam/wrong number'
        : 'voicemail';

      const notificationMsg = `AI just handled a call from ${contactName} about ${org.vertical}. Outcome: ${outcomeLabel}. Duration: ${message.durationSeconds ?? 0}s.`;

      await twilio.sendSms(ownerPhone, notificationMsg);

      logger.info('Owner notification sent for Vapi call', {
        orgId: org.id,
        ownerPhone,
        outcome,
      });
    }
  } catch (err) {
    logger.error('Failed to send owner notification for Vapi call', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return c.json({ received: true });
});

/**
 * POST /webhooks/vapi/tool-call -- handle tool calls from Vapi during a call
 *
 * Handles:
 * - book_appointment: Check availability, create appointment, return confirmation
 * - check_availability: Query available slots, return options
 * - transfer_to_human: Initiate call transfer to owner
 * - end_call: Graceful goodbye
 */
vapiWebhooks.post('/tool-call', async (c) => {
  const rawBody = await c.req.text();

  // Verify signature
  const signature = c.req.header('X-Vapi-Signature') ?? '';
  if (config.NODE_ENV === 'production') {
    if (!verifyVapiSignature(rawBody, signature)) {
      logger.warn('Invalid Vapi webhook signature for tool-call');
      return c.json({ error: 'Invalid signature' }, 403);
    }
  }

  const payload = toolCallSchema.parse(JSON.parse(rawBody));
  const { message } = payload;
  const call = message.call;

  // Look up org
  const orgPhoneNumber = call.phoneNumber?.number;
  const org = orgPhoneNumber ? await findOrgByPhoneNumber(orgPhoneNumber) : null;

  if (!org) {
    logger.warn('No org found for Vapi tool-call', { number: orgPhoneNumber });
    return c.json({
      results: message.toolCallList.map((tc) => ({
        toolCallId: tc.id,
        result: 'Sorry, I am unable to process your request right now. Please try calling back later.',
      })),
    });
  }

  // Process each tool call
  const results = [];

  for (const toolCall of message.toolCallList) {
    const { name, arguments: args } = toolCall.function;

    logger.info('Vapi tool call', { callId: call.id, tool: name, orgId: org.id });

    let result: string;

    switch (name) {
      case 'book_appointment': {
        result = await handleBookAppointment(org.id, args, call.customer?.number);
        break;
      }
      case 'check_availability': {
        result = await handleCheckAvailability(org.id, args);
        break;
      }
      case 'transfer_to_human': {
        result = await handleTransferToHuman(org.id, args, call.customer?.number);
        break;
      }
      case 'end_call': {
        result = await handleEndCall(org.id, args);
        break;
      }
      default: {
        logger.warn('Unknown Vapi tool call', { tool: name });
        result = 'I apologize, but I am not able to perform that action. Is there anything else I can help you with?';
      }
    }

    results.push({
      toolCallId: toolCall.id,
      result,
    });
  }

  return c.json({ results });
});

// ── Tool Call Handlers ──

async function handleBookAppointment(
  orgId: string,
  args: Record<string, unknown>,
  customerPhone?: string,
): Promise<string> {
  try {
    const customerName = String(args['customerName'] ?? 'Unknown');
    const phone = String(args['customerPhone'] ?? customerPhone ?? '');
    const email = args['customerEmail'] ? String(args['customerEmail']) : null;
    const serviceType = String(args['serviceType'] ?? 'general_inspection');
    const preferredDate = String(args['preferredDate'] ?? '');
    const preferredTime = String(args['preferredTime'] ?? 'morning');
    const notes = args['notes'] ? String(args['notes']) : null;

    if (!preferredDate) {
      return 'I need a preferred date to book the appointment. Could you provide a date?';
    }

    // Find or create contact
    let contact = null;
    if (phone) {
      const [existing] = await db
        .select()
        .from(contacts)
        .where(and(
          withOrgScope(contacts.orgId, orgId),
          eq(contacts.phone, phone),
        ));

      if (existing) {
        contact = existing;
        // Update name if we have a better one
        if (customerName !== 'Unknown' && existing.firstName === 'Unknown') {
          const nameParts = customerName.split(' ');
          await contactService.update(orgId, existing.id, {
            firstName: nameParts[0] ?? customerName,
            lastName: nameParts.slice(1).join(' ') || 'Unknown',
            email,
          });
        }
      } else {
        const nameParts = customerName.split(' ');
        contact = await contactService.create(orgId, {
          firstName: nameParts[0] ?? customerName,
          lastName: nameParts.slice(1).join(' ') || 'Unknown',
          phone,
          email,
          source: 'phone',
        });
      }
    }

    if (!contact) {
      return 'I need a phone number to book the appointment. Could you provide your phone number?';
    }

    // Determine time slot
    const timeSlots: Record<string, { startHour: number; endHour: number }> = {
      morning: { startHour: 9, endHour: 10 },
      afternoon: { startHour: 13, endHour: 14 },
      evening: { startHour: 17, endHour: 18 },
    };
    const slot = timeSlots[preferredTime] ?? timeSlots['morning']!;

    const startTime = new Date(`${preferredDate}T${String(slot.startHour).padStart(2, '0')}:00:00`);
    const endTime = new Date(`${preferredDate}T${String(slot.endHour).padStart(2, '0')}:30:00`);

    // Create appointment
    const appointment = await schedulingService.createAppointment(orgId, {
      contactId: contact.id,
      title: `${serviceType.replace(/_/g, ' ')} - ${customerName}`,
      description: notes ?? `Booked via AI phone agent for ${serviceType.replace(/_/g, ' ')}`,
      startTime,
      endTime,
      notes: notes ?? undefined,
    });

    // Log activity
    await activityService.logActivity(orgId, {
      contactId: contact.id,
      type: 'appointment_booked',
      title: `Appointment booked via AI call`,
      description: `${serviceType.replace(/_/g, ' ')} scheduled for ${preferredDate} (${preferredTime})`,
      metadata: {
        appointmentId: appointment.id,
        serviceType,
        preferredDate,
        preferredTime,
      },
    });

    const formattedDate = new Date(preferredDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return `Your ${serviceType.replace(/_/g, ' ')} appointment has been booked for ${formattedDate} in the ${preferredTime}. You will receive a confirmation and reminder. Is there anything else I can help you with?`;
  } catch (err) {
    logger.error('Failed to book appointment via Vapi tool call', {
      error: err instanceof Error ? err.message : String(err),
      orgId,
    });

    if (err instanceof Error && err.message.includes('conflicts')) {
      return 'That time slot is not available. Would you like to try a different date or time?';
    }

    return 'I apologize, but I was unable to book the appointment right now. Would you like to try a different time, or I can have someone call you back to schedule?';
  }
}

async function handleCheckAvailability(
  orgId: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const date = String(args['date'] ?? '');
    const serviceType = String(args['serviceType'] ?? 'general_inspection');

    if (!date) {
      return 'I need a date to check availability. What date works best for you?';
    }

    // Get the first org member to check availability for
    const [member] = await db
      .select()
      .from(orgMembers)
      .where(withOrgScope(orgMembers.orgId, orgId))
      .limit(1);

    if (!member) {
      return 'I apologize, but I am unable to check availability right now. Would you like me to have someone call you back?';
    }

    const slots = await schedulingService.getAvailability(orgId, member.userId, date);
    const availableSlots = slots.filter((s) => s.available);

    if (availableSlots.length === 0) {
      return `I do not see any available slots on ${date} for ${serviceType.replace(/_/g, ' ')}. Would you like to try a different date?`;
    }

    const slotDescriptions = availableSlots.slice(0, 3).map((s) => {
      const start = s.startTime.split('T')[1]?.slice(0, 5) ?? '';
      const end = s.endTime.split('T')[1]?.slice(0, 5) ?? '';
      return `${start} to ${end}`;
    });

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return `We have the following availability on ${formattedDate} for ${serviceType.replace(/_/g, ' ')}: ${slotDescriptions.join(', ')}. Which time works best for you?`;
  } catch (err) {
    logger.error('Failed to check availability via Vapi tool call', {
      error: err instanceof Error ? err.message : String(err),
      orgId,
    });
    return 'I apologize, but I am having trouble checking our schedule. Would you like me to have someone call you back to find a good time?';
  }
}

async function handleTransferToHuman(
  orgId: string,
  args: Record<string, unknown>,
  customerPhone?: string,
): Promise<string> {
  const reason = String(args['reason'] ?? 'caller_request');
  const summary = String(args['summary'] ?? 'Caller requested human agent');
  const urgency = String(args['urgency'] ?? 'medium');

  logger.info('Call transfer requested', { orgId, reason, urgency });

  // Notify the owner via SMS about the transfer
  try {
    const ownerPhone = await getOwnerPhone(orgId);
    if (ownerPhone) {
      const twilio = getTwilioClient();
      await twilio.sendSms(
        ownerPhone,
        `AI call transfer (${urgency} priority): ${reason}. Summary: ${summary}. Caller: ${customerPhone ?? 'unknown'}`,
      );
    }
  } catch (err) {
    logger.error('Failed to notify owner about call transfer', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Log activity
  await activityService.logActivity(orgId, {
    type: 'ai_interaction',
    title: `Call transfer - ${reason}`,
    description: summary,
    metadata: { reason, urgency, customerPhone },
  });

  return `I am transferring you to a team member now. ${reason === 'emergency' ? 'Given the emergency nature of your call, someone will be with you shortly.' : 'Please hold for just a moment.'} Before I go, let me share that: ${summary}`;
}

async function handleEndCall(
  orgId: string,
  args: Record<string, unknown>,
): Promise<string> {
  const reason = String(args['reason'] ?? 'information_provided');
  const summary = String(args['summary'] ?? '');
  const followUpRequired = args['followUpRequired'] === true;
  const followUpNotes = args['followUpNotes'] ? String(args['followUpNotes']) : null;

  logger.info('Call end requested', { orgId, reason, followUpRequired });

  if (followUpRequired && followUpNotes) {
    // Log follow-up task
    await activityService.logActivity(orgId, {
      type: 'task',
      title: `Follow-up needed: ${followUpNotes}`,
      description: `AI phone call ended with follow-up required. Reason: ${reason}. ${summary}`,
      metadata: { reason, followUpNotes },
    });
  }

  const goodbyeMessages: Record<string, string> = {
    appointment_booked: 'Your appointment is all set! We look forward to seeing you. Have a great day!',
    information_provided: 'I hope I was able to help. Do not hesitate to call back if you have any more questions. Have a great day!',
    caller_request: 'Thank you for calling. Have a great day!',
    no_availability: 'I apologize we could not find a time that works. We will reach out to you when something opens up. Have a great day!',
    transferred: 'Your call is being transferred. Thank you for your patience!',
    voicemail: 'Thank you for calling. We will get back to you as soon as possible. Have a great day!',
  };

  return goodbyeMessages[reason] ?? 'Thank you for calling. Have a great day!';
}

export { vapiWebhooks as vapiWebhookRoutes };
