import Anthropic from '@anthropic-ai/sdk';
import {
  db,
  organizations,
  activities,
  deals,
  pipelineStages,
  appointments,
  conversations,
  contacts,
  aiCallLogs,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, desc, count, sum, sql, gte } from 'drizzle-orm';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

// ── Types ──

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BusinessContext {
  orgName: string;
  vertical: string;
  orgPhone: string | null;
  orgEmail: string | null;
  orgWebsite: string | null;
  orgAddress: string | null;
  totalContacts: number;
  totalRevenue: string;
  aiCallsThisWeek: number;
  openConversations: number;
  recentActivities: Array<{
    type: string;
    title: string;
    description: string | null;
    createdAt: Date;
  }>;
  dealsByStage: Array<{
    stage: string;
    count: number;
    totalValue: string;
  }>;
  upcomingAppointments: Array<{
    title: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }>;
  recentAiCalls: Array<{
    direction: string;
    outcome: string;
    summary: string | null;
    durationSeconds: number;
    createdAt: Date;
  }>;
}

interface Suggestion {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

// ── Anthropic Client (Lazy) ──

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (anthropicClient) return anthropicClient;
  if (!config.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — assistant will use offline mode');
    return null;
  }
  anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return anthropicClient;
}

// ── Context Loading ──

async function loadBusinessContext(orgId: string): Promise<BusinessContext> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    orgResult,
    contactCountResult,
    revenueResult,
    aiCallCountResult,
    openConvoResult,
    recentActivitiesResult,
    dealsByStageResult,
    upcomingAppointmentsResult,
    recentAiCallsResult,
  ] = await Promise.all([
    // Org info
    db
      .select({
        name: organizations.name,
        vertical: organizations.vertical,
        phone: organizations.phone,
        email: organizations.email,
        website: organizations.website,
        address: organizations.address,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),

    // Total contacts
    db
      .select({ value: count() })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, orgId)),

    // Total revenue (won deals)
    db
      .select({ value: sum(deals.value) })
      .from(deals)
      .where(and(
        withOrgScope(deals.orgId, orgId),
        sql`${deals.closedAt} IS NOT NULL`,
      )),

    // AI calls this week
    db
      .select({ value: count() })
      .from(aiCallLogs)
      .where(and(
        withOrgScope(aiCallLogs.orgId, orgId),
        gte(aiCallLogs.createdAt, weekAgo),
      )),

    // Open conversations
    db
      .select({ value: count() })
      .from(conversations)
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.status, 'open'),
      )),

    // Recent activities (last 20)
    db
      .select({
        type: activities.type,
        title: activities.title,
        description: activities.description,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(withOrgScope(activities.orgId, orgId))
      .orderBy(desc(activities.createdAt))
      .limit(20),

    // Deals by stage with totals
    db
      .select({
        stage: pipelineStages.name,
        count: count(),
        totalValue: sum(deals.value),
      })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(withOrgScope(deals.orgId, orgId))
      .groupBy(pipelineStages.name),

    // Upcoming appointments (next 7 days)
    db
      .select({
        title: appointments.title,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(and(
        withOrgScope(appointments.orgId, orgId),
        gte(appointments.startTime, now),
        sql`${appointments.startTime} <= ${sevenDaysFromNow}`,
      ))
      .orderBy(appointments.startTime)
      .limit(10),

    // Recent AI call logs (last 5)
    db
      .select({
        direction: aiCallLogs.direction,
        outcome: aiCallLogs.outcome,
        summary: aiCallLogs.summary,
        durationSeconds: aiCallLogs.durationSeconds,
        createdAt: aiCallLogs.createdAt,
      })
      .from(aiCallLogs)
      .where(withOrgScope(aiCallLogs.orgId, orgId))
      .orderBy(desc(aiCallLogs.createdAt))
      .limit(5),
  ]);

  const org = orgResult[0];

  return {
    orgName: org?.name ?? 'Your Business',
    vertical: org?.vertical ?? 'general',
    orgPhone: org?.phone ?? null,
    orgEmail: org?.email ?? null,
    orgWebsite: org?.website ?? null,
    orgAddress: org?.address ?? null,
    totalContacts: contactCountResult[0]?.value ?? 0,
    totalRevenue: revenueResult[0]?.value ?? '0',
    aiCallsThisWeek: aiCallCountResult[0]?.value ?? 0,
    openConversations: openConvoResult[0]?.value ?? 0,
    recentActivities: recentActivitiesResult,
    dealsByStage: dealsByStageResult.map((row) => ({
      stage: row.stage,
      count: row.count,
      totalValue: row.totalValue ?? '0',
    })),
    upcomingAppointments: upcomingAppointmentsResult,
    recentAiCalls: recentAiCallsResult,
  };
}

// ── System Prompt Builder ──

function buildSystemPrompt(ctx: BusinessContext): string {
  const lines: string[] = [
    `You are the AI office manager for "${ctx.orgName}", a ${ctx.vertical.replace(/_/g, ' ')} business.`,
    `You have access to all CRM data and are here to help the business owner manage their operations.`,
    `Answer questions helpfully and specifically using the real data below.`,
    `Be concise — most answers should be 2-4 sentences unless the user asks for detail.`,
    `If asked to take an action (like sending a message, creating a contact, etc.), explain what you would do but note that action execution is coming soon.`,
    `Use a professional but friendly tone. You are like a smart virtual office manager.`,
    '',
    '=== BUSINESS PROFILE ===',
    `Business Name: ${ctx.orgName}`,
    `Industry: ${ctx.vertical.replace(/_/g, ' ')}`,
    ctx.orgPhone ? `Phone: ${ctx.orgPhone}` : '',
    ctx.orgEmail ? `Email: ${ctx.orgEmail}` : '',
    ctx.orgWebsite ? `Website: ${ctx.orgWebsite}` : '',
    ctx.orgAddress ? `Address: ${ctx.orgAddress}` : '',
    '',
    '=== KEY METRICS ===',
    `Total Contacts: ${ctx.totalContacts}`,
    `Total Revenue (won deals): $${Number(ctx.totalRevenue).toLocaleString()}`,
    `AI Calls This Week: ${ctx.aiCallsThisWeek}`,
    `Open Conversations: ${ctx.openConversations}`,
  ];

  // Pipeline summary
  if (ctx.dealsByStage.length > 0) {
    lines.push('', '=== PIPELINE SUMMARY ===');
    for (const stage of ctx.dealsByStage) {
      lines.push(`  ${stage.stage}: ${stage.count} deals, $${Number(stage.totalValue).toLocaleString()} total value`);
    }
  }

  // Upcoming appointments
  if (ctx.upcomingAppointments.length > 0) {
    lines.push('', '=== UPCOMING APPOINTMENTS (next 7 days) ===');
    for (const appt of ctx.upcomingAppointments) {
      const date = new Date(appt.startTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      lines.push(`  - ${appt.title} — ${date} (${appt.status})`);
    }
  }

  // Recent activities
  if (ctx.recentActivities.length > 0) {
    lines.push('', '=== RECENT ACTIVITY (last 20) ===');
    for (const act of ctx.recentActivities.slice(0, 10)) {
      const ago = getTimeAgo(act.createdAt);
      lines.push(`  - [${act.type}] ${act.title} (${ago})`);
    }
    if (ctx.recentActivities.length > 10) {
      lines.push(`  ... and ${ctx.recentActivities.length - 10} more`);
    }
  }

  // Recent AI calls
  if (ctx.recentAiCalls.length > 0) {
    lines.push('', '=== RECENT AI CALLS ===');
    for (const call of ctx.recentAiCalls) {
      const ago = getTimeAgo(call.createdAt);
      const duration = call.durationSeconds > 0 ? `${Math.round(call.durationSeconds / 60)}min` : 'brief';
      lines.push(`  - ${call.direction} call, outcome: ${call.outcome}, ${duration} (${ago})`);
      if (call.summary) {
        lines.push(`    Summary: ${call.summary}`);
      }
    }
  }

  return lines.filter(Boolean).join('\n');
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ── Suggestions Generator ──

async function generateSuggestions(orgId: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  try {
    const ctx = await loadBusinessContext(orgId);

    if (ctx.totalContacts === 0) {
      suggestions.push({
        id: 'add-first-contact',
        text: 'Add your first contact to start building your customer database',
        priority: 'high',
        icon: 'user-plus',
      });
    }

    // Check for stale deals (deals in pipeline but no recent activity)
    const staleDealCount = ctx.dealsByStage
      .filter((s) => !['won', 'lost'].includes(s.stage.toLowerCase()))
      .reduce((sum, s) => sum + s.count, 0);

    if (staleDealCount > 0) {
      suggestions.push({
        id: 'follow-up-deals',
        text: `You have ${staleDealCount} active deal${staleDealCount > 1 ? 's' : ''} in your pipeline — check if any need follow-up`,
        priority: 'medium',
        icon: 'trending-up',
      });
    }

    if (!ctx.orgPhone) {
      suggestions.push({
        id: 'setup-phone',
        text: 'Set up your phone number to activate the AI phone agent',
        priority: 'high',
        icon: 'phone',
      });
    }

    if (ctx.openConversations > 3) {
      suggestions.push({
        id: 'open-conversations',
        text: `You have ${ctx.openConversations} open conversations waiting for a reply`,
        priority: 'high',
        icon: 'message-circle',
      });
    }

    if (ctx.upcomingAppointments.length > 0) {
      const next = ctx.upcomingAppointments[0];
      if (next) {
        const nextDate = new Date(next.startTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        suggestions.push({
          id: 'next-appointment',
          text: `Your next appointment is "${next.title}" on ${nextDate}`,
          priority: 'low',
          icon: 'calendar',
        });
      }
    }

    if (ctx.aiCallsThisWeek === 0 && ctx.totalContacts > 0) {
      suggestions.push({
        id: 'no-ai-calls',
        text: 'No AI calls this week — make sure your phone agent is active',
        priority: 'medium',
        icon: 'phone-missed',
      });
    }
  } catch (err) {
    logger.error('Failed to generate suggestions', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.slice(0, 5);
}

// ── Main Service ──

export const platformAssistantService = {
  /**
   * Chat with the AI assistant using real business data context.
   * Falls back to a basic response if Claude API is unavailable.
   */
  async chat(
    orgId: string,
    message: string,
    history: ChatMessage[] = [],
  ): Promise<{ response: string; context?: Partial<BusinessContext> }> {
    const client = getAnthropicClient();

    // Load business context from DB
    let ctx: BusinessContext;
    try {
      ctx = await loadBusinessContext(orgId);
    } catch (err) {
      logger.error('Failed to load business context for assistant', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        response: 'I\'m having trouble accessing your business data right now. Please try again in a moment.',
      };
    }

    // If no API key, return offline response
    if (!client) {
      logger.warn('Claude API unavailable — returning offline response', { orgId });
      return {
        response: buildOfflineResponse(message, ctx),
        context: {
          orgName: ctx.orgName,
          totalContacts: ctx.totalContacts,
          openConversations: ctx.openConversations,
        },
      };
    }

    // Build system prompt with real data
    const systemPrompt = buildSystemPrompt(ctx);

    // Build message history for Claude (last 10 messages)
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      claudeMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    claudeMessages.push({ role: 'user', content: message });

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      const responseText = textBlock?.text ?? 'I wasn\'t able to generate a response. Please try again.';

      logger.info('Assistant chat completed', {
        orgId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        response: responseText,
        context: {
          orgName: ctx.orgName,
          totalContacts: ctx.totalContacts,
          openConversations: ctx.openConversations,
        },
      };
    } catch (err) {
      logger.error('Claude API call failed', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });

      // Fall back to offline response
      return {
        response: buildOfflineResponse(message, ctx),
        context: {
          orgName: ctx.orgName,
          totalContacts: ctx.totalContacts,
          openConversations: ctx.openConversations,
        },
      };
    }
  },

  /**
   * Get contextual suggestions based on current business state.
   */
  async getSuggestions(orgId: string): Promise<Suggestion[]> {
    return generateSuggestions(orgId);
  },

  /**
   * Generate a professional response to a customer review using Claude.
   */
  async generateReviewResponse(
    orgId: string,
    review: {
      reviewerName: string;
      rating: number;
      reviewText: string | null;
      platform: string;
    },
  ): Promise<string> {
    const client = getAnthropicClient();

    // Load org info for context
    let orgName = 'Your Business';
    try {
      const [org] = await db
        .select({ name: organizations.name, vertical: organizations.vertical })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      if (org) orgName = org.name;
    } catch {
      // Use default
    }

    if (!client) {
      // Fallback to template response
      return generateTemplateReviewResponse(review, orgName);
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: [
          `You are responding to a customer review on behalf of "${orgName}".`,
          'Write a professional, warm, and authentic response.',
          'Keep it under 3 sentences.',
          'If the review is negative, acknowledge the concern and offer to make it right.',
          'If positive, thank them genuinely without sounding generic.',
          'Do NOT use placeholder text like [Business Name]. Use the actual business name.',
          'Do NOT start with "Dear" — use a casual professional tone.',
        ].join(' '),
        messages: [
          {
            role: 'user',
            content: [
              `Platform: ${review.platform}`,
              `Reviewer: ${review.reviewerName}`,
              `Rating: ${review.rating}/5`,
              `Review: ${review.reviewText ?? '(no text, just a star rating)'}`,
              '',
              'Write the response:',
            ].join('\n'),
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      return textBlock?.text ?? generateTemplateReviewResponse(review, orgName);
    } catch (err) {
      logger.error('Failed to generate review response with Claude', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      return generateTemplateReviewResponse(review, orgName);
    }
  },

  /**
   * Generate campaign content (email or SMS) using Claude.
   */
  async generateCampaignContent(
    orgId: string,
    params: {
      type: 'email' | 'sms';
      audience: string;
      topic: string;
    },
  ): Promise<{ subject?: string; body: string }> {
    const client = getAnthropicClient();

    // Load org info
    let orgName = 'Your Business';
    let vertical = 'general';
    try {
      const [org] = await db
        .select({ name: organizations.name, vertical: organizations.vertical })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      if (org) {
        orgName = org.name;
        vertical = org.vertical;
      }
    } catch {
      // Use defaults
    }

    if (!client) {
      // Return template content
      if (params.type === 'sms') {
        return {
          body: `Hi! ${orgName} here. ${params.topic}. Reply STOP to opt out.`,
        };
      }
      return {
        subject: `${params.topic} — ${orgName}`,
        body: `<p>Hello,</p><p>${params.topic}</p><p>Best regards,<br/>${orgName}</p>`,
      };
    }

    try {
      const isSms = params.type === 'sms';
      const prompt = isSms
        ? [
            `Write a marketing SMS message for "${orgName}" (${vertical.replace(/_/g, ' ')} business).`,
            `Audience: ${params.audience}`,
            `Topic: ${params.topic}`,
            'MUST be under 160 characters total.',
            'Include a clear call-to-action.',
            'End with "Reply STOP to opt out."',
            'Return ONLY the SMS text, nothing else.',
          ].join('\n')
        : [
            `Write a marketing email for "${orgName}" (${vertical.replace(/_/g, ' ')} business).`,
            `Audience: ${params.audience}`,
            `Topic: ${params.topic}`,
            'Return the result as JSON with "subject" and "body" fields.',
            'The body should be clean HTML (use <p>, <strong>, <ul>, <li> tags).',
            'Keep the subject under 60 characters.',
            'Keep the body concise — 3-5 paragraphs max.',
            'Include a clear call-to-action.',
            'Do NOT include unsubscribe links (those are added automatically).',
            'Return ONLY valid JSON, no markdown fences.',
          ].join('\n');

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock?.text ?? '';

      if (isSms) {
        // SMS: just return the text, trim to 160 chars
        return { body: text.trim().slice(0, 160) };
      }

      // Email: parse JSON
      try {
        const parsed = JSON.parse(text) as { subject: string; body: string };
        return {
          subject: parsed.subject,
          body: parsed.body,
        };
      } catch {
        // If JSON parsing fails, use the raw text
        return {
          subject: `${params.topic} — ${orgName}`,
          body: `<p>${text}</p>`,
        };
      }
    } catch (err) {
      logger.error('Failed to generate campaign content with Claude', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });

      if (params.type === 'sms') {
        return {
          body: `Hi! ${orgName} here. ${params.topic}. Reply STOP to opt out.`,
        };
      }
      return {
        subject: `${params.topic} — ${orgName}`,
        body: `<p>Hello,</p><p>${params.topic}</p><p>Best regards,<br/>${orgName}</p>`,
      };
    }
  },
};

// ── Offline Fallbacks ──

function buildOfflineResponse(message: string, ctx: BusinessContext): string {
  const lower = message.toLowerCase();

  // Basic metric queries
  if (lower.includes('contact') && (lower.includes('how many') || lower.includes('total'))) {
    return `You currently have ${ctx.totalContacts} contacts in your database.`;
  }

  if (lower.includes('revenue') || lower.includes('money') || lower.includes('earned')) {
    return `Your total revenue from won deals is $${Number(ctx.totalRevenue).toLocaleString()}.`;
  }

  if (lower.includes('appointment') || lower.includes('schedule')) {
    if (ctx.upcomingAppointments.length === 0) {
      return 'You don\'t have any upcoming appointments in the next 7 days.';
    }
    const lines = [`You have ${ctx.upcomingAppointments.length} upcoming appointment${ctx.upcomingAppointments.length > 1 ? 's' : ''} this week:`];
    for (const appt of ctx.upcomingAppointments.slice(0, 3)) {
      const date = new Date(appt.startTime).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      lines.push(`- ${appt.title} on ${date}`);
    }
    return lines.join('\n');
  }

  if (lower.includes('deal') || lower.includes('pipeline')) {
    if (ctx.dealsByStage.length === 0) {
      return 'You don\'t have any deals in your pipeline yet. Head to the Pipeline page to create your first deal.';
    }
    const lines = ['Here\'s your pipeline summary:'];
    for (const stage of ctx.dealsByStage) {
      lines.push(`- ${stage.stage}: ${stage.count} deal${stage.count > 1 ? 's' : ''} ($${Number(stage.totalValue).toLocaleString()})`);
    }
    return lines.join('\n');
  }

  if (lower.includes('conversation') || lower.includes('message') || lower.includes('inbox')) {
    return `You have ${ctx.openConversations} open conversation${ctx.openConversations !== 1 ? 's' : ''} waiting for a reply.`;
  }

  if (lower.includes('ai call') || lower.includes('phone agent') || lower.includes('call log')) {
    if (ctx.recentAiCalls.length === 0) {
      return 'No AI calls recorded recently. Make sure your phone agent is active in Settings > Phone.';
    }
    return `You've had ${ctx.aiCallsThisWeek} AI call${ctx.aiCallsThisWeek !== 1 ? 's' : ''} this week. The most recent call was ${ctx.recentAiCalls[0]?.direction ?? 'unknown'} with outcome: ${ctx.recentAiCalls[0]?.outcome ?? 'unknown'}.`;
  }

  // Generic fallback with real data
  return `I'm currently in offline mode (Claude API unavailable), but here's a quick summary of ${ctx.orgName}:\n\n` +
    `- ${ctx.totalContacts} contacts\n` +
    `- $${Number(ctx.totalRevenue).toLocaleString()} total revenue\n` +
    `- ${ctx.openConversations} open conversations\n` +
    `- ${ctx.upcomingAppointments.length} upcoming appointments\n` +
    `- ${ctx.aiCallsThisWeek} AI calls this week\n\n` +
    `Ask me about contacts, deals, appointments, revenue, or AI calls for more detail.`;
}

function generateTemplateReviewResponse(
  review: { reviewerName: string; rating: number; reviewText: string | null },
  orgName: string,
): string {
  if (review.rating >= 4) {
    return `Thank you so much for the wonderful ${review.rating}-star review, ${review.reviewerName}! We're thrilled to hear about your positive experience with ${orgName}. We look forward to serving you again!`;
  }
  if (review.rating === 3) {
    return `Thank you for your feedback, ${review.reviewerName}. We appreciate you sharing your experience with ${orgName}. We're always looking to improve and would love to hear how we can better serve you.`;
  }
  return `${review.reviewerName}, thank you for bringing this to our attention. We at ${orgName} sincerely apologize for the experience you had. Please contact us directly so we can make this right.`;
}
