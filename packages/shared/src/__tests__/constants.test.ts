import { describe, it, expect } from "vitest";
import {
  VERTICALS,
  VERTICAL_LABELS,
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CHANNEL_TYPES,
  CONTACT_SOURCES,
  EMERGENCY_KEYWORDS,
  AI_SCORE,
  AI_MAX_MISUNDERSTANDINGS,
  AI_DISCLOSURE_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  DAYS_OF_WEEK,
  ORG_MEMBER_ROLES,
  APPOINTMENT_STATUSES,
  CALL_OUTCOMES,
  AI_AGENT_TYPES,
} from "../constants/index.js";

// ─── VERTICALS ──────────────────────────────────────────────────────

describe("VERTICALS", () => {
  it("contains plumbing and hvac (Phase 1 focus)", () => {
    expect(VERTICALS).toContain("plumbing");
    expect(VERTICALS).toContain("hvac");
  });

  it("contains all expected home services verticals", () => {
    expect(VERTICALS).toContain("electrical");
    expect(VERTICALS).toContain("roofing");
    expect(VERTICALS).toContain("landscaping");
    expect(VERTICALS).toContain("pest_control");
    expect(VERTICALS).toContain("cleaning");
    expect(VERTICALS).toContain("general_contractor");
  });

  it("has exactly 8 verticals", () => {
    expect(VERTICALS).toHaveLength(8);
  });

  it("has a label for every vertical", () => {
    for (const v of VERTICALS) {
      expect(VERTICAL_LABELS[v]).toBeDefined();
      expect(typeof VERTICAL_LABELS[v]).toBe("string");
      expect(VERTICAL_LABELS[v].length).toBeGreaterThan(0);
    }
  });
});

// ─── EMERGENCY_KEYWORDS ─────────────────────────────────────────────

describe("EMERGENCY_KEYWORDS", () => {
  it("includes flooding", () => {
    expect(EMERGENCY_KEYWORDS).toContain("flooding");
  });

  it("includes gas leak", () => {
    expect(EMERGENCY_KEYWORDS).toContain("gas leak");
  });

  it("includes fire", () => {
    expect(EMERGENCY_KEYWORDS).toContain("fire");
  });

  it("includes carbon monoxide", () => {
    expect(EMERGENCY_KEYWORDS).toContain("carbon monoxide");
  });

  it("includes burst pipe", () => {
    expect(EMERGENCY_KEYWORDS).toContain("burst pipe");
  });

  it("includes sewage", () => {
    expect(EMERGENCY_KEYWORDS).toContain("sewage");
  });

  it("includes no heat", () => {
    expect(EMERGENCY_KEYWORDS).toContain("no heat");
  });

  it("includes smoke", () => {
    expect(EMERGENCY_KEYWORDS).toContain("smoke");
  });

  it("does not include non-emergency terms", () => {
    expect(EMERGENCY_KEYWORDS).not.toContain("tune-up");
    expect(EMERGENCY_KEYWORDS).not.toContain("quote");
    expect(EMERGENCY_KEYWORDS).not.toContain("estimate");
  });

  it("has at least 10 emergency keywords", () => {
    expect(EMERGENCY_KEYWORDS.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── DEAL_STAGE_COLORS ──────────────────────────────────────────────

describe("DEAL_STAGE_COLORS", () => {
  it("has a color for every deal stage", () => {
    for (const stage of DEAL_STAGES) {
      expect(DEAL_STAGE_COLORS[stage]).toBeDefined();
    }
  });

  it("all colors are valid hex codes", () => {
    for (const stage of DEAL_STAGES) {
      expect(DEAL_STAGE_COLORS[stage]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("won stage is green-ish (#22c55e)", () => {
    expect(DEAL_STAGE_COLORS.won).toBe("#22c55e");
  });

  it("lost stage is gray-ish (#6b7280)", () => {
    expect(DEAL_STAGE_COLORS.lost).toBe("#6b7280");
  });

  it("has a label for every deal stage", () => {
    for (const stage of DEAL_STAGES) {
      expect(DEAL_STAGE_LABELS[stage]).toBeDefined();
    }
  });
});

// ─── AI_SCORE thresholds ────────────────────────────────────────────

describe("AI_SCORE thresholds", () => {
  it("HOT_LEAD is greater than WARM_LEAD", () => {
    expect(AI_SCORE.HOT_LEAD).toBeGreaterThan(AI_SCORE.WARM_LEAD);
  });

  it("WARM_LEAD is greater than COLD_LEAD", () => {
    expect(AI_SCORE.WARM_LEAD).toBeGreaterThan(AI_SCORE.COLD_LEAD);
  });

  it("MIN is 0", () => {
    expect(AI_SCORE.MIN).toBe(0);
  });

  it("MAX is 100", () => {
    expect(AI_SCORE.MAX).toBe(100);
  });

  it("HOT_LEAD is 80", () => {
    expect(AI_SCORE.HOT_LEAD).toBe(80);
  });

  it("WARM_LEAD is 50", () => {
    expect(AI_SCORE.WARM_LEAD).toBe(50);
  });

  it("COLD_LEAD is 20", () => {
    expect(AI_SCORE.COLD_LEAD).toBe(20);
  });

  it("all thresholds are within MIN-MAX range", () => {
    expect(AI_SCORE.HOT_LEAD).toBeLessThanOrEqual(AI_SCORE.MAX);
    expect(AI_SCORE.HOT_LEAD).toBeGreaterThanOrEqual(AI_SCORE.MIN);
    expect(AI_SCORE.WARM_LEAD).toBeLessThanOrEqual(AI_SCORE.MAX);
    expect(AI_SCORE.WARM_LEAD).toBeGreaterThanOrEqual(AI_SCORE.MIN);
    expect(AI_SCORE.COLD_LEAD).toBeLessThanOrEqual(AI_SCORE.MAX);
    expect(AI_SCORE.COLD_LEAD).toBeGreaterThanOrEqual(AI_SCORE.MIN);
  });
});

// ─── Other constants ────────────────────────────────────────────────

describe("other constants", () => {
  it("AI_MAX_MISUNDERSTANDINGS is 2", () => {
    expect(AI_MAX_MISUNDERSTANDINGS).toBe(2);
  });

  it("AI_DISCLOSURE_PREFIX contains businessName placeholder", () => {
    expect(AI_DISCLOSURE_PREFIX).toContain("{businessName}");
  });

  it("AI_DISCLOSURE_PREFIX mentions AI assistant", () => {
    expect(AI_DISCLOSURE_PREFIX).toContain("AI assistant");
  });

  it("AI_DISCLOSURE_PREFIX mentions recording", () => {
    expect(AI_DISCLOSURE_PREFIX).toContain("recorded");
  });

  it("DEFAULT_CURRENCY is USD", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
  });

  it("DEFAULT_TIMEZONE is America/New_York", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/New_York");
  });

  it("DAYS_OF_WEEK has 7 days", () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("DAYS_OF_WEEK starts with monday", () => {
    expect(DAYS_OF_WEEK[0]).toBe("monday");
  });

  it("DEAL_STAGES has correct order (new_lead first, lost last)", () => {
    expect(DEAL_STAGES[0]).toBe("new_lead");
    expect(DEAL_STAGES[DEAL_STAGES.length - 1]).toBe("lost");
  });

  it("ACTIVITY_TYPES has labels for all types", () => {
    for (const t of ACTIVITY_TYPES) {
      expect(ACTIVITY_TYPE_LABELS[t]).toBeDefined();
    }
  });

  it("CHANNEL_TYPES includes sms, email, and call", () => {
    expect(CHANNEL_TYPES).toContain("sms");
    expect(CHANNEL_TYPES).toContain("email");
    expect(CHANNEL_TYPES).toContain("call");
  });

  it("CONTACT_SOURCES has 10 sources", () => {
    expect(CONTACT_SOURCES).toHaveLength(10);
  });

  it("ORG_MEMBER_ROLES includes owner", () => {
    expect(ORG_MEMBER_ROLES).toContain("owner");
  });

  it("APPOINTMENT_STATUSES includes cancelled and no_show", () => {
    expect(APPOINTMENT_STATUSES).toContain("cancelled");
    expect(APPOINTMENT_STATUSES).toContain("no_show");
  });

  it("CALL_OUTCOMES includes escalated", () => {
    expect(CALL_OUTCOMES).toContain("escalated");
  });

  it("AI_AGENT_TYPES has 4 types", () => {
    expect(AI_AGENT_TYPES).toHaveLength(4);
  });
});
