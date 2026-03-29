import { logger } from '../middleware/logger.js';
import { runAppointmentReminders } from './appointment-reminders.js';
import { runReviewRequests } from './review-requests.js';
import { runSequenceProcessor } from './sequence-processor.js';
import { runDailySummary } from './daily-summary.js';
import { runStaleDealAlerts } from './stale-deal-alerts.js';

// ── Job Definitions ──

export interface JobDefinition {
  name: string;
  description: string;
  /** Cron-like schedule description (informational only -- actual scheduling is external) */
  schedule: string;
  /** The async function to execute */
  handler: () => Promise<unknown>;
}

/**
 * Job Registry
 *
 * Each job is a simple async function that can be called directly.
 * No BullMQ needed yet -- we'll add queue infrastructure later.
 *
 * Jobs:
 * - appointmentReminders: every 15 min, send reminders for upcoming appointments
 * - reviewRequests: every hour, send review requests for completed appointments
 * - leadScoring: on-demand, score new contacts using AI
 * - staleDealAlerts: daily, find deals stuck in stage > 7 days, notify owner
 */
export const jobRegistry: Record<string, JobDefinition> = {
  appointmentReminders: {
    name: 'appointmentReminders',
    description: 'Send SMS/email reminders for appointments starting in the next hour',
    schedule: 'every 15 minutes',
    handler: runAppointmentReminders,
  },

  reviewRequests: {
    name: 'reviewRequests',
    description: 'Send review requests for appointments completed 24+ hours ago',
    schedule: 'every hour',
    handler: runReviewRequests,
  },

  sequenceProcessor: {
    name: 'sequenceProcessor',
    description: 'Process drip sequence steps for active enrollments (send emails, SMS, AI decisions, tags)',
    schedule: 'every 5 minutes',
    handler: runSequenceProcessor,
  },

  leadScoring: {
    name: 'leadScoring',
    description: 'Score new contacts using AI-based lead scoring',
    schedule: 'on-demand',
    handler: async () => {
      logger.info('Lead scoring job triggered (placeholder)');
      // Will be implemented when we integrate the LeadScoringEngine
      // from @hararai/ai with the contacts database
      return { scored: 0, message: 'Lead scoring not yet implemented' };
    },
  },

  staleDealAlerts: {
    name: 'staleDealAlerts',
    description: 'Find deals stuck in the same stage for > 7 days and notify owner',
    schedule: 'daily at 7am AEST',
    handler: runStaleDealAlerts,
  },

  dailySummary: {
    name: 'dailySummary',
    description: 'Send daily morning briefing to each org owner with business stats, schedule, and alerts',
    schedule: 'daily at 7am AEST',
    handler: runDailySummary,
  },
};

/**
 * Run a job by name. Returns the job result or throws if the job doesn't exist.
 */
export async function runJob(jobName: string): Promise<unknown> {
  const job = jobRegistry[jobName];
  if (!job) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  logger.info(`Starting job: ${job.name}`, { description: job.description });

  const startTime = performance.now();
  try {
    const result = await job.handler();
    const duration = Math.round(performance.now() - startTime);
    logger.info(`Job completed: ${job.name}`, { duration: `${duration}ms` });
    return result;
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    logger.error(`Job failed: ${job.name}`, {
      duration: `${duration}ms`,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * List all registered jobs with their metadata.
 */
export function listJobs(): Array<Omit<JobDefinition, 'handler'>> {
  return Object.values(jobRegistry).map(({ name, description, schedule }) => ({
    name,
    description,
    schedule,
  }));
}
