import {
  db,
  aiAgents,
  aiCallLogs,
  deals,
  contacts,
  appointments,
  withOrgScope,
} from '@hararai/db';
import { eq, and, desc, count, sum, sql, gte } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

// ─── Default Gemini Config ──────────────────────────────────────────────────

function buildDefaultGeminiConfig(): Record<string, unknown> {
  return {
    voiceName: config.GEMINI_DEFAULT_VOICE,
    thinkingLevel: 'MINIMAL',
    maxDurationSeconds: 900,
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
        geminiConfig: buildDefaultGeminiConfig(),
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create AI agent');
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

    // No external sync needed — Gemini sessions are ephemeral.
    // Config changes take effect on the next call automatically.
    logger.info('AI Agent updated', { orgId, agentId });
    return updated;
  },

  async deleteAgent(orgId: string, agentId: string) {
    const [agent] = await db
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ));

    if (!agent) {
      throw Errors.notFound('AI Agent');
    }

    // No external cleanup needed — Gemini sessions are ephemeral.
    await db
      .delete(aiAgents)
      .where(and(
        withOrgScope(aiAgents.orgId, orgId),
        eq(aiAgents.id, agentId),
      ));

    logger.info('AI Agent deleted', { orgId, agentId });
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
