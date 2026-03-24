import {
  db,
  appointments,
  contacts,
  organizations,
  withOrgScope,
} from '@mybizos/db';
import { and, gte, lte, isNull, eq, sql } from 'drizzle-orm';
import { TwilioClient } from '@mybizos/integrations';
import { ResendProvider, appointmentReminderHtml } from '@mybizos/email';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

/**
 * Appointment Reminders Job
 *
 * Runs every 15 minutes. Finds appointments starting within the next hour
 * that have not yet been reminded, and sends SMS + email reminders.
 *
 * Logic:
 * 1. Query appointments where startTime is between now and now+1hr
 *    AND reminderSentAt IS NULL
 *    AND status is 'scheduled' or 'confirmed'
 * 2. For each appointment:
 *    - Send SMS reminder via Twilio
 *    - Send email reminder via Resend
 *    - Mark appointment as reminded (set reminderSentAt)
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

  // Find appointments starting in the next hour that haven't been reminded
  const upcomingAppointments = await db
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
    .innerJoin(contacts, eq(appointments.contactId, contacts.id))
    .innerJoin(organizations, eq(appointments.orgId, organizations.id))
    .where(and(
      gte(appointments.startTime, now),
      lte(appointments.startTime, oneHourFromNow),
      isNull(appointments.reminderSentAt),
      sql`${appointments.status} IN ('scheduled', 'confirmed')`,
    ));

  let smsSent = 0;
  let emailsSent = 0;
  let errors = 0;

  const twilio = new TwilioClient({
    accountSid: config.TWILIO_ACCOUNT_SID,
    authToken: config.TWILIO_AUTH_TOKEN,
    defaultFromNumber: config.TWILIO_PHONE_NUMBER,
  });

  const resend = new ResendProvider({
    apiKey: config.RESEND_API_KEY,
    defaultFrom: config.RESEND_DEFAULT_FROM,
  });

  for (const row of upcomingAppointments) {
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
        const fromNumber = row.orgPhone ?? config.TWILIO_PHONE_NUMBER;
        await twilio.sendSms(
          row.contactPhone,
          `Reminder: Your ${apt.title} appointment with ${businessName} is in 1 hour (${timeStr}). Reply HELP for questions.`,
          fromNumber,
        );
        smsSent++;
        logger.info('SMS reminder sent', {
          appointmentId: apt.id,
          contactPhone: row.contactPhone,
        });
      } catch (err) {
        errors++;
        logger.error('Failed to send SMS reminder', {
          appointmentId: apt.id,
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
          contactEmail: row.contactEmail,
        });
      } catch (err) {
        errors++;
        logger.error('Failed to send email reminder', {
          appointmentId: apt.id,
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
  }

  const result = {
    processed: upcomingAppointments.length,
    smsSent,
    emailsSent,
    errors,
  };

  logger.info('Appointment reminders job completed', result);
  return result;
}
