/**
 * Vapi.ai integration for managed AI voice agents.
 * Vapi handles speech-to-text, text-to-speech, and telephony infrastructure.
 * MyBizOS provides the AI brain (Claude) and Vapi handles the voice layer.
 */
export interface VapiConfig {
    apiKey: string;
    baseUrl?: string;
}
export interface VapiAssistantConfig {
    name: string;
    firstMessage: string;
    model: {
        provider: "anthropic";
        model: string;
        systemPrompt: string;
        temperature?: number;
        maxTokens?: number;
        tools?: VapiToolDefinition[];
    };
    voice: {
        provider: "11labs" | "deepgram" | "playht";
        voiceId: string;
    };
    serverUrl: string;
    endCallMessage?: string;
    maxDurationSeconds?: number;
    silenceTimeoutSeconds?: number;
    interruptionsEnabled?: boolean;
    recordingEnabled?: boolean;
    complianceSettings?: {
        hipaaEnabled?: boolean;
        recordingDisclosure?: string;
    };
}
export interface VapiToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, VapiToolParameter>;
            required?: string[];
        };
    };
}
export interface VapiToolParameter {
    type: "string" | "number" | "boolean" | "array" | "object";
    description: string;
    enum?: string[];
    items?: {
        type: string;
    };
}
export interface VapiPhoneNumberConfig {
    provider: "twilio";
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
    assistantId: string;
}
export interface VapiAssistant {
    id: string;
    name: string;
    model: {
        provider: string;
        model: string;
        systemPrompt: string;
    };
    voice: {
        provider: string;
        voiceId: string;
    };
    firstMessage: string;
    createdAt: string;
    updatedAt: string;
}
export interface VapiPhoneNumber {
    id: string;
    number: string;
    assistantId: string;
    provider: string;
    createdAt: string;
}
export interface VapiCall {
    id: string;
    assistantId: string;
    phoneNumberId: string;
    type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
    status: "queued" | "ringing" | "in-progress" | "forwarding" | "ended";
    startedAt: string;
    endedAt: string;
    endedReason: string;
    duration: number;
    cost: number;
    transcript: string;
    messages: VapiMessage[];
    recordingUrl: string;
    summary: string;
    phoneNumber: {
        id: string;
        number: string;
    };
    customer: {
        number: string;
    };
}
export interface VapiMessage {
    role: "assistant" | "user" | "system" | "function_call" | "function_result";
    message: string;
    time: number;
    secondsFromStart: number;
}
export interface VapiCallListFilters {
    limit?: number;
    createdAtGt?: string;
    createdAtLt?: string;
    createdAtGe?: string;
    createdAtLe?: string;
}
/**
 * Pre-defined tool schemas for common MyBizOS voice agent functions.
 * Attach these to an assistant to enable function calling during voice calls.
 */
export declare const VAPI_TOOL_SCHEMAS: Record<string, VapiToolDefinition>;
/**
 * Vapi.ai client for managing AI voice assistants, phone numbers, and call history.
 */
export declare class VapiClient {
    private apiKey;
    private baseUrl;
    constructor(config: VapiConfig);
    /**
     * Create a new AI voice assistant.
     */
    createAssistant(config: VapiAssistantConfig): Promise<VapiAssistant>;
    /**
     * Update an existing assistant's configuration.
     */
    updateAssistant(assistantId: string, updates: Partial<VapiAssistantConfig>): Promise<VapiAssistant>;
    /**
     * Delete an assistant.
     */
    deleteAssistant(assistantId: string): Promise<void>;
    /**
     * Get an assistant by ID.
     */
    getAssistant(assistantId: string): Promise<VapiAssistant>;
    /**
     * Get detailed call information including transcript.
     */
    getCall(callId: string): Promise<VapiCall>;
    /**
     * List calls for an assistant, with optional filters.
     */
    listCalls(assistantId: string, filters?: VapiCallListFilters): Promise<VapiCall[]>;
    /**
     * Import a Twilio phone number and attach it to an assistant.
     */
    createPhoneNumber(config: VapiPhoneNumberConfig): Promise<VapiPhoneNumber>;
    /**
     * List all phone numbers.
     */
    listPhoneNumbers(): Promise<VapiPhoneNumber[]>;
    /**
     * Delete a phone number.
     */
    deletePhoneNumber(phoneNumberId: string): Promise<void>;
    private request;
}
//# sourceMappingURL=index.d.ts.map