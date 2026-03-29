import type { Vertical } from "@hararai/shared";
interface PromptContext {
    businessName: string;
    vertical: Vertical;
    agentName: string;
}
/**
 * Get the phone agent system prompt for a specific vertical.
 */
export declare function getPhoneAgentPrompt(context: PromptContext): string;
/**
 * Get the SMS agent system prompt for a specific vertical.
 */
export declare function getSmsAgentPrompt(context: PromptContext): string;
export {};
//# sourceMappingURL=system-prompts.d.ts.map