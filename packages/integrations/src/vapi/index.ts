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
  };
  voice: {
    provider: "11labs" | "deepgram" | "playht";
    voiceId: string;
  };
  serverUrl: string; // Webhook URL for function calls
  endCallMessage?: string;
  maxDurationSeconds?: number;
  silenceTimeoutSeconds?: number;
  interruptionsEnabled?: boolean;
  recordingEnabled?: boolean;
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
  createdAt: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  assistantId: string;
}

const DEFAULT_BASE_URL = "https://api.vapi.ai";

/**
 * Vapi.ai client for managing AI voice assistants and phone numbers.
 */
export class VapiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: VapiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /**
   * Create a new AI voice assistant.
   */
  async createAssistant(config: VapiAssistantConfig): Promise<VapiAssistant> {
    const response = await fetch(`${this.baseUrl}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: config.name,
        firstMessage: config.firstMessage,
        model: {
          provider: config.model.provider,
          model: config.model.model,
          systemPrompt: config.model.systemPrompt,
          temperature: config.model.temperature ?? 0.7,
          maxTokens: config.model.maxTokens ?? 512,
        },
        voice: config.voice,
        serverUrl: config.serverUrl,
        endCallMessage: config.endCallMessage ?? "Thank you for calling. Have a great day!",
        maxDurationSeconds: config.maxDurationSeconds ?? 600,
        silenceTimeoutSeconds: config.silenceTimeoutSeconds ?? 30,
        interruptionsEnabled: config.interruptionsEnabled ?? true,
        recordingEnabled: config.recordingEnabled ?? true,
      }),
    });

    return (await response.json()) as VapiAssistant;
  }

  /**
   * Update an existing assistant's configuration.
   */
  async updateAssistant(
    assistantId: string,
    updates: Partial<VapiAssistantConfig>,
  ): Promise<VapiAssistant> {
    const response = await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    return (await response.json()) as VapiAssistant;
  }

  /**
   * Get an assistant by ID.
   */
  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    const response = await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    return (await response.json()) as VapiAssistant;
  }

  /**
   * Delete an assistant.
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }

  /**
   * Import a Twilio phone number and attach it to an assistant.
   */
  async importPhoneNumber(config: VapiPhoneNumberConfig): Promise<VapiPhoneNumber> {
    const response = await fetch(`${this.baseUrl}/phone-number`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: config.provider,
        twilioAccountSid: config.twilioAccountSid,
        twilioAuthToken: config.twilioAuthToken,
        number: config.twilioPhoneNumber,
        assistantId: config.assistantId,
      }),
    });

    return (await response.json()) as VapiPhoneNumber;
  }

  /**
   * List all phone numbers.
   */
  async listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    const response = await fetch(`${this.baseUrl}/phone-number`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    return (await response.json()) as VapiPhoneNumber[];
  }
}
