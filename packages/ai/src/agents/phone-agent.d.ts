import type { Vertical } from "@mybizos/shared";
import type { ClaudeClient } from "../providers/claude.js";
import { BaseAgent, type AgentAction, type AgentContext } from "./base-agent.js";
/**
 * Phone Agent: Powers the AI phone system via Vapi.ai integration.
 * Handles inbound calls, qualifies leads, and books appointments.
 * This agent's responses are converted to speech by the Vapi platform.
 */
export declare class PhoneAgent extends BaseAgent {
    private vertical;
    private businessName;
    private agentName;
    constructor(client: ClaudeClient, config: {
        vertical: Vertical;
        businessName: string;
        agentName: string;
    });
    protected buildSystemPrompt(_context: AgentContext): string;
    protected extractActions(_context: AgentContext, responseContent: string): Promise<AgentAction[]>;
}
//# sourceMappingURL=phone-agent.d.ts.map