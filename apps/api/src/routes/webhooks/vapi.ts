import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import {
  db,
  aiAgents,
  aiCallLogs,
  contacts,
  appointments,
  deals,
  pipelines,
  pipelineStages,
  notifications,
  withOrgScope,
} from '@hararai/db';
import { logger } from '../../middleware/logger.js';
import { config } from '../../config.js';
import { resolveContact } from '../../services/contact-resolution-service.js';
import { activityService } from '../../services/activity-service.js';
import { walletService } from '../../services/wallet-service.js';

const vapiWebhooks = new Hono();

// ── Types ─────────────────────────────────────────────────────────────────

interface VapiToolCallRequest {
  message: {
    type: string;
    toolCalls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
  };
  call: {
    id: string;
    assistantId: string;
    phoneNumber?: { number: string };
    customer?: { number: string };
  };
}

interface VapiCallEndedRequest {
  message?: {
    type: string;
    call?: VapiCallData;
    endedReason?: string;
  };
  call?: VapiCallData;
}

interface VapiCallData {
  id: string;
  assistantId: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string;
  endedReason: string;
  duration: number;
  cost: number;
  transcript: string;
  summary: string;
  recordingUrl: string;
  messages: Array<{ role: string; message: string; time: number }>;
  phoneNumber?: { id: string; number: string };
  customer?: { number: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Find the org that owns a Vapi assistant by looking up the agent record.
 */
async function findOrgByAssistantId(assistantId: string) {
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.vapiAssistantId, assistantId))
    .limit(1);

  return agent;
}

/**
 * Find or create a contact by phone number within an org.
 */
async function findOrCreateContact(orgId: string, phone: string) {
  return resolveContact(orgId, phone, 'phone');
}

/**
 * Create a deal in the default pipeline's first stage.
 */
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
    logger.warn('[Vapi] No default pipeline found', { orgId });
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
    logger.warn('[Vapi] No new_lead stage in default pipeline', { orgId });
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

// ── Tool Call Handler ─────────────────────────────────────────────────────

vapiWebhooks.post('/tool-call', async (c) => {
  try {
    const body = await c.req.json() as VapiToolCallRequest;
    const toolCalls = body.message?.toolCalls ?? body.message?.toolCallList ?? [];
    const assistantId = body.call?.assistantId;
    const customerPhone = body.call?.customer?.number ?? '';

    logger.info('[Vapi] Tool call received', {
      assistantId,
      toolCount: toolCalls.length,
      tools: toolCalls.map(tc => tc.function.name),
    });

    if (!assistantId) {
      return c.json({ results: [{ toolCallId: 'unknown', result: 'No assistant ID' }] });
    }

    const agent = await findOrgByAssistantId(assistantId);
    if (!agent) {
      logger.error('[Vapi] No agent found for assistant', { assistantId });
      return c.json({ results: [{ toolCallId: 'unknown', result: 'Agent not found' }] });
    }

    const orgId = agent.orgId;
    const results: Array<{ toolCallId: string; result: string }> = [];

    // ── Pre-call balance check ──────────────────────────────────────────
    // Ensure the org has at least $0.50 to cover potential call costs
    let hasSufficientBalance = true;
    try {
      const balance = await walletService.getBalance(orgId);
      if (balance < 0.50) {
        hasSufficientBalance = false;
        logger.warn('[Vapi] Insufficient wallet balance for tool calls', {
          orgId,
          balance,
        });
      }
    } catch (err) {
      // If wallet check fails, allow the call to proceed (don't block on wallet errors)
      logger.error('[Vapi] Failed to check wallet balance', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!hasSufficientBalance) {
      // Return a friendly message for all tool calls when balance is too low
      for (const toolCall of toolCalls) {
        results.push({
          toolCallId: toolCall.id,
          result: "I'm sorry, the business account needs to be topped up. Please call back shortly or leave your details and we'll get back to you.",
        });
      }
      return c.json({ results });
    }

    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      const toolCallId = toolCall.id;

      try {
        switch (name) {
          case 'book_appointment': {
            const customerName = String(args['customerName'] ?? 'Unknown');
            const phone = String(args['customerPhone'] ?? customerPhone);
            const serviceType = String(args['serviceType'] ?? 'General Service');
            const preferredDate = String(args['preferredDate'] ?? '');
            const preferredTime = String(args['preferredTime'] ?? 'morning');
            const notes = String(args['notes'] ?? '');

            // Resolve contact
            const contact = await findOrCreateContact(orgId, phone);

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

            // Create deal
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
              metadata: { source: 'vapi_tool_call' },
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

            results.push({
              toolCallId,
              result: `Appointment booked successfully for ${dateStr} at ${timeStr}. Service: ${serviceType}. The customer will receive a confirmation.`,
            });

            logger.info('[Vapi] Appointment booked', {
              orgId,
              contactId: contact.id,
              appointmentId: appointment?.id,
              dealId: deal?.id,
              serviceType,
            });
            break;
          }

          case 'check_availability': {
            const date = String(args['date'] ?? '');

            // Query existing appointments for the date
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

            const { gte, lte } = await import('drizzle-orm');
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
              results.push({
                toolCallId,
                result: `Unfortunately, we're fully booked on ${dateStr}. Would you like to check another day?`,
              });
            } else {
              results.push({
                toolCallId,
                result: `Available times on ${dateStr}: ${available.join(', ')}. Which time works best for you?`,
              });
            }
            break;
          }

          case 'transfer_to_human': {
            const reason = String(args['reason'] ?? 'caller_request');
            const summary = String(args['summary'] ?? '');

            logger.info('[Vapi] Transfer to human requested', { orgId, reason, summary });

            // Send notification to owner
            await db.insert(notifications).values({
              orgId,
              title: `AI call needs human attention`,
              description: `Reason: ${reason}. ${summary}`,
              type: 'call',
              metadata: { reason, customerPhone },
            });

            results.push({
              toolCallId,
              result: 'I\'m transferring you to a team member now. Please hold for just a moment.',
            });
            break;
          }

          case 'end_call': {
            const reason = String(args['reason'] ?? 'information_provided');
            const summary = String(args['summary'] ?? '');

            logger.info('[Vapi] Call ending', { orgId, reason, summary });

            results.push({
              toolCallId,
              result: 'Call ended successfully.',
            });
            break;
          }

          default: {
            logger.warn('[Vapi] Unknown tool call', { name, toolCallId });
            results.push({
              toolCallId,
              result: `Unknown function: ${name}`,
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[Vapi] Tool call handler error', { name, toolCallId, error: message });
        results.push({
          toolCallId,
          result: `I'm sorry, I encountered an issue processing that request. Let me transfer you to a team member.`,
        });
      }
    }

    return c.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Vapi] Tool call webhook error', { error: message });
    return c.json({
      results: [{
        toolCallId: 'error',
        result: 'An error occurred. Let me transfer you to a team member.',
      }],
    });
  }
});

// ── Call Ended Handler ────────────────────────────────────────────────────

vapiWebhooks.post('/call-ended', async (c) => {
  try {
    const body = await c.req.json() as VapiCallEndedRequest;
    const callData = body.message?.call ?? body.call;

    if (!callData) {
      logger.warn('[Vapi] Call-ended webhook missing call data');
      return c.json({ received: true });
    }

    const {
      id: vapiCallId,
      assistantId,
      transcript,
      summary,
      duration,
      cost,
      recordingUrl,
      endedReason,
      customer,
    } = callData;

    logger.info('[Vapi] Call ended', {
      vapiCallId,
      assistantId,
      duration,
      endedReason,
      hasSummary: !!summary,
      hasTranscript: !!transcript,
    });

    // Find the org and agent
    const agent = await findOrgByAssistantId(assistantId);
    if (!agent) {
      logger.error('[Vapi] Call-ended: No agent found for assistant', { assistantId });
      return c.json({ received: true });
    }

    const orgId = agent.orgId;
    const customerPhone = customer?.number ?? '';

    // Resolve contact
    let contactId: string | null = null;
    if (customerPhone) {
      try {
        const contact = await findOrCreateContact(orgId, customerPhone);
        contactId = contact.id;

        // Update contact name from transcript if they're still "Unknown"
        if (contact.firstName === 'Unknown' && summary) {
          // Try to extract name from summary
          const nameMatch = summary.match(/(?:caller|customer|name)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i);
          if (nameMatch?.[1]) {
            const [first, ...rest] = nameMatch[1].split(' ');
            await db.update(contacts).set({
              firstName: first ?? 'Unknown',
              lastName: rest.join(' ') || '',
            }).where(eq(contacts.id, contact.id));
          }
        }
      } catch (err) {
        logger.error('[Vapi] Failed to resolve contact', {
          orgId,
          phone: customerPhone,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Determine outcome from endedReason and summary
    let outcome: 'booked' | 'qualified' | 'escalated' | 'spam' | 'voicemail' = 'qualified';
    if (endedReason === 'voicemail-reached' || endedReason === 'voicemail') {
      outcome = 'voicemail';
    } else if (summary?.toLowerCase().includes('appointment') || summary?.toLowerCase().includes('booked')) {
      outcome = 'booked';
    } else if (summary?.toLowerCase().includes('transfer') || summary?.toLowerCase().includes('escalat')) {
      outcome = 'escalated';
    }

    // Log the call
    try {
      await db.insert(aiCallLogs).values({
        orgId,
        agentId: agent.id,
        contactId,
        twilioCallSid: vapiCallId,
        direction: 'inbound',
        durationSeconds: duration ?? 0,
        recordingUrl: recordingUrl || null,
        transcript: transcript || null,
        summary: summary || null,
        sentiment: null,
        outcome,
      });

      logger.info('[Vapi] Call logged', { orgId, vapiCallId, outcome, duration });
    } catch (err) {
      logger.error('[Vapi] Failed to log call', {
        orgId,
        vapiCallId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Debit wallet for AI call cost (fire-and-forget) ─────────────────
    try {
      const durationSeconds = duration ?? 0;
      const DEFAULT_AI_CALL_RATE = 0.15; // $0.15 per minute
      const callCost = (durationSeconds / 60) * DEFAULT_AI_CALL_RATE;

      if (callCost > 0) {
        await walletService.debit(orgId, {
          amount: callCost,
          category: 'ai_call',
          description: `AI call (${Math.ceil(durationSeconds / 60)} min)`,
          relatedResourceId: vapiCallId,
        });
        logger.info('[Vapi] Wallet debited for call', {
          orgId,
          vapiCallId,
          callCost: callCost.toFixed(4),
          durationSeconds,
        });
      }
    } catch (err) {
      // Fire-and-forget: log warning but don't fail the webhook
      logger.warn('[Vapi] Failed to debit wallet for call', {
        orgId,
        vapiCallId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Log activity
    if (contactId) {
      await activityService.logActivity(orgId, {
        contactId,
        type: 'ai_interaction',
        title: `AI phone call (${Math.ceil((duration ?? 0) / 60)} min)`,
        description: summary || `AI call with ${customerPhone}. Duration: ${duration}s. Outcome: ${outcome}`,
        metadata: { vapiCallId, outcome, duration, recordingUrl },
      }).catch(err => {
        logger.error('[Vapi] Failed to log activity', { error: err instanceof Error ? err.message : String(err) });
      });
    }

    // Trigger AI lead scoring in background (fire-and-forget)
    if (contactId) {
      import('../../services/lead-scoring-service.js').then(({ leadScoringService }) => {
        leadScoringService.scoreContactInBackground(orgId, contactId);
      }).catch(err => {
        logger.error('[Vapi] Failed to import lead scoring service', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    // Send notification to business owner about the call
    await db.insert(notifications).values({
      orgId,
      title: outcome === 'booked'
        ? `AI booked an appointment from call`
        : `AI handled inbound call (${outcome})`,
      description: summary || `Call with ${customerPhone}. Duration: ${Math.ceil((duration ?? 0) / 60)} min.`,
      type: 'call',
      metadata: { vapiCallId, outcome, contactId, customerPhone },
    }).catch(err => {
      logger.error('[Vapi] Failed to create notification', { error: err instanceof Error ? err.message : String(err) });
    });

    return c.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Vapi] Call-ended webhook error', { error: message });
    // Always return 200 to prevent Vapi from retrying
    return c.json({ received: true });
  }
});

export { vapiWebhooks as vapiWebhookRoutes };
