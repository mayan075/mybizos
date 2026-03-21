import { describe, it, expect } from "vitest";
import { getPhoneAgentPrompt, getSmsAgentPrompt } from "../prompts/system-prompts.js";
import { AI_DISCLOSURE_PREFIX } from "@mybizos/shared";

// ─── getPhoneAgentPrompt ────────────────────────────────────────────

describe("getPhoneAgentPrompt", () => {
  it("includes AI_DISCLOSURE_PREFIX with business name substituted", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    const expectedDisclosure = AI_DISCLOSURE_PREFIX.replace("{businessName}", "Acme Plumbing");
    expect(prompt).toContain(expectedDisclosure);
  });

  it("plumbing prompt mentions drain", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt.toLowerCase()).toContain("drain");
  });

  it("plumbing prompt mentions pipe", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt.toLowerCase()).toContain("pipe");
  });

  it("plumbing prompt mentions water heater", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt.toLowerCase()).toContain("water heater");
  });

  it("HVAC prompt mentions furnace", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Cool Air Co",
      vertical: "hvac",
      agentName: "Sam",
    });
    expect(prompt.toLowerCase()).toContain("furnace");
  });

  it("HVAC prompt mentions AC", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Cool Air Co",
      vertical: "hvac",
      agentName: "Sam",
    });
    expect(prompt).toContain("AC");
  });

  it("HVAC prompt mentions heating", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Cool Air Co",
      vertical: "hvac",
      agentName: "Sam",
    });
    expect(prompt.toLowerCase()).toContain("heating");
  });

  it("all verticals use price range language (never exact prices)", () => {
    const verticals = ["plumbing", "hvac"] as const;
    for (const v of verticals) {
      const prompt = getPhoneAgentPrompt({
        businessName: "Test Biz",
        vertical: v,
        agentName: "Bot",
      });
      expect(prompt).toContain("price RANGES");
      expect(prompt).toContain("NEVER quote exact prices");
    }
  });

  it("generic vertical also includes disclosure and price range rule", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Clean Sweep",
      vertical: "cleaning",
      agentName: "Tidy",
    });
    const expectedDisclosure = AI_DISCLOSURE_PREFIX.replace("{businessName}", "Clean Sweep");
    expect(prompt).toContain(expectedDisclosure);
    expect(prompt).toContain("price RANGES");
  });

  it("includes the agent name in the prompt", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "Test Biz",
      vertical: "plumbing",
      agentName: "BotAlpha",
    });
    expect(prompt).toContain("BotAlpha");
  });

  it("includes the business name in the prompt body", () => {
    const prompt = getPhoneAgentPrompt({
      businessName: "SuperPlumb Inc",
      vertical: "plumbing",
      agentName: "AI",
    });
    expect(prompt).toContain("SuperPlumb Inc");
  });
});

// ─── getSmsAgentPrompt ──────────────────────────────────────────────

describe("getSmsAgentPrompt", () => {
  it("enforces concise messaging (160 characters)", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt).toContain("160 characters");
  });

  it("mentions max 320 characters", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt).toContain("320 characters");
  });

  it("includes call-to-action requirement", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Acme Plumbing",
      vertical: "plumbing",
      agentName: "Alex",
    });
    expect(prompt.toLowerCase()).toContain("call-to-action");
  });

  it("suggests phone call for complex conversations", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Test Biz",
      vertical: "hvac",
      agentName: "Sam",
    });
    expect(prompt.toLowerCase()).toContain("phone call");
  });

  it("SMS prompt also includes price range compliance", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Test Biz",
      vertical: "plumbing",
      agentName: "Bot",
    });
    expect(prompt).toContain("price RANGES");
  });

  it("includes the business name", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "FixIt Fast",
      vertical: "plumbing",
      agentName: "Helper",
    });
    expect(prompt).toContain("FixIt Fast");
  });

  it("includes agent name for introduction", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "FixIt Fast",
      vertical: "plumbing",
      agentName: "Helper",
    });
    expect(prompt).toContain("Helper");
  });

  it("generic vertical SMS prompt still has SMS rules", () => {
    const prompt = getSmsAgentPrompt({
      businessName: "Clean Co",
      vertical: "cleaning",
      agentName: "Tidy",
    });
    expect(prompt).toContain("160 characters");
    expect(prompt).toContain("320 characters");
  });
});
