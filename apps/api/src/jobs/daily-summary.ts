import {
  db,
  organizations,
  orgMembers,
  users,
  appointments,
  deals,
  pipelineStages,
  contacts,
  activities,
  aiCallLogs,
  conversations,
  withOrgScope,
} from '@hararai/db';
import { and, eq, gte, lte, sql, count, sum, desc } from 'drizzle-orm';
import { ClaudeClient } from '@hararai/ai';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';
import { notificationService } from '../services/notification-service.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface OrgSummaryData {
  orgId: string;
  orgName: string;
  ownerName: string;
  isNewOrg: boolean;
  isWeekend: boolean;
  yesterday: {
    callsHandled: number;
    appointmentsBooked: number;
    quotesSent: number;
    totalRevenue: string;
    leadsQualified: number;
  };
  today: {
    scheduledAppointments: Array<{
      time: string;
      contactName: string;
      service: string;
    }>;
  };
  staleItems: {
    staleDeals: Array<{
      contactName: string;
      title: string;
      value: string;
      stage: string;
      daysPending: number;
    }>;
    unansweredConversations: number;
  };
  aiPerformance: {
    totalCalls: number;
    leadsQualified: number;
    appointmentsBooked: number;
  };
}

// ── Data gathering ───────────────────────────────────────────────────────────

async function gatherOrgData(orgId: string, orgName: string): Promise<OrgSummaryData | null> {
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  // Get org owner
  const owner = await notificationService.getOrgOwner(orgId);
  if (!owner) {
    logger.warn('Daily summary skipped — no owner found', { orgId });
    return null;
  }

  // Define time ranges
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(now);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // ── Yesterday's stats ──────────────────────────────────────────────────

  // Count AI calls from yesterday
  const [callStats] = await db
    .select({
      totalCalls: count(),
      booked: sql<number>`COUNT(CASE WHEN ${aiCallLogs.outcome} = 'booked' THEN 1 END)`,
      qualified: sql<number>`COUNT(CASE WHEN ${aiCallLogs.outcome} = 'qualified' THEN 1 END)`,
    })
    .from(aiCallLogs)
    .where(and(
      withOrgScope(aiCallLogs.orgId, orgId),
      gte(aiCallLogs.createdAt, yesterdayStart),
      lte(aiCallLogs.createdAt, yesterdayEnd),
    ));

  // Count appointments booked yesterday
  const [aptStats] = await db
    .select({ booked: count() })
    .from(appointments)
    .where(and(
      withOrgScope(appointments.orgId, orgId),
      gte(appointments.createdAt, yesterdayStart),
      lte(appointments.createdAt, yesterdayEnd),
    ));

  // Count quote_sent deals from yesterday
  const [quoteStats] = await db
    .select({
      quotesSent: count(),
      totalValue: sql<string>`COALESCE(SUM(${deals.value}::numeric), 0)`,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(and(
      withOrgScope(deals.orgId, orgId),
      eq(pipelineStages.slug, 'quote_sent'),
      gte(deals.updatedAt, yesterdayStart),
      lte(deals.updatedAt, yesterdayEnd),
    ));

  // ── Today's appointments ───────────────────────────────────────────────

  const todayAppointments = await db
    .select({
      startTime: appointments.startTime,
      title: appointments.title,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(appointments)
    .innerJoin(contacts, eq(appointments.contactId, contacts.id))
    .where(and(
      withOrgScope(appointments.orgId, orgId),
      gte(appointments.startTime, todayStart),
      lte(appointments.startTime, todayEnd),
      sql`${appointments.status} IN ('scheduled', 'confirmed')`,
    ))
    .orderBy(appointments.startTime);

  // ── Stale items ────────────────────────────────────────────────────────

  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const staleDeals = await db
    .select({
      title: deals.title,
      value: deals.value,
      stageName: pipelineStages.name,
      updatedAt: deals.updatedAt,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(deals)
    .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .innerJoin(contacts, eq(deals.contactId, contacts.id))
    .where(and(
      withOrgScope(deals.orgId, orgId),
      lte(deals.updatedAt, fiveDaysAgo),
      sql`${pipelineStages.slug} NOT IN ('won', 'lost')`,
    ))
    .orderBy(deals.updatedAt)
    .limit(5);

  // Unanswered conversations (open with no reply in 24h)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [unansweredStats] = await db
    .select({ unanswered: count() })
    .from(conversations)
    .where(and(
      withOrgScope(conversations.orgId, orgId),
      eq(conversations.status, 'open'),
      sql`${conversations.unreadCount} > 0`,
      lte(conversations.lastMessageAt, oneDayAgo),
    ));

  // Check if new org (created within last 3 days, no call logs)
  const [orgRow] = await db
    .select({ createdAt: organizations.createdAt })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const orgCreatedAt = orgRow?.createdAt instanceof Date
    ? orgRow.createdAt
    : new Date(orgRow?.createdAt ?? 0);

  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const isNewOrg = orgCreatedAt > threeDaysAgo && (callStats?.totalCalls ?? 0) === 0;

  return {
    orgId,
    orgName,
    ownerName: owner.name.split(' ')[0] ?? owner.name, // First name
    isNewOrg,
    isWeekend,
    yesterday: {
      callsHandled: callStats?.totalCalls ?? 0,
      appointmentsBooked: aptStats?.booked ?? 0,
      quotesSent: quoteStats?.quotesSent ?? 0,
      totalRevenue: quoteStats?.totalValue ?? '0',
      leadsQualified: callStats?.qualified ?? 0,
    },
    today: {
      scheduledAppointments: todayAppointments.map((apt) => ({
        time: (apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime))
          .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        contactName: `${apt.contactFirstName} ${apt.contactLastName}`.trim(),
        service: apt.title,
      })),
    },
    staleItems: {
      staleDeals: staleDeals.map((d) => {
        const updatedAt = d.updatedAt instanceof Date ? d.updatedAt : new Date(d.updatedAt);
        const daysPending = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          contactName: `${d.contactFirstName} ${d.contactLastName}`.trim(),
          title: d.title,
          value: d.value,
          stage: d.stageName,
          daysPending,
        };
      }),
      unansweredConversations: unansweredStats?.unanswered ?? 0,
    },
    aiPerformance: {
      totalCalls: callStats?.totalCalls ?? 0,
      leadsQualified: callStats?.qualified ?? 0,
      appointmentsBooked: callStats?.booked ?? 0,
    },
  };
}

// ── Generate natural language briefing using Claude ──────────────────────────

async function generateBriefing(data: OrgSummaryData): Promise<string> {
  // New org with no data
  if (data.isNewOrg) {
    return `Morning, ${data.ownerName}! Welcome to HararAI! Your AI employee is ready and waiting for the first call. Once calls start coming in, I'll send you a daily briefing every morning with your business stats. Have a great day! -- Your AI Employee`;
  }

  if (!config.ANTHROPIC_API_KEY) {
    // Fallback: generate a basic text summary without AI
    return generateFallbackBriefing(data);
  }

  try {
    const claude = new ClaudeClient({
      apiKey: config.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 500,
    });

    const prompt = `You are an AI employee assistant generating a morning briefing for a local business owner.
Generate a brief, warm, SMS-friendly daily briefing message (max 600 characters for SMS, plus a longer email version).

Owner's first name: ${data.ownerName}
Business: ${data.orgName}
Is weekend: ${data.isWeekend}

Yesterday's stats:
- Calls handled by AI: ${data.yesterday.callsHandled}
- Appointments booked: ${data.yesterday.appointmentsBooked}
- Quotes sent: ${data.yesterday.quotesSent} ($${data.yesterday.totalRevenue} total)
- Leads qualified: ${data.yesterday.leadsQualified}

Today's schedule:
${data.today.scheduledAppointments.length === 0
  ? '- No appointments scheduled'
  : data.today.scheduledAppointments
      .map((a) => `- ${a.time}: ${a.contactName} (${a.service})`)
      .join('\n')
}

Stale items needing attention:
${data.staleItems.staleDeals.length === 0
  ? '- None'
  : data.staleItems.staleDeals
      .map((d) => `- ${d.contactName}: ${d.title} ($${d.value}) in "${d.stage}" for ${d.daysPending} days`)
      .join('\n')
}
Unanswered conversations: ${data.staleItems.unansweredConversations}

AI Performance (yesterday):
- Total calls answered: ${data.aiPerformance.totalCalls}
- Leads qualified: ${data.aiPerformance.leadsQualified}
- Appointments booked: ${data.aiPerformance.appointmentsBooked}

Rules:
- Be warm and conversational, not robotic
- Use natural language, not bullet points for SMS
- If it's a weekend, keep it shorter and lighter
- If there are stale deals, suggest following up
- End with "-- Your AI Employee"
- Return ONLY the message text, no JSON or formatting

Respond with TWO versions separated by "---EMAIL---":
1. SMS version (under 600 chars)
2. Email version (can be longer, with more detail)`;

    const response = await claude.complete(prompt, '', {
      maxTokens: 500,
      temperature: 0.7,
    });

    return response;
  } catch (err) {
    logger.error('Claude API failed for daily briefing, using fallback', {
      orgId: data.orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    return generateFallbackBriefing(data);
  }
}

function generateFallbackBriefing(data: OrgSummaryData): string {
  const parts: string[] = [];
  parts.push(`Morning, ${data.ownerName}! Here's your daily briefing:`);

  // Yesterday
  if (data.yesterday.callsHandled > 0 || data.yesterday.appointmentsBooked > 0) {
    parts.push(`Yesterday: ${data.yesterday.callsHandled} calls handled by AI, ${data.yesterday.appointmentsBooked} appointments booked, ${data.yesterday.quotesSent} quotes sent ($${data.yesterday.totalRevenue} total).`);
  } else {
    parts.push('Yesterday: Quiet day — no calls or bookings.');
  }

  // Today
  if (data.today.scheduledAppointments.length > 0) {
    const aptList = data.today.scheduledAppointments
      .map((a) => `${a.time} ${a.contactName} ${a.service}`)
      .join(', ');
    parts.push(`Today: ${data.today.scheduledAppointments.length} appointments (${aptList}).`);
  } else {
    parts.push('Today: No appointments scheduled.');
  }

  // Stale items
  if (data.staleItems.staleDeals.length > 0) {
    const topStale = data.staleItems.staleDeals[0];
    if (topStale) {
      parts.push(`Heads up: The ${topStale.contactName} ${topStale.title} ($${topStale.value}) has been pending ${topStale.daysPending} days — want me to follow up?`);
    }
  }

  // AI performance
  if (data.aiPerformance.totalCalls > 0) {
    parts.push(`AI Performance: Answered ${data.aiPerformance.totalCalls} calls, qualified ${data.aiPerformance.leadsQualified} leads, booked ${data.aiPerformance.appointmentsBooked} appointments.`);
  }

  parts.push('Have a great day! -- Your AI Employee');

  const smsVersion = parts.join('\n');

  // For fallback, use same content for both
  return `${smsVersion}---EMAIL---${smsVersion}`;
}

// ═════════════════════════════════════════════════════════════════════════════════
//  Main job: Daily Summary
// ═════════════════════════════════════════════════════════════════════════════════

export async function runDailySummary(): Promise<{
  orgsProcessed: number;
  smsSent: number;
  emailsSent: number;
  errors: number;
}> {
  logger.info('Running daily summary job');

  // Get all active organizations (that have at least one phone number = active subscriber)
  const activeOrgs = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
    })
    .from(organizations)
    .where(sql`${organizations.phone} IS NOT NULL AND ${organizations.phone} != ''`);

  let orgsProcessed = 0;
  let smsSent = 0;
  let emailsSent = 0;
  let errors = 0;

  for (const org of activeOrgs) {
    try {
      const data = await gatherOrgData(org.orgId, org.orgName);
      if (!data) {
        continue;
      }

      const briefingText = await generateBriefing(data);

      // Split SMS vs Email versions
      const parts = briefingText.split('---EMAIL---');
      const smsText = (parts[0] ?? briefingText).trim();
      const emailText = (parts[1] ?? smsText).trim();

      // Build simple HTML for email
      const emailHtml = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">Good Morning, ${data.ownerName}!</h2>
          <div style="white-space: pre-line; color: #334155; line-height: 1.6;">
${emailText}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            This is your daily AI employee briefing from HararAI.
            <br>Manage your settings at <a href="${config.CORS_ORIGIN}" style="color: #6366f1;">your dashboard</a>.
          </p>
        </div>
      `;

      const result = await notificationService.sendOwnerNotification(
        org.orgId,
        smsText,
        {
          subject: `Good Morning, ${data.ownerName}! Your Daily Briefing`,
          htmlBody: emailHtml,
        },
      );

      if (result.smsSent) smsSent++;
      if (result.emailSent) emailsSent++;
      orgsProcessed++;

      logger.info('Daily summary sent', {
        orgId: org.orgId,
        smsSent: result.smsSent,
        emailSent: result.emailSent,
      });
    } catch (err) {
      errors++;
      logger.error('Failed to send daily summary for org', {
        orgId: org.orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result = { orgsProcessed, smsSent, emailsSent, errors };
  logger.info('Daily summary job completed', result);
  return result;
}
