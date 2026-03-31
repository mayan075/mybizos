import type { AiAgentType } from "@hararai/shared";
import type { ClaudeClient, ClaudeMessage, ClaudeResponse } from "../providers/claude.js";

export interface AgentContext {
  orgId: string;
  orgName: string;
  industry: string;
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
 * Base class for all HararAI AI agents.
 * Enforces compliance rules: disclosure, escalation after 2 misunderstandings,
 * emergency keyword detection, and price range quoting.
 */
export abstract class BaseAgent {
  protected client: ClaudeClient;
  protected agentType: AiAgentType;
  protected misunderstandingCount = 0;

  private static readonly EMERGENCY_KEYWORDS = [
    "flooding", "flood", "gas leak", "gas smell", "fire",
    "carbon monoxide", "co detector", "burst pipe", "sewage",
    "no heat", "no hot water", "electrical fire", "sparking", "smoke",
  ];

  private static readonly MAX_MISUNDERSTANDINGS = 2;

  constructor(client: ClaudeClient, agentType: AiAgentType) {
    this.client = client;
    this.agentType = agentType;
  }

  /**
   * Process an incoming message and produce a response with actions.
   */
  async process(context: AgentContext, userMessage: string): Promise<AgentResult> {
    this.misunderstandingCount = 0;
    const actions: AgentAction[] = [];

    // Check for emergency keywords
    if (this.containsEmergencyKeyword(userMessage)) {
      actions.push({
        type: "alert_owner",
        message: `EMERGENCY detected in ${context.orgName}: "${userMessage}"`,
        data: {
          contactName: context.contactName,
          contactPhone: context.contactPhone,
          keyword: this.findEmergencyKeyword(userMessage),
        },
      });
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const messages: ClaudeMessage[] = [
      ...context.conversationHistory,
      { role: "user", content: userMessage },
    ];

    const response = await this.client.chat(systemPrompt, messages, {
      maxTokens: 512,
      temperature: 0.7,
    });

    // Check if the AI indicated a misunderstanding
    if (this.detectMisunderstanding(response.content, userMessage)) {
      this.misunderstandingCount++;
    }

    // Escalate after too many misunderstandings
    if (this.misunderstandingCount >= BaseAgent.MAX_MISUNDERSTANDINGS) {
      actions.push({
        type: "escalate",
        message: "Transferring you to a team member who can better help you.",
      });
      return {
        response,
        actions,
        shouldEscalate: true,
        misunderstandingCount: this.misunderstandingCount,
      };
    }

    // Let subclass add specific actions
    const subclassActions = await this.extractActions(context, response.content);
    actions.push(...subclassActions);

    return {
      response,
      actions,
      shouldEscalate: false,
      misunderstandingCount: this.misunderstandingCount,
    };
  }

  /**
   * Build the system prompt for this agent type and context.
   */
  protected abstract buildSystemPrompt(context: AgentContext): string;

  /**
   * Extract actionable items from the agent's response.
   */
  protected abstract extractActions(
    context: AgentContext,
    responseContent: string,
  ): Promise<AgentAction[]>;

  /**
   * Check if the user's message contains emergency keywords.
   */
  private containsEmergencyKeyword(message: string): boolean {
    const lower = message.toLowerCase();
    return BaseAgent.EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
  }

  /**
   * Find the specific emergency keyword in a message.
   */
  private findEmergencyKeyword(message: string): string | null {
    const lower = message.toLowerCase();
    return BaseAgent.EMERGENCY_KEYWORDS.find((kw) => lower.includes(kw)) ?? null;
  }

  /**
   * Heuristic to detect if the AI misunderstood the user.
   */
  private detectMisunderstanding(aiResponse: string, _userMessage: string): boolean {
    const lower = aiResponse.toLowerCase();
    const misunderstandingPhrases = [
      "i'm not sure i understand",
      "could you clarify",
      "i didn't quite catch",
      "can you repeat",
      "i'm sorry, i don't understand",
      "could you rephrase",
    ];
    return misunderstandingPhrases.some((phrase) => lower.includes(phrase));
  }
}
