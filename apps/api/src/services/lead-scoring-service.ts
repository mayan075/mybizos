import {
  db,
  activities,
  aiCallLogs,
  withOrgScope,
} from '@hararai/db';
import { eq, and, desc } from 'drizzle-orm';
import { ClaudeClient } from '@hararai/ai';
import { config } from '../config.js';
import { contactService } from './contact-service.js';
import { logger } from '../middleware/logger.js';

// ── Types ────────────────────────────────────────────────────────────────

interface AiScoreResponse {
  score: number;
  reason: string;
}

export interface LeadScoreResult {
  contactId: string;
  score: number;
  reason: string;
  method: 'ai' | 'rule-based';
}

// ── Claude client singleton ──────────────────────────────────────────────

function getClaudeClient(): ClaudeClient | null {
  if (!config.ANTHROPIC_API_KEY) {
    return null;
  }
  return new ClaudeClient({
    apiKey: config.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 256,
  });
}

// ── Rule-based fallback ──────────────────────────────────────────────────

function ruleBasedScore(contact: {
  email: string | null;
  phone: string | null;
  source: string;
  tags: string[];
}): { score: number; reason: string } {
  let score = 50;
  if (contact.email) score += 10;
  if (contact.phone) score += 10;
  if (contact.source === 'referral') score += 15;
  if (contact.source === 'phone') score += 10;
  if (contact.tags && contact.tags.length > 0) score += 5;
  score = Math.min(score, 100);

  return { score, reason: 'Scored using rule-based heuristics.' };
}

// ── AI-powered scoring ───────────────────────────────────────────────────

async function aiPoweredScore(
  orgId: string,
  contactId: string,
  claude: ClaudeClient,
): Promise<AiScoreResponse> {
  // 1. Fetch contact data
  const { contact } = await contactService.getById(orgId, contactId);

  // 2. Fetch last 10 activities
  const recentActivities = await db
    .select({
      type: activities.type,
      title: activities.title,
      description: activities.description,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(and(
      withOrgScope(activities.orgId, orgId),
      eq(activities.contactId, contactId),
    ))
    .orderBy(desc(activities.createdAt))
    .limit(10);

  // 3. Fetch last 3 AI call transcripts
  const recentCalls = await db
    .select({
      transcript: aiCallLogs.transcript,
      summary: aiCallLogs.summary,
      outcome: aiCallLogs.outcome,
      durationSeconds: aiCallLogs.durationSeconds,
      createdAt: aiCallLogs.createdAt,
    })
    .from(aiCallLogs)
    .where(and(
      withOrgScope(aiCallLogs.orgId, orgId),
      eq(aiCallLogs.contactId, contactId),
    ))
    .orderBy(desc(aiCallLogs.createdAt))
    .limit(3);

  // 4. Build prompt
  const contactSummary = [
    `Name: ${contact.firstName} ${contact.lastName}`,
    `Email: ${contact.email ?? 'none'}`,
    `Phone: ${contact.phone ?? 'none'}`,
    `Source: ${contact.source}`,
    `Tags: ${contact.tags.length > 0 ? contact.tags.join(', ') : 'none'}`,
    `Current AI Score: ${contact.aiScore}`,
  ].join('\n');

  const activitiesSummary = recentActivities.length > 0
    ? recentActivities.map(a =>
      `- [${a.type}] ${a.title}${a.description ? ': ' + a.description : ''} (${new Date(a.createdAt).toLocaleDateString()})`,
    ).join('\n')
    : 'No recent activities.';

  const callsSummary = recentCalls.length > 0
    ? recentCalls.map(c =>
      `- Outcome: ${c.outcome}, Duration: ${c.durationSeconds}s${c.summary ? ', Summary: ' + c.summary : ''}${c.transcript ? '\n  Transcript excerpt: ' + c.transcript.slice(0, 500) : ''}`,
    ).join('\n')
    : 'No call transcripts.';

  const userMessage = `Score this lead 0-100 based on their engagement level, purchase intent, and qualification.

Contact:
${contactSummary}

Recent activities:
${activitiesSummary}

Call transcripts:
${callsSummary}

Respond with ONLY a JSON object: { "score": <number>, "reason": "<1 sentence explanation>" }`;

  // 5. Call Claude
  const response = await claude.complete(
    'You are a lead scoring assistant for a service business CRM. Score leads accurately based on their data. Respond only with valid JSON.',
    userMessage,
    { maxTokens: 200, temperature: 0.2 },
  );

  // 6. Parse response
  const parsed = JSON.parse(response) as AiScoreResponse;
  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));

  return { score, reason: parsed.reason };
}

// ── Public service ───────────────────────────────────────────────────────

export const leadScoringService = {
  /**
   * Score a lead using Claude AI (with rule-based fallback).
   * Returns the score result and updates the contact in the database.
   */
  async scoreContact(orgId: string, contactId: string): Promise<LeadScoreResult> {
    const claude = getClaudeClient();

    if (!claude) {
      // Fallback to rule-based
      const { contact } = await contactService.getById(orgId, contactId);
      const result = ruleBasedScore(contact);
      await contactService.update(orgId, contactId, { aiScore: result.score });
      return { contactId, score: result.score, reason: result.reason, method: 'rule-based' };
    }

    try {
      const { score, reason } = await aiPoweredScore(orgId, contactId, claude);
      await contactService.update(orgId, contactId, { aiScore: score });
      return { contactId, score, reason, method: 'ai' };
    } catch (err) {
      // If AI scoring fails, fall back to rule-based
      logger.error('AI lead scoring failed, falling back to rule-based', {
        orgId,
        contactId,
        error: err instanceof Error ? err.message : String(err),
      });

      const { contact } = await contactService.getById(orgId, contactId);
      const result = ruleBasedScore(contact);
      await contactService.update(orgId, contactId, { aiScore: result.score });
      return { contactId, score: result.score, reason: result.reason, method: 'rule-based' };
    }
  },

  /**
   * Fire-and-forget version for background scoring (e.g., after a call ends).
   * Logs errors but never throws.
   */
  scoreContactInBackground(orgId: string, contactId: string): void {
    this.scoreContact(orgId, contactId).catch(err => {
      logger.error('Background lead scoring failed', {
        orgId,
        contactId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  },
};
