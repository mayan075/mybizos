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
export type TwimlAction = {
    type: "say";
    text: string;
    voice?: string;
    language?: string;
} | {
    type: "play";
    url: string;
} | {
    type: "gather";
    input?: string;
    timeout?: number;
    numDigits?: number;
    action?: string;
    speechTimeout?: string;
    children?: TwimlAction[];
} | {
    type: "dial";
    number: string;
    callerId?: string;
    timeout?: number;
    record?: string;
} | {
    type: "redirect";
    url: string;
} | {
    type: "hangup";
} | {
    type: "pause";
    length?: number;
} | {
    type: "record";
    action?: string;
    maxLength?: number;
    transcribe?: boolean;
};
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
export interface SubaccountInfo {
    sid: string;
    authToken: string;
    friendlyName: string;
    status: string;
}
export interface AvailableNumber {
    phoneNumber: string;
    friendlyName: string;
    locality: string;
    region: string;
    isoCountry: string;
    capabilities: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
    };
}
export interface PurchasedNumber {
    sid: string;
    phoneNumber: string;
    friendlyName: string;
    capabilities: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
    };
}
/**
 * Twilio client wrapper for SMS, MMS, voice, and webhook handling.
 * Used for sending/receiving SMS/MMS and initiating outbound calls.
 */
export declare class TwilioClient {
    private client;
    private accountSid;
    private authToken;
    private defaultFromNumber;
    constructor(config: TwilioConfig);
    /**
     * Send an SMS message via Twilio REST API.
     */
    sendSms(to: string, body: string, from?: string): Promise<SendSmsResult>;
    /**
     * Send an MMS message with media attachments via Twilio REST API.
     */
    sendMms(to: string, body: string, mediaUrls: string[], from?: string): Promise<SendMmsResult>;
    /**
     * Initiate an outbound phone call.
     */
    makeCall(options: MakeCallOptions): Promise<MakeCallResult>;
    /**
     * Validate an incoming Twilio webhook request signature.
     * This prevents spoofed webhook payloads.
     *
     * @param signature - The X-Twilio-Signature header value
     * @param url - The full URL of the webhook endpoint (including https://)
     * @param params - The POST body params as a flat key-value object
     * @returns true if the signature is valid
     */
    validateWebhook(signature: string, url: string, params: Record<string, string>): boolean;
    /**
     * Parse an inbound SMS webhook payload from Twilio.
     */
    parseInboundSms(body: Record<string, string>): InboundSms;
    /**
     * Parse an inbound voice call webhook payload from Twilio.
     */
    parseInboundCall(body: Record<string, string>): InboundCall;
    /**
     * Generate a TwiML XML response from a list of actions.
     * Useful for responding to voice webhooks dynamically.
     */
    generateTwiml(actions: TwimlAction[]): string;
    /**
     * Look up a phone number to validate and get carrier info.
     */
    lookupNumber(phoneNumber: string): Promise<{
        phoneNumber: string;
        countryCode: string;
        valid: boolean;
    }>;
    /**
     * Validate Twilio credentials by fetching account info.
     * Returns account details if valid, throws on invalid credentials.
     */
    static validateCredentials(accountSid: string, authToken: string): Promise<TwilioAccountInfo>;
    /**
     * List all incoming phone numbers for a Twilio account.
     */
    static listPhoneNumbers(accountSid: string, authToken: string): Promise<TwilioPhoneNumber[]>;
    /**
     * Configure webhook URLs on a Twilio phone number so inbound
     * calls and SMS are routed to our API.
     */
    static configureWebhooks(accountSid: string, authToken: string, numberSid: string, voiceUrl: string, smsUrl: string): Promise<void>;
    /**
     * Create a Twilio subaccount for a customer org.
     * Uses the master account to create a child account.
     */
    static createSubaccount(masterSid: string, masterAuthToken: string, friendlyName: string): Promise<SubaccountInfo>;
    /**
     * Search available phone numbers in a country.
     * Searches against the master account's available number pool.
     */
    static searchAvailableNumbers(masterSid: string, masterAuthToken: string, countryCode: string, type: "local" | "mobile" | "tollFree", areaCode?: string): Promise<AvailableNumber[]>;
    /**
     * Purchase a phone number under the master account, then transfer it
     * to a customer subaccount. Configures webhooks to point to MyBizOS.
     */
    static purchaseNumber(masterSid: string, masterAuthToken: string, phoneNumber: string, subaccountSid: string, webhookBaseUrl: string): Promise<PurchasedNumber>;
    /**
     * Release a phone number from a subaccount.
     * Uses the master account credentials to delete the number.
     */
    static releaseNumber(masterSid: string, masterAuthToken: string, numberSid: string, subaccountSid: string): Promise<void>;
    /**
     * List all phone numbers belonging to a subaccount.
     */
    static listSubaccountNumbers(masterSid: string, masterAuthToken: string, subaccountSid: string): Promise<TwilioPhoneNumber[]>;
    /**
     * Suspend a subaccount (sets status to 'suspended').
     * The subaccount can be reactivated later.
     */
    static suspendSubaccount(masterSid: string, masterAuthToken: string, subaccountSid: string): Promise<void>;
    /**
     * Close a subaccount permanently (sets status to 'closed').
     * All numbers will be released. This cannot be undone.
     */
    static closeSubaccount(masterSid: string, masterAuthToken: string, subaccountSid: string): Promise<void>;
    private renderTwimlActions;
    private buildAttrs;
    private escapeXml;
}
//# sourceMappingURL=index.d.ts.map