import type { AiAgentType, Vertical } from "@hararai/shared";
import type { ClaudeClient, ClaudeMessage, ClaudeResponse } from "../providers/claude.js";
export interface AgentContext {
    orgId: string;
    orgName: string;
    vertical: Vertical;
    contactName: string | null;
    contactPhone: string | null;
    conversationHistory: ClaudeMessage[];
    metadata: Record<string, unknown>;
}
export interface AgentAction {
    type: "respond" | "book_appointment" | "escalate" | "end_conversation" | "alert_owner";
    message?: string;
    data?: Record<string, unknown>;
}
export interface AgentResult {
    response: ClaudeResponse;
    actions: AgentAction[];
    shouldEscalate: boolean;
    misunderstandingCount: number;
}
/**
 * Base class for all MyBizOS AI agents.
 * Enforces compliance rules: disclosure, escalation after 2 misunderstandings,
 * emergency keyword detection, and price range quoting.
 */
export declare abstract class BaseAgent {
    protected client: ClaudeClient;
    protected agentType: AiAgentType;
    protected misunderstandingCount: number;
    private static readonly EMERGENCY_KEYWORDS;
    private static readonly MAX_MISUNDERSTANDINGS;
    constructor(client: ClaudeClient, agentType: AiAgentType);
    /**
     * Process an incoming message and produce a response with actions.
     */
    process(context: AgentContext, userMessage: string): Promise<AgentResult>;
    /**
     * Build the system prompt for this agent type and context.
     */
    protected abstract buildSystemPrompt(context: AgentContext): string;
    /**
     * Extract actionable items from the agent's response.
     */
    protected abstract extractActions(context: AgentContext, responseContent: string): Promise<AgentAction[]>;
    /**
     * Check if the user's message contains emergency keywords.
     */
    private containsEmergencyKeyword;
    /**
     * Find the specific emergency keyword in a message.
     */
    private findEmergencyKeyword;
    /**
     * Heuristic to detect if the AI misunderstood the user.
     */
    private detectMisunderstanding;
}
//# sourceMappingURL=base-agent.d.ts.map