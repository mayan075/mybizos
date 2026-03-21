import { ServerClient, type Message, type MessageSendingResponse } from "postmark";

export interface PostmarkConfig {
  serverToken: string;
  defaultFrom: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  from?: string;
  replyTo?: string;
  tag?: string;
  metadata?: Record<string, string>;
  messageStream?: string;
}

export interface SendEmailResult {
  messageId: string;
  submittedAt: string;
  to: string;
}

/**
 * Postmark email provider for transactional emails.
 * Used for appointment confirmations, notifications, and system emails.
 */
export class PostmarkProvider {
  private client: ServerClient;
  private defaultFrom: string;

  constructor(config: PostmarkConfig) {
    this.client = new ServerClient(config.serverToken);
    this.defaultFrom = config.defaultFrom;
  }

  /**
   * Send a single transactional email.
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const message: Message = {
      From: options.from ?? this.defaultFrom,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.htmlBody ?? undefined,
      TextBody: options.textBody ?? undefined,
      ReplyTo: options.replyTo,
      Tag: options.tag,
      Metadata: options.metadata,
      MessageStream: options.messageStream ?? "outbound",
    };

    const response: MessageSendingResponse = await this.client.sendEmail(message);

    return {
      messageId: response.MessageID,
      submittedAt: response.SubmittedAt,
      to: response.To,
    };
  }

  /**
   * Send an appointment confirmation email.
   */
  async sendAppointmentConfirmation(params: {
    to: string;
    contactName: string;
    businessName: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceSummary: string;
    address: string;
  }): Promise<SendEmailResult> {
    return this.send({
      to: params.to,
      subject: `Appointment Confirmed - ${params.businessName}`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Confirmed</h2>
          <p>Hi ${params.contactName},</p>
          <p>Your appointment with <strong>${params.businessName}</strong> has been confirmed:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Date:</strong> ${params.appointmentDate}</p>
            <p><strong>Time:</strong> ${params.appointmentTime}</p>
            <p><strong>Service:</strong> ${params.serviceSummary}</p>
            <p><strong>Address:</strong> ${params.address}</p>
          </div>
          <p>If you need to reschedule or cancel, please reply to this email or call us.</p>
          <p>Thank you,<br/>${params.businessName}</p>
        </div>
      `,
      textBody: `Appointment Confirmed\n\nHi ${params.contactName},\n\nYour appointment with ${params.businessName} has been confirmed:\n\nDate: ${params.appointmentDate}\nTime: ${params.appointmentTime}\nService: ${params.serviceSummary}\nAddress: ${params.address}\n\nIf you need to reschedule or cancel, please reply to this email or call us.\n\nThank you,\n${params.businessName}`,
      tag: "appointment-confirmation",
    });
  }

  /**
   * Send an appointment reminder email.
   */
  async sendAppointmentReminder(params: {
    to: string;
    contactName: string;
    businessName: string;
    appointmentDate: string;
    appointmentTime: string;
  }): Promise<SendEmailResult> {
    return this.send({
      to: params.to,
      subject: `Reminder: Appointment Tomorrow - ${params.businessName}`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Reminder</h2>
          <p>Hi ${params.contactName},</p>
          <p>This is a friendly reminder that you have an appointment tomorrow with <strong>${params.businessName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Date:</strong> ${params.appointmentDate}</p>
            <p><strong>Time:</strong> ${params.appointmentTime}</p>
          </div>
          <p>If you need to reschedule, please let us know as soon as possible.</p>
          <p>Thank you,<br/>${params.businessName}</p>
        </div>
      `,
      textBody: `Appointment Reminder\n\nHi ${params.contactName},\n\nThis is a friendly reminder that you have an appointment tomorrow with ${params.businessName}.\n\nDate: ${params.appointmentDate}\nTime: ${params.appointmentTime}\n\nIf you need to reschedule, please let us know as soon as possible.\n\nThank you,\n${params.businessName}`,
      tag: "appointment-reminder",
    });
  }
}
