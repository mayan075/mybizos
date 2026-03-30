import type { ClaudeClient } from "../providers/claude.js";
import { BaseAgent, type AgentAction, type AgentContext } from "./base-agent.js";
import { getSmsAgentPrompt } from "../prompts/system-prompts.js";

/**
 * SMS Agent: Handles inbound SMS conversations for lead qualification
 * and appointment booking. Keeps messages concise and actionable.
 */
export class SmsAgent extends BaseAgent {
  private industry: string;
  private businessName: string;
  private agentName: string;

  constructor(
    client: ClaudeClient,
    config: { industry: string; businessName: string; agentName: string },
  ) {
    super(client, "sms");
    this.industry = config.industry;
    this.businessName = config.businessName;
    this.agentName = config.agentName;
  }

  protected buildSystemPrompt(_context: AgentContext): string {
    return getSmsAgentPrompt({
      businessName: this.businessName,
      industry: this.industry,
      agentName: this.agentName,
    });
  }

  protected async extractActions(
    _context: AgentContext,
    responseContent: string,
  ): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];
    const lower = responseContent.toLowerCase();

    // Detect appointment booking intent in the response
    if (
      lower.includes("appointment") ||
      lower.includes("schedule") ||
      lower.includes("book")
    ) {
      const dateMatch = responseContent.match(
        /(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+day,?\s+\w+\s+\d{1,2})/i,
      );
      const timeMatch = responseContent.match(
        /(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/i,
      );

      if (dateMatch || timeMatch) {
        actions.push({
          type: "book_appointment",
          data: {
            suggestedDate: dateMatch?.[1] ?? null,
            suggestedTime: timeMatch?.[1] ?? null,
            source: "sms_agent",
          },
        });
      }
    }

    // Detect if the agent is suggesting a phone call (escalation)
    if (
      lower.includes("give us a call") ||
      lower.includes("call us") ||
      lower.includes("phone call")
    ) {
      actions.push({
        type: "escalate",
        message: "SMS agent suggested phone call for complex issue.",
      });
    }

    return actions;
  }
}
