import { BaseAgent } from "./base-agent.js";
import { getPhoneAgentPrompt } from "../prompts/system-prompts.js";
/**
 * Phone Agent: Powers the AI phone system via Vapi.ai integration.
 * Handles inbound calls, qualifies leads, and books appointments.
 * This agent's responses are converted to speech by the Vapi platform.
 */
export class PhoneAgent extends BaseAgent {
    vertical;
    businessName;
    agentName;
    constructor(client, config) {
        super(client, "phone");
        this.vertical = config.vertical;
        this.businessName = config.businessName;
        this.agentName = config.agentName;
    }
    buildSystemPrompt(_context) {
        return getPhoneAgentPrompt({
            businessName: this.businessName,
            vertical: this.vertical,
            agentName: this.agentName,
        });
    }
    async extractActions(_context, responseContent) {
        const actions = [];
        const lower = responseContent.toLowerCase();
        // Detect appointment booking in the response
        if (lower.includes("i've scheduled") ||
            lower.includes("appointment is set") ||
            lower.includes("booked for") ||
            lower.includes("confirmed for")) {
            actions.push({
                type: "book_appointment",
                data: { source: "phone_agent" },
            });
        }
        // Detect transfer/escalation request
        if (lower.includes("transfer you") ||
            lower.includes("connect you with") ||
            lower.includes("let me get someone")) {
            actions.push({
                type: "escalate",
                message: "Caller requested to speak with a human.",
            });
        }
        // Detect end of conversation
        if (lower.includes("have a great day") ||
            lower.includes("goodbye") ||
            lower.includes("thank you for calling")) {
            actions.push({
                type: "end_conversation",
                message: "Call concluded naturally.",
            });
        }
        return actions;
    }
}
//# sourceMappingURL=phone-agent.js.map