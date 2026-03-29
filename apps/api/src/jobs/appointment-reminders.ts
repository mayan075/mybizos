import {
  db,
  appointments,
  contacts,
  organizations,
  withOrgScope,
} from '@hararai/db';
import { and, gte, lte, isNull, eq, sql } from 'drizzle-orm';
import { TwilioClient } from '@hararai/integrations';
import { ResendProvider, appointmentReminderHtml } from '@hararai/email';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

/**
 * Appointment Reminders Job
 *
 * Runs every 15 minutes. Finds appointments starting within the next hour
 * that have not yet been reminded, and sends SMS + email reminders.
 *
 * Processes per-org to ensure tenant isolation of Twilio credentials.
 */
export async function runAppointmentReminders(): Promise<{
  processed: number;
  smsSent: number;
  emailsSent: number;
  errors: number;
}> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  logger.info('Running appointment reminders job', {
    from: now.toISOString(),
    to: oneHourFromNow.toISOString(),
  });

  let totalProcessed = 0;
  let smsSent = 0;
  let emailsSent = 0;
  let errors = 0;

  // Process per-org to use correct Twilio credentials for each tenant
  const allOrgs = await db.select().from(organizations);

  for (const org of allOrgs) {
    const orgSettings = (org.settings ?? {}) as Record<string, unknown>;
    const phoneSettings = (orgSettings['phone'] ?? orgSettings['managedPhone'] ?? orgSettings['mybizosPhone'] ?? {}) as Record<string, string>;

    // Query appointments scoped to THIS org only
    const upcomingForOrg = await db
      .select({
        appointment: appointments,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,
        orgName: organizations.name,
        orgPhone: organizations.phone,
      })
      .from(appointments)
      .innerJoin(contacts, and(eq(appointments.contactId, contacts.id), eq(contacts.orgId, org.id)))
      .innerJoin(organizations, eq(appointments.orgId, organizations.id))
      .where(and(
        withOrgScope(appointments.orgId, org.id),
        gte(appointments.startTime, now),
        lte(appointments.startTime, oneHourFromNow),
        isNull(appointments.reminderSentAt),
        sql`${appointments.status} IN ('scheduled', 'confirmed')`,
      ));

    if (upcomingForOrg.length === 0) continue;

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

    for (const row of upcomingForOrg) {
      const apt = row.appointment;
      const contactName = `${row.contactFirstName} ${row.contactLastName}`.trim();
      const businessName = row.orgName;

      // Format time for display
      const startDate = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
      const dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Send SMS reminder
      if (row.contactPhone) {
        try {
          const fromNumber = row.orgPhone ?? org.phone ?? config.TWILIO_PHONE_NUMBER;
          await twilio.sendSms(
            row.contactPhone,
            `Reminder: Your ${apt.title} appointment with ${businessName} is in 1 hour (${timeStr}). Reply HELP for questions.`,
            fromNumber,
          );
          smsSent++;
          logger.info('SMS reminder sent', {
            appointmentId: apt.id,
            orgId: org.id,
            contactPhone: row.contactPhone,
          });
        } catch (err) {
          errors++;
          logger.error('Failed to send SMS reminder', {
            appointmentId: apt.id,
            orgId: org.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Send email reminder
      if (row.contactEmail) {
        try {
          const html = appointmentReminderHtml(
            businessName,
            contactName,
            apt.title,
            dateStr,
            timeStr,
          );

          await resend.sendEmail(
            undefined,
            row.contactEmail,
            `Reminder: Your appointment with ${businessName} is in 1 hour`,
            html,
            `Hi ${contactName}, this is a reminder that your ${apt.title} appointment with ${businessName} is coming up at ${timeStr}. Please ensure someone is available at the service location.`,
            'appointment-reminder',
          );
          emailsSent++;
          logger.info('Email reminder sent', {
            appointmentId: apt.id,
            orgId: org.id,
            contactEmail: row.contactEmail,
          });
        } catch (err) {
          errors++;
          logger.error('Failed to send email reminder', {
            appointmentId: apt.id,
            orgId: org.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Mark appointment as reminded
      try {
        await db
          .update(appointments)
          .set({ reminderSentAt: new Date() })
          .where(eq(appointments.id, apt.id));
      } catch (err) {
        errors++;
        logger.error('Failed to mark appointment as reminded', {
          appointmentId: apt.id,
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

  logger.info('Appointment reminders job completed', result);
  return result;
}
