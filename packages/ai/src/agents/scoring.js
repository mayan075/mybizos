import { AI_SCORE } from "@hararai/shared";
/**
 * Lead scoring engine that combines rule-based heuristics with
 * optional AI-powered scoring for complex evaluation.
 */
export class LeadScoringEngine {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Calculate a lead score (0-100) based on contact data and activity.
     * Uses a weighted heuristic model. For complex cases, can use AI.
     */
    score(contact, factors) {
        const breakdown = {};
        let total = 0;
        // Contact completeness (max 15 points)
        const completeness = (factors.hasPhone ? 8 : 0) + (factors.hasEmail ? 7 : 0);
        breakdown["contact_completeness"] = completeness;
        total += completeness;
        // Engagement (max 25 points)
        const engagementMessages = Math.min(factors.messageCount * 2, 10);
        const engagementResponse = Math.round(factors.responseRate * 15);
        breakdown["engagement"] = engagementMessages + engagementResponse;
        total += engagementMessages + engagementResponse;
        // Conversion signals (max 30 points)
        const appointmentScore = Math.min(factors.appointmentsBooked * 10, 15);
        const completedScore = Math.min(factors.appointmentsCompleted * 10, 15);
        breakdown["conversion_signals"] = appointmentScore + completedScore;
        total += appointmentScore + completedScore;
        // Deal history (max 15 points)
        const dealScore = factors.dealsTotal > 0
            ? Math.round((factors.dealsWon / factors.dealsTotal) * 15)
            : 0;
        breakdown["deal_history"] = dealScore;
        total += dealScore;
        // Recency (max 10 points)
        let recencyScore;
        if (factors.daysSinceLastActivity <= 1)
            recencyScore = 10;
        else if (factors.daysSinceLastActivity <= 7)
            recencyScore = 8;
        else if (factors.daysSinceLastActivity <= 30)
            recencyScore = 5;
        else if (factors.daysSinceLastActivity <= 90)
            recencyScore = 2;
        else
            recencyScore = 0;
        breakdown["recency"] = recencyScore;
        total += recencyScore;
        // Source quality bonus (max 5 points)
        const sourceScores = {
            phone: 5,
            referral: 5,
            webform: 4,
            google_ads: 3,
            facebook_ads: 3,
            yelp: 3,
            sms: 2,
            email: 2,
            manual: 1,
            import: 1,
        };
        const sourceScore = sourceScores[contact.source] ?? 1;
        breakdown["source_quality"] = sourceScore;
        total += sourceScore;
        // Emergency bonus (immediate hot lead)
        if (factors.emergencyRequest) {
            total = AI_SCORE.MAX;
            breakdown["emergency"] = AI_SCORE.MAX;
        }
        // Clamp to 0-100
        const finalScore = Math.max(AI_SCORE.MIN, Math.min(AI_SCORE.MAX, total));
        // Determine label
        let label;
        if (finalScore >= AI_SCORE.HOT_LEAD)
            label = "hot";
        else if (finalScore >= AI_SCORE.WARM_LEAD)
            label = "warm";
        else
            label = "cold";
        return {
            score: finalScore,
            label,
            factors: breakdown,
            reasoning: this.buildReasoning(label, breakdown),
        };
    }
    /**
     * Use Claude to generate a more nuanced score with natural language reasoning.
     * Use sparingly -- this costs API tokens per call.
     */
    async scoreWithAi(contact, factors, vertical) {
        // Start with heuristic score as a baseline
        const heuristic = this.score(contact, factors);
        const prompt = `You are a lead scoring AI for a ${vertical} business.
Score this lead from 0-100 and explain why.

Contact: ${contact.firstName} ${contact.lastName}
Source: ${contact.source}
Has phone: ${factors.hasPhone}, Has email: ${factors.hasEmail}
Messages exchanged: ${factors.messageCount}
Response rate: ${Math.round(factors.responseRate * 100)}%
Appointments booked: ${factors.appointmentsBooked}, completed: ${factors.appointmentsCompleted}
Deals won/total: ${factors.dealsWon}/${factors.dealsTotal}
Days since last activity: ${factors.daysSinceLastActivity}
Emergency request: ${factors.emergencyRequest}

Heuristic score: ${heuristic.score}/100 (${heuristic.label})

Respond with ONLY a JSON object: {"score": number, "reasoning": "brief explanation"}`;
        const response = await this.client.complete("You are a lead scoring assistant. Respond only with valid JSON.", prompt, { maxTokens: 200, temperature: 0.3 });
        try {
            const parsed = JSON.parse(response);
            const aiScore = Math.max(AI_SCORE.MIN, Math.min(AI_SCORE.MAX, parsed.score));
            let label;
            if (aiScore >= AI_SCORE.HOT_LEAD)
                label = "hot";
            else if (aiScore >= AI_SCORE.WARM_LEAD)
                label = "warm";
            else
                label = "cold";
            return {
                score: aiScore,
                label,
                factors: heuristic.factors,
                reasoning: parsed.reasoning,
            };
        }
        catch {
            // Fall back to heuristic if AI response is malformed
            return heuristic;
        }
    }
    buildReasoning(label, factors) {
        const topFactor = Object.entries(factors)
            .sort(([, a], [, b]) => b - a)[0];
        if (!topFactor)
            return `Lead rated as ${label}.`;
        const factorLabels = {
            contact_completeness: "contact information completeness",
            engagement: "engagement level",
            conversion_signals: "appointment/conversion history",
            deal_history: "deal win rate",
            recency: "recent activity",
            source_quality: "lead source quality",
            emergency: "emergency service request",
        };
        const factorName = factorLabels[topFactor[0]] ?? topFactor[0];
        return `Lead rated as ${label}, primarily driven by ${factorName}.`;
    }
}
//# sourceMappingURL=scoring.js.map