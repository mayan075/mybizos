import type { Vertical } from "@mybizos/shared";
import type { ClaudeClient } from "../providers/claude.js";
import { BaseAgent, type AgentAction, type AgentContext } from "./base-agent.js";
import { getPhoneAgentPrompt } from "../prompts/system-prompts.js";

/**
 * Phone Agent: Powers the AI phone system via Vapi.ai integration.
 * Handles inbound calls, qualifies leads, and books appointments.
 * This agent's responses are converted to speech by the Vapi platform.
 */
export class PhoneAgent extends BaseAgent {
  private vertical: Vertical;
  private businessName: string;
  private agentName: string;

  constructor(
    client: ClaudeClient,
    config: { vertical: Vertical; businessName: string; agentName: string },
  ) {
    super(client, "phone");
    this.vertical = config.vertical;
    this.businessName = config.businessName;
    this.agentName = config.agentName;
  }

  protected buildSystemPrompt(_context: AgentContext): string {
    return getPhoneAgentPrompt({
      businessName: this.businessName,
      vertical: this.vertical,
      agentName: this.agentName,
    });
  }

  protected async extractActions(
    _context: AgentContext,
    responseContent: string,
  ): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];
    const lower = responseContent.toLowerCase();

    // Detect appointment booking in the response
    if (
      lower.includes("i've scheduled") ||
      lower.includes("appointment is set") ||
      lower.includes("booked for") ||
      lower.includes("confirmed for")
    ) {
      actions.push({
        type: "book_appointment",
        data: { source: "phone_agent" },
      });
    }

    // Detect transfer/escalation request
    if (
      lower.includes("transfer you") ||
      lower.includes("connect you with") ||
      lower.includes("let me get someone")
    ) {
      actions.push({
        type: "escalate",
        message: "Caller requested to speak with a human.",
      });
    }

    // Detect end of conversation
    if (
      lower.includes("have a great day") ||
      lower.includes("goodbye") ||
      lower.includes("thank you for calling")
    ) {
      actions.push({
        type: "end_conversation",
        message: "Call concluded naturally.",
      });
    }

    return actions;
  }
}
