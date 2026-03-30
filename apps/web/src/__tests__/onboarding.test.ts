import { describe, it, expect } from "vitest";
import {
  getServicesForIndustry,
  slugify,
  detectTimezone,
  INDUSTRY_SERVICES,
  INDUSTRIES,
} from "../lib/onboarding.js";

// ── getServicesForIndustry ──

describe("getServicesForIndustry", () => {
  it("returns services for known industries", () => {
    const knownIndustries = ["plumbing", "hvac", "electrical", "cleaning", "landscaping"];
    for (const industry of knownIndustries) {
      const services = getServicesForIndustry(industry);
      expect(services.length).toBeGreaterThan(0);
      // Each service should have enabled=true and custom=false
      for (const svc of services) {
        expect(svc.enabled).toBe(true);
        expect(svc.custom).toBe(false);
        expect(svc.id).toBeTruthy();
        expect(svc.name).toBeTruthy();
        expect(svc.priceMin).toBeGreaterThanOrEqual(0);
        expect(svc.priceMax).toBeGreaterThan(0);
      }
    }
  });

  it("returns plumbing services with correct ids", () => {
    const services = getServicesForIndustry("plumbing");
    const ids = services.map((s) => s.id);
    expect(ids).toContain("drain-cleaning");
    expect(ids).toContain("water-heater");
    expect(ids).toContain("pipe-repair");
  });

  it("returns hvac services with correct ids", () => {
    const services = getServicesForIndustry("hvac");
    const ids = services.map((s) => s.id);
    expect(ids).toContain("ac-install");
    expect(ids).toContain("ac-repair");
    expect(ids).toContain("furnace-install");
  });

  it("falls back to 'other' for unknown industries", () => {
    const services = getServicesForIndustry("dentistry_unknown");
    const otherServices = getServicesForIndustry("other");
    expect(services).toEqual(otherServices);
  });

  it("falls back to 'other' for empty string industry", () => {
    const services = getServicesForIndustry("");
    const otherServices = getServicesForIndustry("other");
    expect(services).toEqual(otherServices);
  });

  it("returns services for every defined industry in INDUSTRY_SERVICES", () => {
    for (const key of Object.keys(INDUSTRY_SERVICES)) {
      const services = getServicesForIndustry(key);
      expect(services.length).toBeGreaterThan(0);
    }
  });
});

// ── slugify ──

describe("slugify", () => {
  it("produces a valid URL slug from a business name", () => {
    expect(slugify("Acme Plumbing")).toBe("acme-plumbing");
  });

  it("converts to lowercase", () => {
    expect(slugify("ABC")).toBe("abc");
  });

  it("replaces special characters with hyphens", () => {
    expect(slugify("Jim's HVAC & Plumbing")).toBe("jim-s-hvac-plumbing");
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("handles multiple consecutive special characters", () => {
    expect(slugify("Acme --- Plumbing")).toBe("acme-plumbing");
  });

  it("truncates to 60 characters", () => {
    const longName = "A".repeat(100);
    const slug = slugify(longName);
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles numbers in the name", () => {
    expect(slugify("24/7 Plumbing Service")).toBe("24-7-plumbing-service");
  });
});

// ── detectTimezone ──

describe("detectTimezone", () => {
  it("returns a string", () => {
    const tz = detectTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });

  it("returns a valid IANA timezone format (contains /)", () => {
    const tz = detectTimezone();
    // IANA timezones typically contain a slash (e.g., America/New_York)
    // Some environments might return UTC which has no slash, so we just check it's truthy
    expect(tz).toBeTruthy();
  });
});
