/**
 * Base class for all MyBizOS AI agents.
 * Enforces compliance rules: disclosure, escalation after 2 misunderstandings,
 * emergency keyword detection, and price range quoting.
 */
export class BaseAgent {
    client;
    agentType;
    misunderstandingCount = 0;
    static EMERGENCY_KEYWORDS = [
        "flooding", "flood", "gas leak", "gas smell", "fire",
        "carbon monoxide", "co detector", "burst pipe", "sewage",
        "no heat", "no hot water", "electrical fire", "sparking", "smoke",
    ];
    static MAX_MISUNDERSTANDINGS = 2;
    constructor(client, agentType) {
        this.client = client;
        this.agentType = agentType;
    }
    /**
     * Process an incoming message and produce a response with actions.
     */
    async process(context, userMessage) {
        const actions = [];
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
        const messages = [
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
     * Check if the user's message contains emergency keywords.
     */
    containsEmergencyKeyword(message) {
        const lower = message.toLowerCase();
        return BaseAgent.EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
    }
    /**
     * Find the specific emergency keyword in a message.
     */
    findEmergencyKeyword(message) {
        const lower = message.toLowerCase();
        return BaseAgent.EMERGENCY_KEYWORDS.find((kw) => lower.includes(kw)) ?? null;
    }
    /**
     * Heuristic to detect if the AI misunderstood the user.
     */
    detectMisunderstanding(aiResponse, _userMessage) {
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
//# sourceMappingURL=base-agent.js.map