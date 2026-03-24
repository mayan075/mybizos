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
/**
 * Wrapper around the Anthropic Claude API client.
 * Used by all AI agents (phone, SMS, chat, review) in MyBizOS.
 */
export declare class ClaudeClient {
    private client;
    private model;
    private maxTokens;
    constructor(config: ClaudeConfig);
    /**
     * Send a message with a system prompt and conversation history.
     */
    chat(systemPrompt: string, messages: ClaudeMessage[], options?: {
        maxTokens?: number;
        temperature?: number;
    }): Promise<ClaudeResponse>;
    /**
     * Simple single-turn completion with a system prompt and user message.
     */
    complete(systemPrompt: string, userMessage: string, options?: {
        maxTokens?: number;
        temperature?: number;
    }): Promise<string>;
}
//# sourceMappingURL=claude.d.ts.map