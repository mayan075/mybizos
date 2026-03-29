import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  db,
  aiAgents,
  aiCallLogs,
  contacts,
  notifications,
} from '@hararai/db';
import { logger } from '../../middleware/logger.js';
import { resolveContact } from '../../services/contact-resolution-service.js';
import { activityService } from '../../services/activity-service.js';
import { walletService } from '../../services/wallet-service.js';
import { executeToolCall } from '../../services/call-tool-handler.js';

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
        const toolResult = await executeToolCall(
          { orgId, callerPhone: customerPhone, agentId: agent.id },
          name,
          args,
        );
        results.push({ toolCallId, result: toolResult.result });
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
