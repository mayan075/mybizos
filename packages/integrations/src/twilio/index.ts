import Twilio from "twilio";
import crypto from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  defaultFromNumber: string;
}

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  dateCreated: string;
}

export interface SendMmsOptions {
  to: string;
  body: string;
  mediaUrls: string[];
  from?: string;
  statusCallback?: string;
}

export interface SendMmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  dateCreated: string;
  numMedia: string;
}

export interface MakeCallOptions {
  to: string;
  from?: string;
  url: string;
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

export interface InboundSms {
  from: string;
  to: string;
  body: string;
  mediaUrls: string[];
  messageSid: string;
}

export interface InboundCall {
  from: string;
  to: string;
  callSid: string;
  callStatus: string;
}

export type TwimlAction =
  | { type: "say"; text: string; voice?: string; language?: string }
  | { type: "play"; url: string }
  | { type: "gather"; input?: string; timeout?: number; numDigits?: number; action?: string; speechTimeout?: string; children?: TwimlAction[] }
  | { type: "dial"; number: string; callerId?: string; timeout?: number; record?: string }
  | { type: "redirect"; url: string }
  | { type: "hangup" }
  | { type: "pause"; length?: number }
  | { type: "record"; action?: string; maxLength?: number; transcribe?: boolean };

export interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  smsEnabled: boolean;
  voiceEnabled: boolean;
}

export interface TwilioAccountInfo {
  sid: string;
  friendlyName: string;
  status: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Twilio client wrapper for SMS, MMS, voice, and webhook handling.
 * Used for sending/receiving SMS/MMS and initiating outbound calls.
 */
export class TwilioClient {
  private client: Twilio.Twilio;
  private accountSid: string;
  private authToken: string;
  private defaultFromNumber: string;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.client = Twilio(config.accountSid, config.authToken);
    this.defaultFromNumber = config.defaultFromNumber;
  }

  /**
   * Send an SMS message via Twilio REST API.
   */
  async sendSms(to: string, body: string, from?: string): Promise<SendSmsResult> {
    const message = await this.client.messages.create({
      to,
      from: from ?? this.defaultFromNumber,
      body,
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
   * Send an MMS message with media attachments via Twilio REST API.
   */
  async sendMms(
    to: string,
    body: string,
    mediaUrls: string[],
    from?: string,
  ): Promise<SendMmsResult> {
    const message = await this.client.messages.create({
      to,
      from: from ?? this.defaultFromNumber,
      body,
      mediaUrl: mediaUrls,
    });

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated?.toISOString() ?? new Date().toISOString(),
      numMedia: message.numMedia,
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
   * Validate an incoming Twilio webhook request signature.
   * This prevents spoofed webhook payloads.
   *
   * @param signature - The X-Twilio-Signature header value
   * @param url - The full URL of the webhook endpoint (including https://)
   * @param params - The POST body params as a flat key-value object
   * @returns true if the signature is valid
   */
  validateWebhook(
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean {
    // Sort the POST parameters alphabetically by key and concatenate key+value
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    // Create the expected signature using HMAC-SHA1
    const expectedSignature = crypto
      .createHmac("sha1", this.authToken)
      .update(data, "utf-8")
      .digest("base64");

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "base64"),
        Buffer.from(expectedSignature, "base64"),
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse an inbound SMS webhook payload from Twilio.
   */
  parseInboundSms(body: Record<string, string>): InboundSms {
    const numMedia = parseInt(body["NumMedia"] ?? "0", 10);
    const mediaUrls: string[] = [];

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = body[`MediaUrl${i}`];
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      }
    }

    return {
      from: body["From"] ?? "",
      to: body["To"] ?? "",
      body: body["Body"] ?? "",
      mediaUrls,
      messageSid: body["MessageSid"] ?? "",
    };
  }

  /**
   * Parse an inbound voice call webhook payload from Twilio.
   */
  parseInboundCall(body: Record<string, string>): InboundCall {
    return {
      from: body["From"] ?? "",
      to: body["To"] ?? "",
      callSid: body["CallSid"] ?? "",
      callStatus: body["CallStatus"] ?? "",
    };
  }

  /**
   * Generate a TwiML XML response from a list of actions.
   * Useful for responding to voice webhooks dynamically.
   */
  generateTwiml(actions: TwimlAction[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
    xml += this.renderTwimlActions(actions, 1);
    xml += "</Response>";
    return xml;
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

  // ─── Phone Number Management ─────────────────────────────────────────────

  /**
   * Validate Twilio credentials by fetching account info.
   * Returns account details if valid, throws on invalid credentials.
   */
  static async validateCredentials(
    accountSid: string,
    authToken: string,
  ): Promise<TwilioAccountInfo> {
    const client = Twilio(accountSid, authToken);
    const account = await client.api.v2010.accounts(accountSid).fetch();

    return {
      sid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
    };
  }

  /**
   * List all incoming phone numbers for a Twilio account.
   */
  static async listPhoneNumbers(
    accountSid: string,
    authToken: string,
  ): Promise<TwilioPhoneNumber[]> {
    const client = Twilio(accountSid, authToken);
    const numbers = await client.incomingPhoneNumbers.list();

    return numbers.map((num) => ({
      sid: num.sid,
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      smsEnabled: num.capabilities?.sms ?? false,
      voiceEnabled: num.capabilities?.voice ?? false,
    }));
  }

  /**
   * Configure webhook URLs on a Twilio phone number so inbound
   * calls and SMS are routed to our API.
   */
  static async configureWebhooks(
    accountSid: string,
    authToken: string,
    numberSid: string,
    voiceUrl: string,
    smsUrl: string,
  ): Promise<void> {
    const client = Twilio(accountSid, authToken);
    await client.incomingPhoneNumbers(numberSid).update({
      voiceUrl,
      voiceMethod: "POST",
      smsUrl,
      smsMethod: "POST",
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private renderTwimlActions(actions: TwimlAction[], indent: number): string {
    const pad = "  ".repeat(indent);
    let xml = "";

    for (const action of actions) {
      switch (action.type) {
        case "say": {
          const attrs = this.buildAttrs({
            voice: action.voice,
            language: action.language,
          });
          xml += `${pad}<Say${attrs}>${this.escapeXml(action.text)}</Say>\n`;
          break;
        }
        case "play": {
          xml += `${pad}<Play>${this.escapeXml(action.url)}</Play>\n`;
          break;
        }
        case "gather": {
          const attrs = this.buildAttrs({
            input: action.input,
            timeout: action.timeout,
            numDigits: action.numDigits,
            action: action.action,
            speechTimeout: action.speechTimeout,
          });
          if (action.children && action.children.length > 0) {
            xml += `${pad}<Gather${attrs}>\n`;
            xml += this.renderTwimlActions(action.children, indent + 1);
            xml += `${pad}</Gather>\n`;
          } else {
            xml += `${pad}<Gather${attrs}/>\n`;
          }
          break;
        }
        case "dial": {
          const attrs = this.buildAttrs({
            callerId: action.callerId,
            timeout: action.timeout,
            record: action.record,
          });
          xml += `${pad}<Dial${attrs}>${this.escapeXml(action.number)}</Dial>\n`;
          break;
        }
        case "redirect": {
          xml += `${pad}<Redirect>${this.escapeXml(action.url)}</Redirect>\n`;
          break;
        }
        case "hangup": {
          xml += `${pad}<Hangup/>\n`;
          break;
        }
        case "pause": {
          const attrs = this.buildAttrs({ length: action.length });
          xml += `${pad}<Pause${attrs}/>\n`;
          break;
        }
        case "record": {
          const attrs = this.buildAttrs({
            action: action.action,
            maxLength: action.maxLength,
            transcribe: action.transcribe,
          });
          xml += `${pad}<Record${attrs}/>\n`;
          break;
        }
      }
    }

    return xml;
  }

  private buildAttrs(attrs: Record<string, string | number | boolean | undefined>): string {
    let result = "";
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined) {
        result += ` ${key}="${this.escapeXml(String(value))}"`;
      }
    }
    return result;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
