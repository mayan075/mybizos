import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Wrapper around the Anthropic Claude API client.
 * Used by all AI agents (phone, SMS, chat, review) in HararAI.
 */
export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  /**
   * Send a message with a system prompt and conversation history.
   */
  async chat(
    systemPrompt: string,
    messages: ClaudeMessage[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<ClaudeResponse> {
    const apiMessages: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature,
      system: systemPrompt,
      messages: apiMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const content = textBlock && "text" in textBlock ? textBlock.text : "";

    return {
      content,
      stopReason: response.stop_reason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Simple single-turn completion with a system prompt and user message.
   */
  async complete(
    systemPrompt: string,
    userMessage: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string> {
    const response = await this.chat(
      systemPrompt,
      [{ role: "user", content: userMessage }],
      options,
    );
    return response.content;
  }
}
