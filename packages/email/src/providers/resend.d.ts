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
/**
 * Resend email provider for transactional emails.
 * Used for appointment confirmations, reminders, review requests,
 * invoices, and welcome emails.
 */
export declare class ResendProvider {
    private client;
    private defaultFrom;
    constructor(config: ResendConfig);
    /**
     * Send a single transactional email.
     */
    sendEmail(from: string | undefined, to: string, subject: string, htmlBody?: string, textBody?: string, tag?: string): Promise<SendEmailResult>;
    /**
     * Send a batch of up to 100 emails in a single API call.
     * Resend batch limit is 100 emails per request.
     */
    sendBatch(messages: BatchMessage[]): Promise<BatchSendResult>;
    /**
     * Legacy send method for backward compatibility.
     */
    send(options: SendEmailOptions): Promise<SendEmailResult>;
}
/**
 * Appointment confirmation email template.
 */
export declare function appointmentConfirmationHtml(businessName: string, contactName: string, service: string, date: string, time: string, address: string): string;
/**
 * Appointment reminder email template (sent 24h before).
 */
export declare function appointmentReminderHtml(businessName: string, contactName: string, service: string, date: string, time: string): string;
/**
 * Review request email template (sent after service completion).
 */
export declare function reviewRequestHtml(businessName: string, contactName: string, reviewUrl: string, feedbackUrl: string): string;
/**
 * Invoice sent email template.
 */
export declare function invoiceSentHtml(businessName: string, contactName: string, amount: string, dueDate: string, paymentLink: string): string;
/**
 * Password reset email template.
 */
export declare function passwordResetHtml(resetUrl: string): string;
/**
 * Email verification template (sent during registration).
 */
export declare function emailVerificationHtml(verifyUrl: string): string;
/**
 * Welcome email template (sent when a new contact/user is created).
 */
export declare function welcomeHtml(businessName: string, userName: string): string;
//# sourceMappingURL=resend.d.ts.map