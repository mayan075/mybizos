import {
  db,
  appointments,
  contacts,
  organizations,
  withOrgScope,
} from '@mybizos/db';
import { and, lte, eq, sql } from 'drizzle-orm';
import { TwilioClient } from '@mybizos/integrations';
import { ResendProvider, reviewRequestHtml } from '@mybizos/email';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';
import { activityService } from '../services/activity-service.js';

/**
 * Review Requests Job
 *
 * Runs every hour. Finds appointments that were completed 24+ hours ago
 * and haven't had a review request sent, then sends an SMS and email
 * asking the customer to leave a review.
 *
 * Processes per-org to ensure tenant isolation of Twilio credentials.
 */
export async function runReviewRequests(): Promise<{
  processed: number;
  smsSent: number;
  emailsSent: number;
  errors: number;
}> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  logger.info('Running review requests job', {
    completedBefore: twentyFourHoursAgo.toISOString(),
  });

  let totalProcessed = 0;
  let smsSent = 0;
  let emailsSent = 0;
  let errors = 0;

  // Process per-org to use correct Twilio credentials for each tenant
  const allOrgs = await db.select().from(organizations);

  for (const org of allOrgs) {
    const orgSettings = (org.settings ?? {}) as Record<string, unknown>;
    const phoneSettings = (orgSettings['phone'] ?? orgSettings['mybizosPhone'] ?? {}) as Record<string, string>;

    // Query completed appointments scoped to THIS org only
    const completedForOrg = await db
      .select({
        appointment: appointments,
        contactId: contacts.id,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgPhone: organizations.phone,
      })
      .from(appointments)
      .innerJoin(contacts, and(eq(appointments.contactId, contacts.id), eq(contacts.orgId, org.id)))
      .innerJoin(organizations, eq(appointments.orgId, organizations.id))
      .where(and(
        withOrgScope(appointments.orgId, org.id),
        eq(appointments.status, 'completed'),
        lte(appointments.updatedAt, twentyFourHoursAgo),
        sql`(${appointments.notes} IS NULL OR ${appointments.notes} NOT LIKE '%[review_requested]%')`,
      ));

    if (completedForOrg.length === 0) continue;

    // Create per-org Twilio client using org's subaccount credentials
    const twilio = new TwilioClient({
      accountSid: phoneSettings['subaccountSid'] || phoneSettings['accountSid'] || config.TWILIO_ACCOUNT_SID,
      authToken: phoneSettings['subaccountAuthToken'] || phoneSettings['authToken'] || config.TWILIO_AUTH_TOKEN,
      defaultFromNumber: org.phone || phoneSettings['phoneNumber'] || config.TWILIO_PHONE_NUMBER,
    });

    const resend = new ResendProvider({
      apiKey: config.RESEND_API_KEY,
      defaultFrom: config.RESEND_DEFAULT_FROM,
    });

    for (const row of completedForOrg) {
      const apt = row.appointment;
      const contactName = `${row.contactFirstName} ${row.contactLastName}`.trim();
      const businessName = row.orgName;
      const orgSlug = row.orgSlug;

      // Build review URL
      const reviewUrl = `${config.APP_URL.replace(':3001', ':3000')}/review/${orgSlug}`;
      const feedbackUrl = `${config.APP_URL.replace(':3001', ':3000')}/review/${orgSlug}?type=feedback`;

      // Send SMS review request
      if (row.contactPhone) {
        try {
          const fromNumber = row.orgPhone ?? org.phone ?? config.TWILIO_PHONE_NUMBER;
          await twilio.sendSms(
            row.contactPhone,
            `Thanks for choosing ${businessName}! How was your experience? We'd love your feedback: ${reviewUrl}`,
            fromNumber,
          );
          smsSent++;
          logger.info('Review request SMS sent', {
            appointmentId: apt.id,
            orgId: org.id,
            contactPhone: row.contactPhone,
          });
        } catch (err) {
          errors++;
          logger.error('Failed to send review request SMS', {
            appointmentId: apt.id,
            orgId: org.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Send email review request
      if (row.contactEmail) {
        try {
          const html = reviewRequestHtml(
            businessName,
            contactName,
            reviewUrl,
            feedbackUrl,
          );

          await resend.sendEmail(
            undefined,
            row.contactEmail,
            `How was your experience with ${businessName}?`,
            html,
            `Hi ${contactName}, thank you for choosing ${businessName}! We'd love to hear about your experience. Leave us a review: ${reviewUrl}`,
            'review-request',
          );
          emailsSent++;
          logger.info('Review request email sent', {
            appointmentId: apt.id,
            orgId: org.id,
            contactEmail: row.contactEmail,
          });
        } catch (err) {
          errors++;
          logger.error('Failed to send review request email', {
            appointmentId: apt.id,
            orgId: org.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Mark appointment as review_requested
      try {
        const existingNotes = apt.notes ?? '';
        const updatedNotes = existingNotes
          ? `${existingNotes}\n[review_requested] ${new Date().toISOString()}`
          : `[review_requested] ${new Date().toISOString()}`;

        await db
          .update(appointments)
          .set({ notes: updatedNotes, updatedAt: new Date() })
          .where(eq(appointments.id, apt.id));
      } catch (err) {
        errors++;
        logger.error('Failed to mark appointment as review_requested', {
          appointmentId: apt.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Log activity
      try {
        await activityService.logActivity(row.orgId, {
          contactId: row.contactId,
          type: 'email',
          title: 'Review request sent',
          description: `Review request sent to ${contactName} for ${apt.title}`,
          metadata: {
            appointmentId: apt.id,
            reviewUrl,
            smsSent: !!row.contactPhone,
            emailSent: !!row.contactEmail,
          },
        });
      } catch (err) {
        logger.error('Failed to log review request activity', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      totalProcessed++;
    }
  }

  const result = {
    processed: totalProcessed,
    smsSent,
    emailsSent,
    errors,
  };

  logger.info('Review requests job completed', result);
  return result;
}
