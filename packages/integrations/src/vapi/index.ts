/**
 * Vapi.ai integration for managed AI voice agents.
 * Vapi handles speech-to-text, text-to-speech, and telephony infrastructure.
 * HararAI provides the AI brain (Claude) and Vapi handles the voice layer.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

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
  items?: { type: string };
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

interface VapiApiError {
  message: string;
  error: string;
  statusCode: number;
}

// ─── Tool Schemas ────────────────────────────────────────────────────────────

/**
 * Pre-defined tool schemas for common HararAI voice agent functions.
 * Attach these to an assistant to enable function calling during voice calls.
 */
export const VAPI_TOOL_SCHEMAS: Record<string, VapiToolDefinition> = {
  bookAppointment: {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book a service appointment for the caller. Collect the service type, preferred date, preferred time, and customer name before calling this function.",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Full name of the customer",
          },
          customerPhone: {
            type: "string",
            description: "Customer phone number in E.164 format",
          },
          customerEmail: {
            type: "string",
            description: "Customer email address (optional)",
          },
          serviceType: {
            type: "string",
            description: "Type of service requested",
            enum: [
              "hvac_repair",
              "hvac_maintenance",
              "hvac_installation",
              "plumbing_repair",
              "plumbing_installation",
              "plumbing_emergency",
              "drain_cleaning",
              "water_heater",
              "general_inspection",
            ],
          },
          preferredDate: {
            type: "string",
            description: "Preferred date in YYYY-MM-DD format",
          },
          preferredTime: {
            type: "string",
            description: "Preferred time slot",
            enum: ["morning", "afternoon", "evening"],
          },
          notes: {
            type: "string",
            description: "Additional notes about the appointment or issue description",
          },
        },
        required: ["customerName", "customerPhone", "serviceType", "preferredDate", "preferredTime"],
      },
    },
  },

  checkAvailability: {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Check available appointment slots for a given date and service type. Call this before booking to present options to the caller.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check availability for in YYYY-MM-DD format",
          },
          serviceType: {
            type: "string",
            description: "Type of service requested",
            enum: [
              "hvac_repair",
              "hvac_maintenance",
              "hvac_installation",
              "plumbing_repair",
              "plumbing_installation",
              "plumbing_emergency",
              "drain_cleaning",
              "water_heater",
              "general_inspection",
            ],
          },
        },
        required: ["date", "serviceType"],
      },
    },
  },

  transferToHuman: {
    type: "function",
    function: {
      name: "transfer_to_human",
      description:
        "Transfer the call to a human agent. Use this when the caller explicitly requests a human, after 2 misunderstandings, or for emergency situations (flooding, gas leak, fire).",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for transferring to a human",
            enum: [
              "caller_request",
              "emergency",
              "complex_issue",
              "repeated_misunderstanding",
              "complaint",
              "billing_dispute",
            ],
          },
          summary: {
            type: "string",
            description: "Brief summary of the conversation so far for the human agent",
          },
          urgency: {
            type: "string",
            description: "Urgency level of the transfer",
            enum: ["low", "medium", "high", "critical"],
          },
        },
        required: ["reason", "summary"],
      },
    },
  },

  endCall: {
    type: "function",
    function: {
      name: "end_call",
      description:
        "End the phone call after the conversation is complete. Always summarize what was discussed or scheduled before ending.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for ending the call",
            enum: [
              "appointment_booked",
              "information_provided",
              "caller_request",
              "no_availability",
              "transferred",
              "voicemail",
            ],
          },
          summary: {
            type: "string",
            description: "Brief summary of the call outcome",
          },
          followUpRequired: {
            type: "boolean",
            description: "Whether a follow-up action is needed",
          },
          followUpNotes: {
            type: "string",
            description: "Notes about the follow-up if required",
          },
        },
        required: ["reason", "summary"],
      },
    },
  },
};

// ─── Client ──────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.vapi.ai";

/**
 * Vapi.ai client for managing AI voice assistants, phone numbers, and call history.
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
    const body: Record<string, unknown> = {
      name: config.name,
      firstMessage: config.firstMessage,
      model: {
        provider: config.model.provider,
        model: config.model.model,
        systemPrompt: config.model.systemPrompt,
        temperature: config.model.temperature ?? 0.7,
        maxTokens: config.model.maxTokens ?? 512,
        tools: config.model.tools,
      },
      voice: config.voice,
      serverUrl: config.serverUrl,
      endCallMessage:
        config.endCallMessage ?? "Thank you for calling. Have a great day!",
      maxDurationSeconds: config.maxDurationSeconds ?? 600,
      silenceTimeoutSeconds: config.silenceTimeoutSeconds ?? 30,
      interruptionsEnabled: config.interruptionsEnabled ?? true,
      recordingEnabled: config.recordingEnabled ?? true,
    };

    if (config.complianceSettings) {
      body["hipaaEnabled"] = config.complianceSettings.hipaaEnabled;
      body["recordingDisclosure"] =
        config.complianceSettings.recordingDisclosure;
    }

    return this.request<VapiAssistant>("POST", "/assistant", body);
  }

  /**
   * Update an existing assistant's configuration.
   */
  async updateAssistant(
    assistantId: string,
    updates: Partial<VapiAssistantConfig>,
  ): Promise<VapiAssistant> {
    return this.request<VapiAssistant>(
      "PATCH",
      `/assistant/${assistantId}`,
      updates,
    );
  }

  /**
   * Delete an assistant.
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    await this.request<void>("DELETE", `/assistant/${assistantId}`);
  }

  /**
   * Get an assistant by ID.
   */
  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    return this.request<VapiAssistant>("GET", `/assistant/${assistantId}`);
  }

  /**
   * Get detailed call information including transcript.
   */
  async getCall(callId: string): Promise<VapiCall> {
    return this.request<VapiCall>("GET", `/call/${callId}`);
  }

  /**
   * List calls for an assistant, with optional filters.
   */
  async listCalls(
    assistantId: string,
    filters?: VapiCallListFilters,
  ): Promise<VapiCall[]> {
    const params = new URLSearchParams({ assistantId });

    if (filters?.limit !== undefined) {
      params.set("limit", String(filters.limit));
    }
    if (filters?.createdAtGt) {
      params.set("createdAtGt", filters.createdAtGt);
    }
    if (filters?.createdAtLt) {
      params.set("createdAtLt", filters.createdAtLt);
    }
    if (filters?.createdAtGe) {
      params.set("createdAtGe", filters.createdAtGe);
    }
    if (filters?.createdAtLe) {
      params.set("createdAtLe", filters.createdAtLe);
    }

    return this.request<VapiCall[]>("GET", `/call?${params.toString()}`);
  }

  /**
   * Import a Twilio phone number and attach it to an assistant.
   */
  async createPhoneNumber(config: VapiPhoneNumberConfig): Promise<VapiPhoneNumber> {
    return this.request<VapiPhoneNumber>("POST", "/phone-number", {
      provider: config.provider,
      twilioAccountSid: config.twilioAccountSid,
      twilioAuthToken: config.twilioAuthToken,
      number: config.twilioPhoneNumber,
      assistantId: config.assistantId,
    });
  }

  /**
   * List all phone numbers.
   */
  async listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    return this.request<VapiPhoneNumber[]>("GET", "/phone-number");
  }

  /**
   * Delete a phone number.
   */
  async deletePhoneNumber(phoneNumberId: string): Promise<void> {
    await this.request<void>("DELETE", `/phone-number/${phoneNumberId}`);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    const options: RequestInit = { method, headers };

    if (body && (method === "POST" || method === "PATCH")) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({
        message: response.statusText,
        error: "VapiApiError",
        statusCode: response.status,
      }))) as VapiApiError;
      throw new Error(
        `Vapi API error (${response.status}): ${errorBody.message ?? response.statusText}`,
      );
    }

    // DELETE returns no content
    if (response.status === 204 || method === "DELETE") {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
