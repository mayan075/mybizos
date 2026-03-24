import Anthropic from "@anthropic-ai/sdk";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;
/**
 * Wrapper around the Anthropic Claude API client.
 * Used by all AI agents (phone, SMS, chat, review) in MyBizOS.
 */
export class ClaudeClient {
    client;
    model;
    maxTokens;
    constructor(config) {
        this.client = new Anthropic({ apiKey: config.apiKey });
        this.model = config.model ?? DEFAULT_MODEL;
        this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    }
    /**
     * Send a message with a system prompt and conversation history.
     */
    async chat(systemPrompt, messages, options) {
        const apiMessages = messages.map((m) => ({
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
    async complete(systemPrompt, userMessage, options) {
        const response = await this.chat(systemPrompt, [{ role: "user", content: userMessage }], options);
        return response.content;
    }
}
//# sourceMappingURL=claude.js.map