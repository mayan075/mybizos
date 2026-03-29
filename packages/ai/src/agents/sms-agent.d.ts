import type { Vertical } from "@hararai/shared";
import type { ClaudeClient } from "../providers/claude.js";
import { BaseAgent, type AgentAction, type AgentContext } from "./base-agent.js";
/**
 * SMS Agent: Handles inbound SMS conversations for lead qualification
 * and appointment booking. Keeps messages concise and actionable.
 */
export declare class SmsAgent extends BaseAgent {
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
//# sourceMappingURL=sms-agent.d.ts.map