import {
  db,
  dripSequences,
  sequenceEnrollments,
  contacts,
  organizations,
  activities,
  withOrgScope,
  type SequenceStep,
  type SendEmailStepConfig,
  type SendSmsStepConfig,
  type WaitStepConfig,
  type AddTagStepConfig,
  type RemoveTagStepConfig,
  type AiDecisionStepConfig,
} from '@hararai/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { TwilioClient } from '@hararai/integrations';
import { ResendProvider } from '@hararai/email';
import { ClaudeClient } from '@hararai/ai';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';
import { activityService } from '../services/activity-service.js';

// ── Template Variable Helpers ─────────────────────────────────────────────────

interface TemplateContext {
  contact: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
}

/**
 * Replace {{contact.firstName}}, {{business.name}}, etc. in template strings.
 */
function interpolateTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{contact\.firstName\}\}/g, ctx.contact.firstName)
    .replace(/\{\{contact\.lastName\}\}/g, ctx.contact.lastName)
    .replace(/\{\{contact\.email\}\}/g, ctx.contact.email ?? '')
    .replace(/\{\{contact\.phone\}\}/g, ctx.contact.phone ?? '')
    .replace(/\{\{business\.name\}\}/g, ctx.business.name)
    .replace(/\{\{business\.phone\}\}/g, ctx.business.phone ?? '')
    .replace(/\{\{business\.email\}\}/g, ctx.business.email ?? '')
    .replace(/\{\{business\.website\}\}/g, ctx.business.website ?? '')
    .replace(/\{\{business\.bookingUrl\}\}/g, ctx.business.website ? `${ctx.business.website}/book` : '');
}

// ── Step Executors ────────────────────────────────────────────────────────────

async function executeSendEmail(
  orgId: string,
  contactId: string,
  stepConfig: SendEmailStepConfig,
  ctx: TemplateContext,
): Promise<void> {
  if (!ctx.contact.email) {
    logger.warn('Skipping send_email: contact has no email', { orgId, contactId });
    return;
  }

  const subject = interpolateTemplate(stepConfig.subject, ctx);
  const bodyHtml = interpolateTemplate(stepConfig.body_html, ctx);

  const resend = new ResendProvider({
    apiKey: config.RESEND_API_KEY,
    defaultFrom: config.RESEND_DEFAULT_FROM,
  });

  await resend.sendEmail(
    undefined,
    ctx.contact.email,
    subject,
    bodyHtml,
    undefined,
    'drip-sequence',
  );

  await activityService.logActivity(orgId, {
    contactId,
    type: 'email',
    title: `Sequence email sent: ${subject}`,
    description: `Drip sequence email delivered to ${ctx.contact.email}`,
    metadata: { subject, sequenceStep: 'send_email' },
  });

  logger.info('Sequence email sent', { orgId, contactId, subject });
}

async function executeSendSms(
  orgId: string,
  contactId: string,
  stepConfig: SendSmsStepConfig,
  ctx: TemplateContext,
  orgSettings: Record<string, unknown>,
): Promise<void> {
  if (!ctx.contact.phone) {
    logger.warn('Skipping send_sms: contact has no phone', { orgId, contactId });
    return;
  }

  const body = interpolateTemplate(stepConfig.body, ctx);

  // Extract Twilio credentials from org settings JSONB (phone or managedPhone key)
  const phoneSettings = (orgSettings['phone'] ?? orgSettings['managedPhone'] ?? orgSettings['mybizosPhone'] ?? {}) as Record<string, string>;
  const twilioSid = phoneSettings['subaccountSid'] || phoneSettings['accountSid'] || config.TWILIO_ACCOUNT_SID;
  const twilioToken = phoneSettings['subaccountAuthToken'] || phoneSettings['authToken'] || config.TWILIO_AUTH_TOKEN;
  const twilioFrom = phoneSettings['phoneNumber'] || config.TWILIO_PHONE_NUMBER;

  const twilio = new TwilioClient({
    accountSid: twilioSid,
    authToken: twilioToken,
    defaultFromNumber: twilioFrom,
  });

  await twilio.sendSms(ctx.contact.phone, body);

  await activityService.logActivity(orgId, {
    contactId,
    type: 'sms',
    title: 'Sequence SMS sent',
    description: `Drip sequence SMS delivered to ${ctx.contact.phone}`,
    metadata: { body: body.substring(0, 100), sequenceStep: 'send_sms' },
  });

  logger.info('Sequence SMS sent', { orgId, contactId });
}

async function executeAddTag(
  orgId: string,
  contactId: string,
  stepConfig: AddTagStepConfig,
): Promise<void> {
  // Append tag to contact's tags array (only if not already present)
  await db
    .update(contacts)
    .set({
      tags: sql`array_append(
        CASE WHEN ${contacts.tags} @> ARRAY[${stepConfig.tag}]::text[]
        THEN array_remove(${contacts.tags}, ${stepConfig.tag})
        ELSE ${contacts.tags}
        END,
        ${stepConfig.tag}
      )`,
      updatedAt: new Date(),
    })
    .where(and(
      withOrgScope(contacts.orgId, orgId),
      eq(contacts.id, contactId),
    ));

  await activityService.logActivity(orgId, {
    contactId,
    type: 'note',
    title: `Tag added: ${stepConfig.tag}`,
    description: `Drip sequence added tag "${stepConfig.tag}"`,
    metadata: { tag: stepConfig.tag, sequenceStep: 'add_tag' },
  });

  logger.info('Tag added by sequence', { orgId, contactId, tag: stepConfig.tag });
}

async function executeRemoveTag(
  orgId: string,
  contactId: string,
  stepConfig: RemoveTagStepConfig,
): Promise<void> {
  await db
    .update(contacts)
    .set({
      tags: sql`array_remove(${contacts.tags}, ${stepConfig.tag})`,
      updatedAt: new Date(),
    })
    .where(and(
      withOrgScope(contacts.orgId, orgId),
      eq(contacts.id, contactId),
    ));

  await activityService.logActivity(orgId, {
    contactId,
    type: 'note',
    title: `Tag removed: ${stepConfig.tag}`,
    description: `Drip sequence removed tag "${stepConfig.tag}"`,
    metadata: { tag: stepConfig.tag, sequenceStep: 'remove_tag' },
  });

  logger.info('Tag removed by sequence', { orgId, contactId, tag: stepConfig.tag });
}

async function executeAiDecision(
  orgId: string,
  contactId: string,
  stepConfig: AiDecisionStepConfig,
  ctx: TemplateContext,
): Promise<{ answer: 'yes' | 'no'; nextStep: number }> {
  const prompt = interpolateTemplate(stepConfig.prompt, ctx);

  // Load recent activities to give the AI context about this contact
  const recentActivities = await db
    .select({
      type: activities.type,
      title: activities.title,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(and(
      withOrgScope(activities.orgId, orgId),
      eq(activities.contactId, contactId),
    ))
    .orderBy(sql`${activities.createdAt} DESC`)
    .limit(10);

  const activitySummary = recentActivities
    .map((a) => `- [${a.type}] ${a.title} (${a.createdAt.toISOString()})`)
    .join('\n');

  const systemPrompt = `You are an AI assistant helping a business make decisions about their customer contacts in a CRM drip sequence.
You must respond with ONLY "yes" or "no" (lowercase, nothing else).

Contact: ${ctx.contact.firstName} ${ctx.contact.lastName}
Email: ${ctx.contact.email ?? 'N/A'}
Phone: ${ctx.contact.phone ?? 'N/A'}

Recent Activity:
${activitySummary || 'No recent activity recorded.'}`;

  let answer: 'yes' | 'no' = 'no';

  try {
    const claude = new ClaudeClient({
      apiKey: config.ANTHROPIC_API_KEY,
      maxTokens: 10,
    });

    const response = await claude.complete(systemPrompt, prompt, {
      maxTokens: 10,
      temperature: 0,
    });

    const normalized = response.trim().toLowerCase();
    answer = normalized.startsWith('yes') ? 'yes' : 'no';
  } catch (err) {
    logger.error('AI decision call failed, defaulting to no', {
      orgId,
      contactId,
      error: err instanceof Error ? err.message : String(err),
    });
    answer = 'no';
  }

  const nextStep = answer === 'yes' ? stepConfig.yes_step : stepConfig.no_step;

  await activityService.logActivity(orgId, {
    contactId,
    type: 'ai_interaction',
    title: `AI decision: ${prompt.substring(0, 60)}... → ${answer}`,
    description: `Drip sequence AI decision: "${prompt}" → ${answer}`,
    metadata: { prompt, answer, nextStep, sequenceStep: 'ai_decision' },
  });

  logger.info('AI decision made', { orgId, contactId, answer, nextStep });

  return { answer, nextStep };
}

// ── Main Processor ────────────────────────────────────────────────────────────

/**
 * Sequence Processor Job
 *
 * Runs every 5 minutes. Queries all active enrollments whose nextStepAt
 * has passed, loads each sequence definition, and executes the current step.
 *
 * Step types: send_email, send_sms, wait, add_tag, remove_tag, ai_decision
 */
export async function runSequenceProcessor(): Promise<{
  processed: number;
  completed: number;
  errors: number;
}> {
  const now = new Date();

  logger.info('Running sequence processor job', { timestamp: now.toISOString() });

  // Query all active enrollments where nextStepAt <= now
  const dueEnrollments = await db
    .select({
      enrollment: sequenceEnrollments,
      sequence: dripSequences,
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
      },
      org: {
        id: organizations.id,
        name: organizations.name,
        phone: organizations.phone,
        email: organizations.email,
        website: organizations.website,
        settings: organizations.settings,
      },
    })
    .from(sequenceEnrollments)
    .innerJoin(dripSequences, eq(sequenceEnrollments.sequenceId, dripSequences.id))
    .innerJoin(contacts, eq(sequenceEnrollments.contactId, contacts.id))
    .innerJoin(organizations, eq(sequenceEnrollments.orgId, organizations.id))
    .where(and(
      eq(sequenceEnrollments.status, 'active'),
      lte(sequenceEnrollments.nextStepAt, now),
    ));

  let processed = 0;
  let completed = 0;
  let errors = 0;

  for (const row of dueEnrollments) {
    const { enrollment, sequence, contact, org } = row;

    // Safety: skip if the parent sequence has been deactivated
    if (!sequence.isActive) {
      logger.info('Skipping enrollment: sequence is inactive', {
        enrollmentId: enrollment.id,
        sequenceId: sequence.id,
      });
      continue;
    }

    const steps = sequence.steps as SequenceStep[];
    const currentStep = steps[enrollment.currentStep];

    // Contact not found (shouldn't happen due to INNER JOIN, but defensive)
    if (!contact) {
      logger.warn('Contact not found for enrollment, cancelling', {
        enrollmentId: enrollment.id,
      });
      await db
        .update(sequenceEnrollments)
        .set({ status: 'cancelled', completedAt: new Date() })
        .where(eq(sequenceEnrollments.id, enrollment.id));
      continue;
    }

    // No more steps -- mark completed
    if (!currentStep) {
      await db
        .update(sequenceEnrollments)
        .set({ status: 'completed', completedAt: new Date(), nextStepAt: null })
        .where(eq(sequenceEnrollments.id, enrollment.id));
      completed++;
      logger.info('Enrollment completed (no more steps)', {
        enrollmentId: enrollment.id,
      });
      continue;
    }

    const templateCtx: TemplateContext = {
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
      business: {
        name: org.name,
        phone: org.phone,
        email: org.email,
        website: org.website,
      },
    };

    try {
      let nextStepIndex = enrollment.currentStep + 1;

      switch (currentStep.type) {
        case 'send_email': {
          await executeSendEmail(
            enrollment.orgId,
            contact.id,
            currentStep.config as SendEmailStepConfig,
            templateCtx,
          );
          break;
        }

        case 'send_sms': {
          await executeSendSms(
            enrollment.orgId,
            contact.id,
            currentStep.config as SendSmsStepConfig,
            templateCtx,
            (org.settings ?? {}) as Record<string, unknown>,
          );
          break;
        }

        case 'wait': {
          // For a wait step, set nextStepAt to now + delay_hours and advance past it
          const waitConfig = currentStep.config as WaitStepConfig;
          const nextStepAt = new Date(Date.now() + waitConfig.delay_hours * 60 * 60 * 1000);

          await db
            .update(sequenceEnrollments)
            .set({
              currentStep: nextStepIndex,
              nextStepAt,
            })
            .where(eq(sequenceEnrollments.id, enrollment.id));

          processed++;
          logger.info('Wait step processed', {
            enrollmentId: enrollment.id,
            delayHours: waitConfig.delay_hours,
            nextStepAt: nextStepAt.toISOString(),
          });
          // Continue to next enrollment -- don't fall through to the advance logic below
          continue;
        }

        case 'add_tag': {
          await executeAddTag(
            enrollment.orgId,
            contact.id,
            currentStep.config as AddTagStepConfig,
          );
          break;
        }

        case 'remove_tag': {
          await executeRemoveTag(
            enrollment.orgId,
            contact.id,
            currentStep.config as RemoveTagStepConfig,
          );
          break;
        }

        case 'ai_decision': {
          const decision = await executeAiDecision(
            enrollment.orgId,
            contact.id,
            currentStep.config as AiDecisionStepConfig,
            templateCtx,
          );
          // AI decision overrides the normal sequential advance
          nextStepIndex = decision.nextStep;
          break;
        }

        default: {
          logger.warn('Unknown step type, skipping', {
            enrollmentId: enrollment.id,
            stepType: (currentStep as SequenceStep).type,
          });
        }
      }

      // Advance to the next step
      const nextStep = steps[nextStepIndex];

      if (nextStep) {
        // Calculate when the next step should fire
        let nextStepAt: Date;
        if (nextStep.type === 'wait') {
          // If the next step IS a wait, set nextStepAt to now (it will process
          // the wait logic on its next run) -- actually execute immediately
          // so the wait step can set the proper delay.
          nextStepAt = new Date();
        } else {
          nextStepAt = new Date();
        }

        await db
          .update(sequenceEnrollments)
          .set({
            currentStep: nextStepIndex,
            nextStepAt,
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
      } else {
        // No more steps -- mark completed
        await db
          .update(sequenceEnrollments)
          .set({
            currentStep: nextStepIndex,
            status: 'completed',
            completedAt: new Date(),
            nextStepAt: null,
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
        completed++;
      }

      processed++;
    } catch (err) {
      errors++;
      logger.error('Error processing enrollment step', {
        enrollmentId: enrollment.id,
        sequenceId: sequence.id,
        step: enrollment.currentStep,
        stepType: currentStep.type,
        error: err instanceof Error ? err.message : String(err),
      });

      // On error: mark enrollment as failed instead of silently advancing
      await db
        .update(sequenceEnrollments)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          nextStepAt: null,
        })
        .where(eq(sequenceEnrollments.id, enrollment.id));
    }
  }

  const result = { processed, completed, errors };
  logger.info('Sequence processor job completed', result);
  return result;
}
