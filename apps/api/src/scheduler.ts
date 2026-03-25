import cron from 'node-cron';
import { config } from './config.js';
import { logger } from './middleware/logger.js';
import { runAppointmentReminders } from './jobs/appointment-reminders.js';
import { runReviewRequests } from './jobs/review-requests.js';
import { runDailySummary } from './jobs/daily-summary.js';
import { runStaleDealAlerts } from './jobs/stale-deal-alerts.js';
import { runJob } from './jobs/index.js';

// ═════════════════════════════════════════════════════════════════════════════════
//  Job Scheduler
//
//  Uses node-cron to schedule recurring background jobs.
//  Only runs in production (or when ENABLE_SCHEDULER=true).
//
//  Schedule (all times UTC unless noted):
//  - appointmentReminders: every 15 minutes
//  - reviewRequests:       every hour
//  - dailySummary:         daily at 21:00 UTC (7am AEST next day)
//  - staleDealAlerts:      daily at 21:00 UTC (7am AEST next day)
//  - leadScoring:          every 30 minutes
//  - sequenceProcessor:    every 5 minutes
// ═════════════════════════════════════════════════════════════════════════════════

interface ScheduledJob {
  name: string;
  cronExpression: string;
  handler: () => Promise<unknown>;
  task: cron.ScheduledTask | null;
}

const jobs: ScheduledJob[] = [
  {
    name: 'appointmentReminders',
    cronExpression: '*/15 * * * *',  // Every 15 minutes
    handler: runAppointmentReminders,
    task: null,
  },
  {
    name: 'reviewRequests',
    cronExpression: '0 * * * *',      // Every hour at :00
    handler: runReviewRequests,
    task: null,
  },
  {
    name: 'dailySummary',
    cronExpression: '0 21 * * *',     // 21:00 UTC = 7am AEST
    handler: runDailySummary,
    task: null,
  },
  {
    name: 'staleDealAlerts',
    cronExpression: '5 21 * * *',     // 21:05 UTC = 7:05am AEST (stagger 5 min after daily summary)
    handler: runStaleDealAlerts,
    task: null,
  },
  {
    name: 'leadScoring',
    cronExpression: '*/30 * * * *',   // Every 30 minutes
    handler: async () => runJob('leadScoring'),
    task: null,
  },
  {
    name: 'sequenceProcessor',
    cronExpression: '*/5 * * * *',    // Every 5 minutes
    handler: async () => runJob('sequenceProcessor'),
    task: null,
  },
];

/**
 * Wraps a job handler with logging, error catching, and timing.
 */
function wrapJobHandler(jobName: string, handler: () => Promise<unknown>): () => void {
  return () => {
    const startTime = performance.now();
    const runAt = new Date().toISOString();

    logger.info(`[Scheduler] Job started: ${jobName}`, { runAt });

    handler()
      .then((result) => {
        const duration = Math.round(performance.now() - startTime);
        logger.info(`[Scheduler] Job completed: ${jobName}`, {
          duration: `${duration}ms`,
          runAt,
          result: typeof result === 'object' ? JSON.stringify(result) : String(result),
        });
      })
      .catch((err) => {
        const duration = Math.round(performance.now() - startTime);
        logger.error(`[Scheduler] Job failed: ${jobName}`, {
          duration: `${duration}ms`,
          runAt,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      });
  };
}

/**
 * Start all scheduled jobs. Should only be called once at server startup.
 * Returns a cleanup function to stop all jobs.
 */
export function startScheduler(): () => void {
  const shouldRun = config.ENABLE_SCHEDULER || config.NODE_ENV === 'production';

  if (!shouldRun) {
    logger.info('[Scheduler] Scheduler is DISABLED (set ENABLE_SCHEDULER=true or NODE_ENV=production to enable)');
    return () => { /* no-op */ };
  }

  logger.info('[Scheduler] Starting scheduler with jobs:', {
    jobs: jobs.map((j) => `${j.name} (${j.cronExpression})`).join(', '),
  });

  for (const job of jobs) {
    if (!cron.validate(job.cronExpression)) {
      logger.error(`[Scheduler] Invalid cron expression for ${job.name}: ${job.cronExpression}`);
      continue;
    }

    job.task = cron.schedule(
      job.cronExpression,
      wrapJobHandler(job.name, job.handler),
      {
        scheduled: true,
        timezone: 'UTC',
      },
    );

    logger.info(`[Scheduler] Scheduled: ${job.name} (${job.cronExpression})`);
  }

  logger.info(`[Scheduler] All ${jobs.length} jobs scheduled successfully`);

  // Return cleanup function
  return () => {
    logger.info('[Scheduler] Stopping all scheduled jobs');
    for (const job of jobs) {
      if (job.task) {
        job.task.stop();
        logger.info(`[Scheduler] Stopped: ${job.name}`);
      }
    }
  };
}
