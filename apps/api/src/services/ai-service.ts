import {
  db,
  aiAgents,
  aiCallLogs,
  deals,
  contacts,
  appointments,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, desc, count, sum, sql, gte } from 'drizzle-orm';
import { VapiClient, VAPI_TOOL_SCHEMAS } from '@mybizos/integrations';
import type { VapiAssistantConfig } from '@mybizos/integrations';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

// ─── Vapi Helper ──────────────────────────────────────────────────────────────

function getVapiClient(): VapiClient | null {
  if (!config.VAPI_API_KEY) {
    return null;
  }
  return new VapiClient({ apiKey: config.VAPI_API_KEY });
}

function buildVapiAssistantConfig(data: {
  name: string;
  systemPrompt: string;
}): VapiAssistantConfig {
  return {
    name: data.name,
    firstMessage:
      "Hi, this is your business's AI assistant. This call may be recorded. How can I help you today?",
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: data.systemPrompt,
      tools: [
        VAPI_TOOL_SCHEMAS['bookAppointment']!,
        VAPI_TOOL_SCHEMAS['checkAvailability']!,
        VAPI_TOOL_SCHEMAS['transferToHuman']!,
        VAPI_TOOL_SCHEMAS['endCall']!,
      ],
    },
    voice: {
      provider: '11labs',
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel — professional female voice
    },
    serverUrl: config.APP_URL,
    recordingEnabled: true,
    maxDurationSeconds: 600,
  };
}

export const aiService = {
  // ── AI Agents CRUD ──

  async listAgents(orgId: string) {
    const rows = await db
      .select()
      .from(aiAgents)
      .where(withOrgScope(aiAgents.orgId, orgId))
      .orderBy(desc(aiAgents.createdAt));

    return rows;
  },

  async getAgentById(orgId: string, agentId: string) {
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ));

    if (!agent) {
      throw Errors.notFound('AI Agent');
    }

    return agent;
  },

  async createAgent(
    orgId: string,
    data: {
      type: typeof aiAgents.type.enumValues[number];
      name: string;
      systemPrompt: string;
      vertical: typeof aiAgents.vertical.enumValues[number];
      settings?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const [created] = await db
      .insert(aiAgents)
      .values({
        orgId,
        type: data.type,
        name: data.name,
        systemPrompt: data.systemPrompt,
        vertical: data.vertical,
        settings: data.settings ?? {},
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create AI agent');
    }

    // Sync with Vapi — create a corresponding voice assistant
    const vapiClient = getVapiClient();
    if (vapiClient) {
      try {
        const vapiConfig = buildVapiAssistantConfig({
          name: data.name,
          systemPrompt: data.systemPrompt,
        });
        const vapiAssistant = await vapiClient.createAssistant(vapiConfig);

        const [synced] = await db
          .update(aiAgents)
          .set({ vapiAssistantId: vapiAssistant.id })
          .where(eq(aiAgents.id, created.id))
          .returning();

        if (synced) {
          logger.info('Vapi assistant created', {
            orgId,
            agentId: created.id,
            vapiAssistantId: vapiAssistant.id,
          });
          return synced;
        }
      } catch (err) {
        logger.error('Failed to create Vapi assistant — agent saved without voice', {
          orgId,
          agentId: created.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('AI Agent created', { orgId, agentId: created.id, type: data.type });
    return created;
  },

  async updateAgent(
    orgId: string,
    agentId: string,
    data: {
      name?: string;
      systemPrompt?: string;
      settings?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(aiAgents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('AI Agent');
    }

    // Sync changes to Vapi assistant
    const vapiClient = getVapiClient();
    if (vapiClient && updated.vapiAssistantId) {
      try {
        const vapiUpdates: Partial<VapiAssistantConfig> = {};
        if (data.name) {
          vapiUpdates.name = data.name;
        }
        if (data.systemPrompt) {
          vapiUpdates.model = {
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            systemPrompt: data.systemPrompt,
            tools: [
              VAPI_TOOL_SCHEMAS['bookAppointment']!,
              VAPI_TOOL_SCHEMAS['checkAvailability']!,
              VAPI_TOOL_SCHEMAS['transferToHuman']!,
              VAPI_TOOL_SCHEMAS['endCall']!,
            ],
          };
        }

        if (Object.keys(vapiUpdates).length > 0) {
          await vapiClient.updateAssistant(updated.vapiAssistantId, vapiUpdates);
          logger.info('Vapi assistant updated', {
            orgId,
            agentId,
            vapiAssistantId: updated.vapiAssistantId,
          });
        }
      } catch (err) {
        logger.error('Failed to update Vapi assistant', {
          orgId,
          agentId,
          vapiAssistantId: updated.vapiAssistantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('AI Agent updated', { orgId, agentId });
    return updated;
  },

  async deleteAgent(orgId: string, agentId: string) {
    // Look up the agent first to get Vapi IDs before deletion
    const [agent] = await db
      .select({
        id: aiAgents.id,
        vapiAssistantId: aiAgents.vapiAssistantId,
        vapiPhoneNumberId: aiAgents.vapiPhoneNumberId,
      })
      .from(aiAgents)
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ));

    if (!agent) {
      throw Errors.notFound('AI Agent');
    }

    // Clean up Vapi resources before DB deletion
    const vapiClient = getVapiClient();
    if (vapiClient) {
      if (agent.vapiPhoneNumberId) {
        try {
          await vapiClient.deletePhoneNumber(agent.vapiPhoneNumberId);
          logger.info('Vapi phone number deleted', {
            orgId,
            agentId,
            vapiPhoneNumberId: agent.vapiPhoneNumberId,
          });
        } catch (err) {
          logger.error('Failed to delete Vapi phone number', {
            orgId,
            agentId,
            vapiPhoneNumberId: agent.vapiPhoneNumberId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (agent.vapiAssistantId) {
        try {
          await vapiClient.deleteAssistant(agent.vapiAssistantId);
          logger.info('Vapi assistant deleted', {
            orgId,
            agentId,
            vapiAssistantId: agent.vapiAssistantId,
          });
        } catch (err) {
          logger.error('Failed to delete Vapi assistant', {
            orgId,
            agentId,
            vapiAssistantId: agent.vapiAssistantId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Delete from DB
    await db
      .delete(aiAgents)
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ));

    logger.info('AI Agent deleted', { orgId, agentId });
  },

  // ── Phone Number Linking ──

  async linkPhone(
    orgId: string,
    agentId: string,
    data: { vapiAssistantId: string; twilioPhoneNumber: string },
  ) {
    const vapiClient = getVapiClient();
    if (!vapiClient) {
      throw Errors.internal('Vapi API key not configured');
    }

    try {
      const vapiPhoneNumber = await vapiClient.createPhoneNumber({
        provider: 'twilio',
        twilioAccountSid: config.TWILIO_ACCOUNT_SID,
        twilioAuthToken: config.TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: data.twilioPhoneNumber,
        assistantId: data.vapiAssistantId,
      });

      const [updated] = await db
        .update(aiAgents)
        .set({ vapiPhoneNumberId: vapiPhoneNumber.id, updatedAt: new Date() })
        .where(and(
          withOrgScope(aiAgents.orgId, orgId),
          eq(aiAgents.id, agentId),
        ))
        .returning();

      if (!updated) {
        throw Errors.notFound('AI Agent');
      }

      logger.info('Phone number linked to AI agent', {
        orgId,
        agentId,
        vapiPhoneNumberId: vapiPhoneNumber.id,
        phoneNumber: data.twilioPhoneNumber,
      });

      return { phoneNumberId: vapiPhoneNumber.id };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Vapi API error')) {
        logger.error('Vapi API error linking phone number', {
          orgId,
          agentId,
          error: err.message,
        });
        throw Errors.internal(`Failed to link phone number: ${err.message}`);
      }
      throw err;
    }
  },

  async unlinkPhone(orgId: string, agentId: string, vapiPhoneNumberId: string) {
    const vapiClient = getVapiClient();
    if (!vapiClient) {
      throw Errors.internal('Vapi API key not configured');
    }

    try {
      await vapiClient.deletePhoneNumber(vapiPhoneNumberId);
    } catch (err) {
      logger.error('Failed to delete Vapi phone number during unlink', {
        orgId,
        agentId,
        vapiPhoneNumberId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue to clear the DB even if Vapi deletion fails
    }

    const [updated] = await db
      .update(aiAgents)
      .set({ vapiPhoneNumberId: null, updatedAt: new Date() })
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('AI Agent');
    }

    logger.info('Phone number unlinked from AI agent', {
      orgId,
      agentId,
      vapiPhoneNumberId,
    });
  },

  // ── AI Call Logs ──

  async logCall(
    orgId: string,
    data: {
      agentId: string;
      contactId?: string | null;
      conversationId?: string | null;
      twilioCallSid?: string | null;
      direction: typeof aiCallLogs.direction.enumValues[number];
      durationSeconds?: number;
      recordingUrl?: string | null;
      transcript?: string | null;
      summary?: string | null;
      sentiment?: string | null;
      outcome: typeof aiCallLogs.outcome.enumValues[number];
    },
  ) {
    const [created] = await db
      .insert(aiCallLogs)
      .values({
        orgId,
        agentId: data.agentId,
        contactId: data.contactId ?? null,
        conversationId: data.conversationId ?? null,
        twilioCallSid: data.twilioCallSid ?? null,
        direction: data.direction,
        durationSeconds: data.durationSeconds ?? 0,
        recordingUrl: data.recordingUrl ?? null,
        transcript: data.transcript ?? null,
        summary: data.summary ?? null,
        sentiment: data.sentiment ?? null,
        outcome: data.outcome,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to log AI call');
    }

    logger.info('AI call logged', { orgId, callLogId: created.id, outcome: data.outcome });
    return created;
  },

  async listCallLogs(
    orgId: string,
    filters?: {
      agentId?: string;
      outcome?: typeof aiCallLogs.outcome.enumValues[number];
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [withOrgScope(aiCallLogs.orgId, orgId)];

    if (filters?.agentId) {
      conditions.push(eq(aiCallLogs.agentId, filters.agentId));
    }

    if (filters?.outcome) {
      conditions.push(eq(aiCallLogs.outcome, filters.outcome));
    }

    const rows = await db
      .select()
      .from(aiCallLogs)
      .where(and(...conditions))
      .orderBy(desc(aiCallLogs.createdAt))
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0);

    return rows;
  },

  // ── Dashboard Stats ──

  async getDashboardStats(orgId: string, periodDays = 30) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Total contacts (leads)
    const [contactCount] = await db
      .select({ value: count() })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, orgId));

    // New leads in period
    const [newLeadsCount] = await db
      .select({ value: count() })
      .from(contacts)
      .where(and(
        withOrgScope(contacts.orgId, orgId),
        gte(contacts.createdAt, periodStart),
      ));

    // Total appointments in period
    const [appointmentCount] = await db
      .select({ value: count() })
      .from(appointments)
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        gte(appointments.createdAt, periodStart),
      ));

    // AI calls in period
    const [callCount] = await db
      .select({ value: count() })
      .from(aiCallLogs)
      .where(and(
        withOrgScope(aiCallLogs.orgId, orgId),
        gte(aiCallLogs.createdAt, periodStart),
      ));

    // Revenue (sum of won deal values)
    const [revenueResult] = await db
      .select({ value: sum(deals.value) })
      .from(deals)
      .where(and(
        withOrgScope(deals.orgId, orgId),
        gte(deals.closedAt, periodStart),
        sql`${deals.closedAt} IS NOT NULL`,
      ));

    // AI call outcome breakdown
    const outcomeBreakdown = await db
      .select({
        outcome: aiCallLogs.outcome,
        total: count(),
      })
      .from(aiCallLogs)
      .where(and(
        withOrgScope(aiCallLogs.orgId, orgId),
        gte(aiCallLogs.createdAt, periodStart),
      ))
      .groupBy(aiCallLogs.outcome);

    return {
      totalContacts: contactCount?.value ?? 0,
      newLeads: newLeadsCount?.value ?? 0,
      appointments: appointmentCount?.value ?? 0,
      aiCalls: callCount?.value ?? 0,
      revenue: revenueResult?.value ?? '0',
      periodDays,
      outcomeBreakdown,
    };
  },
};
