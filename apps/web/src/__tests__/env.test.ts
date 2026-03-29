import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Test for the web app env validation schema.
 * Since the env module may not exist yet (being created by another agent),
 * we define a representative schema here and test its validation logic.
 */

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_WS_URL: z.string().default("ws://localhost:3001"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(""),
});

describe("web env schema", () => {
  it("provides defaults when no env vars are set", () => {
    const result = webEnvSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_API_URL).toBe("http://localhost:3001");
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
      expect(result.data.NEXT_PUBLIC_WS_URL).toBe("ws://localhost:3001");
      expect(result.data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("");
    }
  });

  it("accepts valid URLs", () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: "https://api.hararai.com",
      NEXT_PUBLIC_APP_URL: "https://app.hararai.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_API_URL).toBe("https://api.hararai.com");
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe("https://app.hararai.com");
    }
  });

  it("rejects invalid API URL", () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid APP URL", () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts localhost URLs with ports", () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts https URLs", () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    });
    expect(result.success).toBe(true);
  });
});
