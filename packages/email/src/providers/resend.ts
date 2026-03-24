import { Resend } from "resend";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResendConfig {
  apiKey: string;
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
}

export interface SendEmailResult {
  messageId: string;
  submittedAt: string;
  to: string;
}

export interface BatchMessage {
  from?: string;
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  tag?: string;
  metadata?: Record<string, string>;
}

export interface BatchSendResult {
  results: SendEmailResult[];
  totalSent: number;
  totalFailed: number;
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Resend email provider for transactional emails.
 * Used for appointment confirmations, reminders, review requests,
 * invoices, and welcome emails.
 */
export class ResendProvider {
  private client: Resend;
  private defaultFrom: string;

  constructor(config: ResendConfig) {
    this.client = new Resend(config.apiKey);
    this.defaultFrom = config.defaultFrom;
  }

  /**
   * Send a single transactional email.
   */
  async sendEmail(
    from: string | undefined,
    to: string,
    subject: string,
    htmlBody?: string,
    textBody?: string,
    tag?: string,
  ): Promise<SendEmailResult> {
    const payload: Record<string, unknown> = {
      from: from ?? this.defaultFrom,
      to: [to],
      subject,
    };
    if (htmlBody) payload.html = htmlBody;
    if (textBody) payload.text = textBody;
    if (tag) payload.tags = [{ name: "category", value: tag }];
    const { data, error } = await this.client.emails.send(payload as any);

    if (error) {
      throw new Error(`Resend email error: ${error.message}`);
    }

    return {
      messageId: data?.id ?? "",
      submittedAt: new Date().toISOString(),
      to,
    };
  }

  /**
   * Send a batch of up to 100 emails in a single API call.
   * Resend batch limit is 100 emails per request.
   */
  async sendBatch(messages: BatchMessage[]): Promise<BatchSendResult> {
    const MAX_BATCH_SIZE = 100;

    if (messages.length > MAX_BATCH_SIZE) {
      throw new Error(
        `Batch size ${messages.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      );
    }

    const resendMessages = messages.map((msg) => ({
      from: msg.from ?? this.defaultFrom,
      to: [msg.to],
      subject: msg.subject,
      html: msg.htmlBody ?? undefined,
      text: msg.textBody ?? undefined,
      tags: msg.tag ? [{ name: "category", value: msg.tag }] : undefined,
    }));

    const { data, error } = await this.client.batch.send(resendMessages);

    if (error) {
      throw new Error(`Resend batch error: ${error.message}`);
    }

    const results: SendEmailResult[] = (data?.data ?? []).map((item, idx) => ({
      messageId: item.id,
      submittedAt: new Date().toISOString(),
      to: messages[idx]?.to ?? "",
    }));

    return {
      results,
      totalSent: results.length,
      totalFailed: messages.length - results.length,
    };
  }

  /**
   * Legacy send method for backward compatibility.
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    return this.sendEmail(
      options.from,
      options.to,
      options.subject,
      options.htmlBody,
      options.textBody,
      options.tag,
    );
  }
}

// ─── Email HTML Templates ────────────────────────────────────────────────────
//
// Each template returns responsive HTML with:
// - Professional design matching home services branding
// - CTA button
// - Unsubscribe link
// - Business branding (name passed as param)
// - Mobile-responsive layout

/**
 * Shared email layout wrapper with responsive design, branding, and footer.
 */
function emailLayout(
  businessName: string,
  preheader: string,
  bodyContent: string,
  unsubscribeUrl?: string,
): string {
  const year = new Date().getFullYear();
  const unsub = unsubscribeUrl ?? "{{unsubscribe_url}}";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${businessName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; width: 100%; background-color: #f4f4f7; -webkit-font-smoothing: antialiased; }
    table { border-spacing: 0; border-collapse: collapse; }
    td { padding: 0; }
    img { border: 0; }
    .email-wrapper { width: 100%; background-color: #f4f4f7; }
    .email-content { width: 100%; max-width: 600px; margin: 0 auto; }
    .email-body { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .email-header { background-color: #1a56db; padding: 24px 32px; text-align: center; }
    .email-header h1 { color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; }
    .email-inner { padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333; }
    .email-inner h2 { font-size: 20px; color: #1a1a1a; margin: 0 0 16px 0; }
    .email-inner p { margin: 0 0 16px 0; }
    .detail-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; margin-bottom: 8px; }
    .detail-label { font-weight: 600; color: #475569; min-width: 80px; }
    .detail-value { color: #1a1a1a; }
    .cta-button { display: inline-block; background-color: #1a56db; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .cta-button:hover { background-color: #1648b8; }
    .cta-wrapper { text-align: center; margin: 24px 0; }
    .email-footer { text-align: center; padding: 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .email-footer a { color: #64748b; text-decoration: underline; }
    .preheader { display: none; max-width: 0; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #f4f4f7; }
    @media only screen and (max-width: 620px) {
      .email-content { width: 100% !important; }
      .email-inner { padding: 24px 20px !important; }
      .email-header { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <table class="email-wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table class="email-content" role="presentation" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div class="email-body">
                <div class="email-header">
                  <h1>${businessName}</h1>
                </div>
                <div class="email-inner">
                  ${bodyContent}
                </div>
              </div>
              <div class="email-footer">
                <p>&copy; ${year} ${businessName}. All rights reserved.</p>
                <p>
                  <a href="${unsub}">Unsubscribe</a> &middot;
                  <a href="{{preferences_url}}">Email Preferences</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Appointment confirmation email template.
 */
export function appointmentConfirmationHtml(
  businessName: string,
  contactName: string,
  service: string,
  date: string,
  time: string,
  address: string,
): string {
  const body = `
    <h2>Appointment Confirmed</h2>
    <p>Hi ${contactName},</p>
    <p>Great news! Your appointment with <strong>${businessName}</strong> has been confirmed. Here are the details:</p>
    <div class="detail-card">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569; width: 90px;">Service:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${service}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Date:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Time:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Address:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${address}</td>
        </tr>
      </table>
    </div>
    <p>Please make sure someone is available at the address during the scheduled time. Our technician will arrive within the appointment window.</p>
    <p>Need to reschedule or cancel? Reply to this email or give us a call.</p>
    <p>Thank you for choosing ${businessName}!</p>
  `;

  return emailLayout(
    businessName,
    `Your appointment with ${businessName} is confirmed for ${date} at ${time}.`,
    body,
  );
}

/**
 * Appointment reminder email template (sent 24h before).
 */
export function appointmentReminderHtml(
  businessName: string,
  contactName: string,
  service: string,
  date: string,
  time: string,
): string {
  const body = `
    <h2>Appointment Reminder</h2>
    <p>Hi ${contactName},</p>
    <p>This is a friendly reminder that you have an upcoming appointment with <strong>${businessName}</strong>:</p>
    <div class="detail-card">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569; width: 90px;">Service:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${service}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Date:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Time:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${time}</td>
        </tr>
      </table>
    </div>
    <p>Please ensure someone 18 or older is present at the service location during the appointment window.</p>
    <p>If you need to reschedule, please let us know as soon as possible so we can accommodate your needs.</p>
    <p>We look forward to seeing you!</p>
    <p>Best regards,<br><strong>${businessName}</strong></p>
  `;

  return emailLayout(
    businessName,
    `Reminder: Your ${service} appointment is coming up on ${date} at ${time}.`,
    body,
  );
}

/**
 * Review request email template (sent after service completion).
 */
export function reviewRequestHtml(
  businessName: string,
  contactName: string,
  reviewUrl: string,
  feedbackUrl: string,
): string {
  const body = `
    <h2>How did we do?</h2>
    <p>Hi ${contactName},</p>
    <p>Thank you for choosing <strong>${businessName}</strong>! We hope you had a great experience with our service.</p>
    <p>Your feedback helps us improve and helps other homeowners find reliable service providers. Would you take a moment to share your experience?</p>
    <div class="cta-wrapper">
      <a href="${reviewUrl}" class="cta-button" style="color: #ffffff;">Leave a Review</a>
    </div>
    <p style="text-align: center; color: #64748b; font-size: 13px;">It only takes about 30 seconds!</p>
    <p>If something wasn't right, we want to make it better. Please <a href="${feedbackUrl}" style="color: #1a56db;">share your concerns with us directly</a> so we can address them right away.</p>
    <p>Thank you for your trust in ${businessName}.</p>
  `;

  return emailLayout(
    businessName,
    `${contactName}, how was your experience with ${businessName}? We'd love your feedback.`,
    body,
  );
}

/**
 * Invoice sent email template.
 */
export function invoiceSentHtml(
  businessName: string,
  contactName: string,
  amount: string,
  dueDate: string,
  paymentLink: string,
): string {
  const body = `
    <h2>Invoice from ${businessName}</h2>
    <p>Hi ${contactName},</p>
    <p>Please find your invoice details below:</p>
    <div class="detail-card">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569; width: 110px;">Amount Due:</td>
          <td style="padding: 6px 0; color: #1a1a1a; font-size: 18px; font-weight: 700;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #475569;">Due Date:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${dueDate}</td>
        </tr>
      </table>
    </div>
    <div class="cta-wrapper">
      <a href="${paymentLink}" class="cta-button" style="color: #ffffff;">Pay Now</a>
    </div>
    <p style="text-align: center; color: #64748b; font-size: 13px;">Secure payment powered by Stripe</p>
    <p>If you have any questions about this invoice, please don't hesitate to reply to this email or give us a call.</p>
    <p>Thank you for your business!</p>
    <p>Best regards,<br><strong>${businessName}</strong></p>
  `;

  return emailLayout(
    businessName,
    `You have a new invoice for ${amount} from ${businessName}, due ${dueDate}.`,
    body,
  );
}

/**
 * Welcome email template (sent when a new contact/user is created).
 */
export function welcomeHtml(
  businessName: string,
  userName: string,
): string {
  const body = `
    <h2>Welcome to ${businessName}!</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for choosing <strong>${businessName}</strong> for your home service needs. We're excited to have you as a customer!</p>
    <p>Here's what you can expect from us:</p>
    <div class="detail-card">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 8px 0; color: #1a1a1a;">
            <strong style="color: #1a56db;">&#10003;</strong>&nbsp;&nbsp;24/7 AI-powered phone support for scheduling
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1a1a1a;">
            <strong style="color: #1a56db;">&#10003;</strong>&nbsp;&nbsp;Appointment reminders via email and SMS
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1a1a1a;">
            <strong style="color: #1a56db;">&#10003;</strong>&nbsp;&nbsp;Licensed and insured technicians
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1a1a1a;">
            <strong style="color: #1a56db;">&#10003;</strong>&nbsp;&nbsp;Transparent pricing with no hidden fees
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1a1a1a;">
            <strong style="color: #1a56db;">&#10003;</strong>&nbsp;&nbsp;Satisfaction guaranteed on every job
          </td>
        </tr>
      </table>
    </div>
    <p>Need service? Simply give us a call or reply to this email. Our AI assistant is available around the clock to help you schedule appointments.</p>
    <p>We look forward to serving you!</p>
    <p>Best regards,<br><strong>The ${businessName} Team</strong></p>
  `;

  return emailLayout(
    businessName,
    `Welcome to ${businessName}! We're excited to have you as a customer.`,
    body,
  );
}
