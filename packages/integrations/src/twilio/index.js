import Twilio from "twilio";
import crypto from "node:crypto";
// ─── Client ──────────────────────────────────────────────────────────────────
/**
 * Twilio client wrapper for SMS, MMS, voice, and webhook handling.
 * Used for sending/receiving SMS/MMS and initiating outbound calls.
 */
export class TwilioClient {
    client;
    accountSid;
    authToken;
    defaultFromNumber;
    constructor(config) {
        this.accountSid = config.accountSid;
        this.authToken = config.authToken;
        this.client = Twilio(config.accountSid, config.authToken);
        this.defaultFromNumber = config.defaultFromNumber;
    }
    /**
     * Send an SMS message via Twilio REST API.
     */
    async sendSms(to, body, from) {
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
    async sendMms(to, body, mediaUrls, from) {
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
    async makeCall(options) {
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
    validateWebhook(signature, url, params) {
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
            return crypto.timingSafeEqual(Buffer.from(signature, "base64"), Buffer.from(expectedSignature, "base64"));
        }
        catch {
            return false;
        }
    }
    /**
     * Parse an inbound SMS webhook payload from Twilio.
     */
    parseInboundSms(body) {
        const numMedia = parseInt(body["NumMedia"] ?? "0", 10);
        const mediaUrls = [];
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
    parseInboundCall(body) {
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
    generateTwiml(actions) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
        xml += this.renderTwimlActions(actions, 1);
        xml += "</Response>";
        return xml;
    }
    /**
     * Look up a phone number to validate and get carrier info.
     */
    async lookupNumber(phoneNumber) {
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
    static async validateCredentials(accountSid, authToken) {
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
    static async listPhoneNumbers(accountSid, authToken) {
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
    static async configureWebhooks(accountSid, authToken, numberSid, voiceUrl, smsUrl) {
        const client = Twilio(accountSid, authToken);
        await client.incomingPhoneNumbers(numberSid).update({
            voiceUrl,
            voiceMethod: "POST",
            smsUrl,
            smsMethod: "POST",
        });
    }
    // ─── Model B: Subaccount Management ────────────────────────────────────
    // All methods use the MASTER account credentials to manage customer subaccounts.
    // Customers never see Twilio — they just click "Get a Number" in MyBizOS.
    /**
     * Create a Twilio subaccount for a customer org.
     * Uses the master account to create a child account.
     */
    static async createSubaccount(masterSid, masterAuthToken, friendlyName) {
        const client = Twilio(masterSid, masterAuthToken);
        const account = await client.api.v2010.accounts.create({
            friendlyName,
        });
        return {
            sid: account.sid,
            authToken: account.authToken,
            friendlyName: account.friendlyName,
            status: account.status,
        };
    }
    /**
     * Search available phone numbers in a country.
     * Searches against the master account's available number pool.
     */
    static async searchAvailableNumbers(masterSid, masterAuthToken, countryCode, type, areaCode) {
        const client = Twilio(masterSid, masterAuthToken);
        const searchParams = {
            limit: 20,
        };
        if (areaCode) {
            searchParams["areaCode"] = areaCode;
        }
        let numbers;
        switch (type) {
            case "local":
                numbers = await client
                    .availablePhoneNumbers(countryCode)
                    .local.list(searchParams);
                break;
            case "mobile":
                numbers = await client
                    .availablePhoneNumbers(countryCode)
                    .mobile.list(searchParams);
                break;
            case "tollFree":
                numbers = await client
                    .availablePhoneNumbers(countryCode)
                    .tollFree.list(searchParams);
                break;
        }
        return numbers.map((num) => ({
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName,
            locality: num.locality ?? "",
            region: num.region ?? "",
            isoCountry: num.isoCountry,
            capabilities: {
                voice: num.capabilities?.voice ?? false,
                sms: num.capabilities?.sms ?? false,
                mms: num.capabilities?.mms ?? false,
            },
        }));
    }
    /**
     * Purchase a phone number under the master account, then transfer it
     * to a customer subaccount. Configures webhooks to point to MyBizOS.
     */
    static async purchaseNumber(masterSid, masterAuthToken, phoneNumber, subaccountSid, webhookBaseUrl) {
        const client = Twilio(masterSid, masterAuthToken);
        // Purchase the number under the master account
        const purchased = await client.incomingPhoneNumbers.create({
            phoneNumber,
            voiceUrl: `${webhookBaseUrl}/webhooks/twilio/voice`,
            voiceMethod: "POST",
            smsUrl: `${webhookBaseUrl}/webhooks/twilio/sms`,
            smsMethod: "POST",
            statusCallback: `${webhookBaseUrl}/webhooks/twilio/status`,
            statusCallbackMethod: "POST",
        });
        // Transfer the number to the subaccount
        await client.incomingPhoneNumbers(purchased.sid).update({
            accountSid: subaccountSid,
        });
        return {
            sid: purchased.sid,
            phoneNumber: purchased.phoneNumber,
            friendlyName: purchased.friendlyName,
            capabilities: {
                voice: purchased.capabilities?.voice ?? false,
                sms: purchased.capabilities?.sms ?? false,
                mms: purchased.capabilities?.mms ?? false,
            },
        };
    }
    /**
     * Release a phone number from a subaccount.
     * Uses the master account credentials to delete the number.
     */
    static async releaseNumber(masterSid, masterAuthToken, numberSid, subaccountSid) {
        // Use master credentials but operate on the subaccount's number
        const client = Twilio(masterSid, masterAuthToken, {
            accountSid: subaccountSid,
        });
        await client.incomingPhoneNumbers(numberSid).remove();
    }
    /**
     * List all phone numbers belonging to a subaccount.
     */
    static async listSubaccountNumbers(masterSid, masterAuthToken, subaccountSid) {
        // Use master credentials to access the subaccount
        const client = Twilio(masterSid, masterAuthToken, {
            accountSid: subaccountSid,
        });
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
     * Suspend a subaccount (sets status to 'suspended').
     * The subaccount can be reactivated later.
     */
    static async suspendSubaccount(masterSid, masterAuthToken, subaccountSid) {
        const client = Twilio(masterSid, masterAuthToken);
        await client.api.v2010.accounts(subaccountSid).update({
            status: "suspended",
        });
    }
    /**
     * Close a subaccount permanently (sets status to 'closed').
     * All numbers will be released. This cannot be undone.
     */
    static async closeSubaccount(masterSid, masterAuthToken, subaccountSid) {
        const client = Twilio(masterSid, masterAuthToken);
        await client.api.v2010.accounts(subaccountSid).update({
            status: "closed",
        });
    }
    // ─── Private Helpers ─────────────────────────────────────────────────────
    renderTwimlActions(actions, indent) {
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
                    }
                    else {
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
    buildAttrs(attrs) {
        let result = "";
        for (const [key, value] of Object.entries(attrs)) {
            if (value !== undefined) {
                result += ` ${key}="${this.escapeXml(String(value))}"`;
            }
        }
        return result;
    }
    escapeXml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
}
//# sourceMappingURL=index.js.map