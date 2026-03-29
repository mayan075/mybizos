/**
 * Gemini 3.1 Flash Live API — TypeScript types for real-time voice sessions.
 *
 * Model: gemini-3.1-flash-live-preview
 * Protocol: WebSocket (WSS)
 * Input: 16-bit PCM 16kHz audio, text, images
 * Output: 16-bit PCM 24kHz audio
 */

// ─── Session Configuration ──────────────────────────────────────────────────

export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  baseWsUrl?: string;
}

export interface GeminiSessionConfig {
  responseModalities: ('AUDIO' | 'TEXT')[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  tools?: GeminiToolConfig[];
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: string;
      };
    };
    languageCode?: string;
  };
  inputAudioTranscription?: Record<string, never>;
  outputAudioTranscription?: Record<string, never>;
  realtimeInputConfig?: {
    automaticActivityDetection?: {
      disabled?: boolean;
      startOfSpeechSensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
      endOfSpeechSensitivity?: 'LOW' | 'MEDIUM' | 'HIGH';
      prefixPaddingMs?: number;
      silenceDurationMs?: number;
    };
  };
  generationConfig?: {
    thinkingConfig?: {
      thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
      includeThoughts?: boolean;
    };
  };
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

export interface GeminiToolConfig {
  functionDeclarations: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, GeminiParameterSchema>;
    required?: string[];
  };
}

export interface GeminiParameterSchema {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description: string;
  enum?: string[];
  items?: { type: string };
}

// ─── Client → Server Messages ───────────────────────────────────────────────

export interface GeminiSetupMessage {
  setup: {
    model: string;
    generationConfig?: GeminiSessionConfig;
  };
}

/** Send raw PCM audio to Gemini */
export interface GeminiAudioInputMessage {
  realtimeInput: {
    mediaChunks: Array<{
      data: string; // base64-encoded PCM 16kHz
      mimeType: 'audio/pcm;rate=16000';
    }>;
  };
}

/** Send text to Gemini */
export interface GeminiTextInputMessage {
  realtimeInput: {
    text: string;
  };
}

/** Send tool/function call results back to Gemini */
export interface GeminiToolResponseMessage {
  toolResponse: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>;
  };
}

export type GeminiClientMessage =
  | GeminiSetupMessage
  | GeminiAudioInputMessage
  | GeminiTextInputMessage
  | GeminiToolResponseMessage;

// ─── Server → Client Messages ───────────────────────────────────────────────

export interface GeminiSetupCompleteMessage {
  setupComplete: Record<string, never>;
}

export interface GeminiAudioOutputMessage {
  serverContent: {
    modelTurn?: {
      parts: Array<{
        inlineData?: {
          data: string; // base64-encoded PCM 24kHz
          mimeType: string;
        };
        text?: string;
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
    inputTranscription?: {
      text: string;
    };
    outputTranscription?: {
      text: string;
    };
  };
}

export interface GeminiToolCallMessage {
  toolCall: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
}

export interface GeminiErrorMessage {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export type GeminiServerMessage =
  | GeminiSetupCompleteMessage
  | GeminiAudioOutputMessage
  | GeminiToolCallMessage
  | GeminiErrorMessage;

// ─── Usage Tracking ─────────────────────────────────────────────────────────

export interface SessionUsageMetrics {
  audioInputMs: number;
  audioOutputMs: number;
  textInputTokens: number;
  textOutputTokens: number;
  startedAt: Date;
  endedAt?: Date;
}

// ─── Event Types ────────────────────────────────────────────────────────────

export interface GeminiSessionEvents {
  setupComplete: () => void;
  audio: (data: Buffer) => void;
  toolCall: (calls: Array<{ id: string; name: string; args: Record<string, unknown> }>) => void;
  inputTranscript: (text: string) => void;
  outputTranscript: (text: string) => void;
  turnComplete: () => void;
  interrupted: () => void;
  error: (error: Error) => void;
  close: (code: number, reason: string) => void;
}
