import type { Contact, Vertical } from "@mybizos/shared";
import type { ClaudeClient } from "../providers/claude.js";
export interface ScoringFactors {
    hasPhone: boolean;
    hasEmail: boolean;
    messageCount: number;
    responseRate: number;
    appointmentsBooked: number;
    appointmentsCompleted: number;
    dealsWon: number;
    dealsTotal: number;
    daysSinceLastActivity: number;
    source: string;
    emergencyRequest: boolean;
}
export interface ScoringResult {
    score: number;
    label: "hot" | "warm" | "cold";
    factors: Record<string, number>;
    reasoning: string;
}
/**
 * Lead scoring engine that combines rule-based heuristics with
 * optional AI-powered scoring for complex evaluation.
 */
export declare class LeadScoringEngine {
    private client;
    constructor(client: ClaudeClient);
    /**
     * Calculate a lead score (0-100) based on contact data and activity.
     * Uses a weighted heuristic model. For complex cases, can use AI.
     */
    score(contact: Pick<Contact, "source" | "phone" | "email">, factors: ScoringFactors): ScoringResult;
    /**
     * Use Claude to generate a more nuanced score with natural language reasoning.
     * Use sparingly -- this costs API tokens per call.
     */
    scoreWithAi(contact: Pick<Contact, "firstName" | "lastName" | "source" | "phone" | "email">, factors: ScoringFactors, vertical: Vertical): Promise<ScoringResult>;
    private buildReasoning;
}
//# sourceMappingURL=scoring.d.ts.map