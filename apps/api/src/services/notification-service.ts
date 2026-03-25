import {
  db,
  appointments,
  contacts,
  organizations,
  orgMembers,
  users,
  withOrgScope,
} from '@mybizos/db';
import { eq, and } from 'drizzle-orm';
import { TwilioClient } from '@mybizos/integrations';
import {
  ResendProvider,
  appointmentConfirmationHtml,
  appointmentReminderHtml,
} from '@mybizos/email';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

// ── Lazy singletons ──────────────────────────────────────────────────────────

let twilioInstance: TwilioClient | null = null;
let resendInstance: ResendProvider | null = null;

function getTwilio(): TwilioClient {
  if (!twilioInstance) {
    twilioInstance = new TwilioClient({
      accountSid: config.TWILIO_ACCOUNT_SID,
      authToken: config.TWILIO_AUTH_TOKEN,
      defaultFromNumber: config.TWILIO_PHONE_NUMBER,
    });
  }
  return twilioInstance;
}

function getResend(): ResendProvider {
  if (!resendInstance) {
    resendInstance = new ResendProvider({
      apiKey: config.RESEND_API_KEY,
      defaultFrom: config.RESEND_DEFAULT_FROM,
    });
  }
  return resendInstance;
}

// ── Helper: fetch org owner's personal details ───────────────────────────────

interface OwnerDetails {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
}

async function getOrgOwner(orgId: string): Promise<OwnerDetails | null> {
  const [ownerRow] = await db
    .select({
      userId: orgMembers.userId,
      email: users.email,
      name: users.name,
      // Owner's personal phone is stored in org settings.aiReceptionist.personalPhone
      // or the user table doesn't have a phone column — we'll get it from org settings
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(and(
      withOrgScope(orgMembers.orgId, orgId),
      eq(orgMembers.role, 'owner'),
    ))
    .limit(1);

  if (!ownerRow) return null;

  // Try to get personal phone from org settings
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const settings = org?.settings as Record<string, unknown> | null;
  const aiReceptionist = settings?.aiReceptionist as Record<string, unknown> | null;
  const personalPhone = (aiReceptionist?.personalPhone as string) ?? null;

  return {
    userId: ownerRow.userId,
    email: ownerRow.email,
    name: ownerRow.name,
    phone: personalPhone,
  };
}

// ── Helper: fetch appointment with contact + org details ─────────────────────

interface AppointmentWithDetails {
  appointmentId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  orgName: string;
  orgPhone: string | null;
}

async function getAppointmentDetails(
  orgId: string,
  appointmentId: string,
): Promise<AppointmentWithDetails | null> {
  const [row] = await db
    .select({
      appointmentId: appointments.id,
      title: appointments.title,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      location: appointments.location,
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
      withOrgScope(appointments.orgId, orgId),
      eq(appointments.id, appointmentId),
    ));

  if (!row) return null;

  return {
    appointmentId: row.appointmentId,
    title: row.title,
    startTime: row.startTime instanceof Date ? row.startTime : new Date(row.startTime),
    endTime: row.endTime instanceof Date ? row.endTime : new Date(row.endTime),
    location: row.location,
    contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    orgName: row.orgName,
    orgPhone: row.orgPhone,
  };
}

// ── Format helpers ───────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ═════════════════════════════════════════════════════════════════════════════════
//  Notification Service
// ═════════════════════════════════════════════════════════════════════════════════

export const notificationService = {
  /**
   * Send appointment confirmation SMS + email to the customer.
   * Called when an appointment is created (AI call, booking page, manual).
   */
  async sendAppointmentConfirmation(
    orgId: string,
    appointmentId: string,
  ): Promise<{ smsSent: boolean; emailSent: boolean }> {
    const details = await getAppointmentDetails(orgId, appointmentId);
    if (!details) {
      logger.warn('Cannot send appointment confirmation — details not found', {
        orgId,
        appointmentId,
      });
      return { smsSent: false, emailSent: false };
    }

    const dateStr = formatDate(details.startTime);
    const timeStr = formatTime(details.startTime);
    let smsSent = false;
    let emailSent = false;

    // Send SMS confirmation
    if (details.contactPhone) {
      try {
        const twilio = getTwilio();
        const fromNumber = details.orgPhone ?? config.TWILIO_PHONE_NUMBER;
        await twilio.sendSms(
          details.contactPhone,
          `Hi ${details.contactName}! Your ${details.title} with ${details.orgName} is confirmed for ${dateStr} at ${timeStr}. Reply RESCHEDULE to change or CANCEL to cancel.`,
          fromNumber,
        );
        smsSent = true;
        logger.info('Appointment confirmation SMS sent', {
          appointmentId,
          phone: details.contactPhone,
        });
      } catch (err) {
        logger.error('Failed to send appointment confirmation SMS', {
          appointmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Send email confirmation
    if (details.contactEmail) {
      try {
        const resend = getResend();
        const html = appointmentConfirmationHtml(
          details.orgName,
          details.contactName,
          details.title,
          dateStr,
          timeStr,
          details.location ?? 'To be confirmed',
        );

        await resend.sendEmail(
          undefined,
          details.contactEmail,
          `Appointment Confirmed: ${details.title} with ${details.orgName}`,
          html,
          `Hi ${details.contactName}, your ${details.title} appointment with ${details.orgName} is confirmed for ${dateStr} at ${timeStr}.`,
          'appointment-confirmation',
        );
        emailSent = true;
        logger.info('Appointment confirmation email sent', {
          appointmentId,
          email: details.contactEmail,
        });
      } catch (err) {
        logger.error('Failed to send appointment confirmation email', {
          appointmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { smsSent, emailSent };
  },

  /**
   * Send appointment reminder SMS + email to the customer.
   * Typically sent 24 hours and 1 hour before the appointment.
   */
  async sendAppointmentReminder(
    orgId: string,
    appointmentId: string,
    timingLabel = 'in 1 hour',
  ): Promise<{ smsSent: boolean; emailSent: boolean }> {
    const details = await getAppointmentDetails(orgId, appointmentId);
    if (!details) {
      logger.warn('Cannot send appointment reminder — details not found', {
        orgId,
        appointmentId,
      });
      return { smsSent: false, emailSent: false };
    }

    const dateStr = formatDate(details.startTime);
    const timeStr = formatTime(details.startTime);
    let smsSent = false;
    let emailSent = false;

    // Send SMS reminder
    if (details.contactPhone) {
      try {
        const twilio = getTwilio();
        const fromNumber = details.orgPhone ?? config.TWILIO_PHONE_NUMBER;
        await twilio.sendSms(
          details.contactPhone,
          `Reminder: Your ${details.title} appointment with ${details.orgName} is ${timingLabel} (${timeStr}). Reply HELP for questions.`,
          fromNumber,
        );
        smsSent = true;
        logger.info('Appointment reminder SMS sent', { appointmentId });
      } catch (err) {
        logger.error('Failed to send appointment reminder SMS', {
          appointmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Send email reminder
    if (details.contactEmail) {
      try {
        const resend = getResend();
        const html = appointmentReminderHtml(
          details.orgName,
          details.contactName,
          details.title,
          dateStr,
          timeStr,
        );

        await resend.sendEmail(
          undefined,
          details.contactEmail,
          `Reminder: Your appointment with ${details.orgName} is ${timingLabel}`,
          html,
          `Hi ${details.contactName}, this is a reminder that your ${details.title} appointment with ${details.orgName} is coming up at ${timeStr}.`,
          'appointment-reminder',
        );
        emailSent = true;
        logger.info('Appointment reminder email sent', { appointmentId });
      } catch (err) {
        logger.error('Failed to send appointment reminder email', {
          appointmentId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { smsSent, emailSent };
  },

  /**
   * Send a notification to the org owner's personal phone via SMS + email.
   * Used for daily briefings, stale deal alerts, escalations, etc.
   */
  async sendOwnerNotification(
    orgId: string,
    message: string,
    options?: {
      subject?: string;
      htmlBody?: string;
    },
  ): Promise<{ smsSent: boolean; emailSent: boolean }> {
    const owner = await getOrgOwner(orgId);
    if (!owner) {
      logger.warn('Cannot send owner notification — no owner found', { orgId });
      return { smsSent: false, emailSent: false };
    }

    let smsSent = false;
    let emailSent = false;

    // Get org phone to send from
    const [org] = await db
      .select({ phone: organizations.phone, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    // Send SMS to owner's personal phone
    if (owner.phone) {
      try {
        const twilio = getTwilio();
        const fromNumber = org?.phone ?? config.TWILIO_PHONE_NUMBER;
        await twilio.sendSms(owner.phone, message, fromNumber);
        smsSent = true;
        logger.info('Owner notification SMS sent', {
          orgId,
          ownerUserId: owner.userId,
        });
      } catch (err) {
        logger.error('Failed to send owner notification SMS', {
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Send email to owner
    if (owner.email) {
      try {
        const resend = getResend();
        const subject = options?.subject ?? `MyBizOS Notification — ${org?.name ?? 'Your Business'}`;
        await resend.sendEmail(
          undefined,
          owner.email,
          subject,
          options?.htmlBody ?? undefined,
          message,
          'owner-notification',
        );
        emailSent = true;
        logger.info('Owner notification email sent', {
          orgId,
          ownerEmail: owner.email,
        });
      } catch (err) {
        logger.error('Failed to send owner notification email', {
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { smsSent, emailSent };
  },

  /**
   * Exposed for other services that need owner info (e.g., daily summary).
   */
  getOrgOwner,
};
