import Twilio from "twilio";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  defaultFromNumber: string;
}

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[];
  statusCallback?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  dateCreated: string;
}

export interface MakeCallOptions {
  to: string;
  from?: string;
  url: string; // TwiML URL or Vapi webhook
  statusCallback?: string;
  record?: boolean;
  timeout?: number;
}

export interface MakeCallResult {
  sid: string;
  status: string;
  to: string;
  from: string;
}

/**
 * Twilio client wrapper for SMS and voice capabilities.
 * Used for sending/receiving SMS and initiating outbound calls.
 */
export class TwilioClient {
  private client: Twilio.Twilio;
  private defaultFromNumber: string;

  constructor(config: TwilioConfig) {
    this.client = Twilio(config.accountSid, config.authToken);
    this.defaultFromNumber = config.defaultFromNumber;
  }

  /**
   * Send an SMS message.
   */
  async sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
    const message = await this.client.messages.create({
      to: options.to,
      from: options.from ?? this.defaultFromNumber,
      body: options.body,
      mediaUrl: options.mediaUrls,
      statusCallback: options.statusCallback,
    });

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Initiate an outbound phone call.
   */
  async makeCall(options: MakeCallOptions): Promise<MakeCallResult> {
    const call = await this.client.calls.create({
      to: options.to,
      from: options.from ?? this.defaultFromNumber,
      url: options.url,
      statusCallback: options.statusCallback,
      record: options.record ?? true,
      timeout: options.timeout ?? 30,
    });

    return {
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
    };
  }

  /**
   * Look up a phone number to validate and get carrier info.
   */
  async lookupNumber(phoneNumber: string): Promise<{
    phoneNumber: string;
    countryCode: string;
    valid: boolean;
  }> {
    const lookup = await this.client.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch();

    return {
      phoneNumber: lookup.phoneNumber,
      countryCode: lookup.countryCode,
      valid: lookup.valid,
    };
  }
}
