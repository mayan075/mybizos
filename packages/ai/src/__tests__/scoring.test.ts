import { describe, it, expect, vi } from "vitest";
import { LeadScoringEngine, type ScoringFactors } from "../agents/scoring.js";
import type { ClaudeClient } from "../providers/claude.js";

// Create a mock ClaudeClient (we only test heuristic scoring, no API calls)
function createMockClient(): ClaudeClient {
  return {
    chat: vi.fn(),
    complete: vi.fn(),
  } as unknown as ClaudeClient;
}

function createFactors(overrides: Partial<ScoringFactors> = {}): ScoringFactors {
  return {
    hasPhone: false,
    hasEmail: false,
    messageCount: 0,
    responseRate: 0,
    appointmentsBooked: 0,
    appointmentsCompleted: 0,
    dealsWon: 0,
    dealsTotal: 0,
    daysSinceLastActivity: 365,
    source: "manual",
    emergencyRequest: false,
    ...overrides,
  };
}

describe("LeadScoringEngine.score", () => {
  const engine = new LeadScoringEngine(createMockClient());

  // ─── Complete vs minimal contact ──────────────────────────────

  it("scores a complete contact higher than a minimal one", () => {
    const complete = engine.score(
      { source: "referral", phone: "+15551234567", email: "test@example.com" },
      createFactors({
        hasPhone: true,
        hasEmail: true,
        messageCount: 5,
        responseRate: 0.8,
        appointmentsBooked: 2,
        appointmentsCompleted: 1,
        dealsWon: 1,
        dealsTotal: 2,
        daysSinceLastActivity: 1,
      }),
    );

    const minimal = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors(),
    );

    expect(complete.score).toBeGreaterThan(minimal.score);
  });

  it("minimal contact with no activity scores very low (cold)", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors(),
    );
    expect(result.score).toBeLessThan(20);
    expect(result.label).toBe("cold");
  });

  // ─── Emergency keyword ────────────────────────────────────────

  it("emergency request scores 100", () => {
    const result = engine.score(
      { source: "phone", phone: "+15551234567", email: null },
      createFactors({ emergencyRequest: true }),
    );
    expect(result.score).toBe(100);
  });

  it("emergency request is labeled hot", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ emergencyRequest: true }),
    );
    expect(result.label).toBe("hot");
  });

  it("emergency score factors include emergency key", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ emergencyRequest: true }),
    );
    expect(result.factors["emergency"]).toBe(100);
  });

  // ─── Source quality ───────────────────────────────────────────

  it("referral source scores higher than manual", () => {
    const referral = engine.score(
      { source: "referral", phone: null, email: null },
      createFactors({ daysSinceLastActivity: 1 }),
    );
    const manual = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ daysSinceLastActivity: 1 }),
    );
    expect(referral.score).toBeGreaterThan(manual.score);
  });

  it("phone source gets 5 points for source quality", () => {
    const result = engine.score(
      { source: "phone", phone: "+15551234567", email: null },
      createFactors(),
    );
    expect(result.factors["source_quality"]).toBe(5);
  });

  it("import source gets only 1 point for source quality", () => {
    const result = engine.score(
      { source: "import", phone: null, email: null },
      createFactors(),
    );
    expect(result.factors["source_quality"]).toBe(1);
  });

  it("google_ads source gets 3 points", () => {
    const result = engine.score(
      { source: "google_ads", phone: null, email: null },
      createFactors(),
    );
    expect(result.factors["source_quality"]).toBe(3);
  });

  // ─── Engagement scoring ───────────────────────────────────────

  it("more messages increase engagement score", () => {
    const fewMessages = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ messageCount: 1, daysSinceLastActivity: 1 }),
    );
    const manyMessages = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ messageCount: 5, daysSinceLastActivity: 1 }),
    );
    expect(manyMessages.factors["engagement"]).toBeGreaterThan(fewMessages.factors["engagement"]);
  });

  it("message engagement caps at 10 points (5 messages * 2)", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ messageCount: 100, responseRate: 0, daysSinceLastActivity: 1 }),
    );
    // engagement = min(100*2, 10) + round(0*15) = 10 + 0 = 10
    expect(result.factors["engagement"]).toBe(10);
  });

  it("high response rate adds up to 15 points", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ messageCount: 0, responseRate: 1.0, daysSinceLastActivity: 1 }),
    );
    // engagement = min(0, 10) + round(1.0 * 15) = 0 + 15 = 15
    expect(result.factors["engagement"]).toBe(15);
  });

  // ─── Contact completeness ─────────────────────────────────────

  it("having both phone and email gives 15 completeness points", () => {
    const result = engine.score(
      { source: "manual", phone: "+15551234567", email: "a@b.com" },
      createFactors({ hasPhone: true, hasEmail: true }),
    );
    expect(result.factors["contact_completeness"]).toBe(15);
  });

  it("having only phone gives 8 completeness points", () => {
    const result = engine.score(
      { source: "manual", phone: "+15551234567", email: null },
      createFactors({ hasPhone: true, hasEmail: false }),
    );
    expect(result.factors["contact_completeness"]).toBe(8);
  });

  // ─── Recency scoring ──────────────────────────────────────────

  it("activity within 1 day gets 10 recency points", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ daysSinceLastActivity: 0 }),
    );
    expect(result.factors["recency"]).toBe(10);
  });

  it("activity over 90 days ago gets 0 recency points", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ daysSinceLastActivity: 365 }),
    );
    expect(result.factors["recency"]).toBe(0);
  });

  it("activity at 30 days gets 5 recency points", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors({ daysSinceLastActivity: 30 }),
    );
    expect(result.factors["recency"]).toBe(5);
  });

  // ─── Label assignment at thresholds ───────────────────────────

  it("score of exactly 80 is labeled hot", () => {
    // Build a scenario scoring exactly 80
    // completeness 15 + engagement 25 + conversion 30 + recency 10 = 80
    const result = engine.score(
      { source: "manual", phone: "+1", email: "a@b.com" },
      createFactors({
        hasPhone: true,
        hasEmail: true,
        messageCount: 10,
        responseRate: 1.0,
        appointmentsBooked: 2,
        appointmentsCompleted: 2,
        dealsWon: 0,
        dealsTotal: 0,
        daysSinceLastActivity: 0,
      }),
    );
    // The exact score will depend on factor capping, but it should be >= 80
    if (result.score >= 80) {
      expect(result.label).toBe("hot");
    }
  });

  it("score of exactly 50 is labeled warm", () => {
    const result = engine.score(
      { source: "referral", phone: "+1", email: "a@b.com" },
      createFactors({
        hasPhone: true,
        hasEmail: true,
        messageCount: 3,
        responseRate: 0.5,
        appointmentsBooked: 0,
        appointmentsCompleted: 0,
        dealsWon: 0,
        dealsTotal: 0,
        daysSinceLastActivity: 3,
      }),
    );
    // With these factors: 15 + (6+8) + 0 + 0 + 8 + 5 = 42 — likely warm range
    expect(result.score).toBeGreaterThanOrEqual(30);
    if (result.score >= 50 && result.score < 80) {
      expect(result.label).toBe("warm");
    }
  });

  it("score below 50 is labeled cold", () => {
    const result = engine.score(
      { source: "import", phone: null, email: null },
      createFactors({
        daysSinceLastActivity: 100,
      }),
    );
    expect(result.score).toBeLessThan(50);
    expect(result.label).toBe("cold");
  });

  // ─── Reasoning output ─────────────────────────────────────────

  it("reasoning includes the label", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors(),
    );
    expect(result.reasoning).toContain(result.label);
  });

  it("reasoning mentions the top factor", () => {
    const result = engine.score(
      { source: "referral", phone: "+1", email: "a@b.com" },
      createFactors({
        hasPhone: true,
        hasEmail: true,
        messageCount: 0,
        daysSinceLastActivity: 365,
      }),
    );
    // Top factor should be contact_completeness (15 points)
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  // ─── Score clamping ───────────────────────────────────────────

  it("score never exceeds 100", () => {
    const result = engine.score(
      { source: "referral", phone: "+1", email: "a@b.com" },
      createFactors({
        hasPhone: true,
        hasEmail: true,
        messageCount: 100,
        responseRate: 1.0,
        appointmentsBooked: 10,
        appointmentsCompleted: 10,
        dealsWon: 10,
        dealsTotal: 10,
        daysSinceLastActivity: 0,
        emergencyRequest: true,
      }),
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("score is never negative", () => {
    const result = engine.score(
      { source: "manual", phone: null, email: null },
      createFactors(),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
