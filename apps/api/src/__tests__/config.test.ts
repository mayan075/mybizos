import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

/**
 * We test the env schema logic directly rather than importing config.ts,
 * because config.ts calls loadConfig() at import time which reads process.env.
 * Instead we replicate the schema and test its validation behavior.
 */

describe("API config env schema", () => {
  // Replicate the schema from config.ts so we can test in isolation
  function buildEnvSchema(isDev: boolean) {
    const optionalInDev = (schema: z.ZodString) =>
      isDev ? schema.default("") : schema.min(1);

    return z.object({
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      PORT: z.coerce.number().default(3001),
      DATABASE_URL: optionalInDev(z.string()),
      REDIS_URL: optionalInDev(z.string()),
      JWT_SECRET: isDev
        ? z.string().default("dev-jwt-secret-change-in-production-must-be-32-chars")
        : z.string().min(32),
      CORS_ORIGIN: z.string().default("http://localhost:3000"),
      APP_URL: z.string().default("http://localhost:3001"),
      TWILIO_ACCOUNT_SID: optionalInDev(z.string()),
      TWILIO_AUTH_TOKEN: optionalInDev(z.string()),
      TWILIO_PHONE_NUMBER: optionalInDev(z.string()),
      ANTHROPIC_API_KEY: optionalInDev(z.string()),
      RESEND_API_KEY: optionalInDev(z.string()),
      RESEND_DEFAULT_FROM: z.string().default("HararAI <notifications@resend.dev>"),
      STRIPE_SECRET_KEY: optionalInDev(z.string()),
      STRIPE_WEBHOOK_SECRET: optionalInDev(z.string()),
      VAPI_API_KEY: optionalInDev(z.string()),
      VAPI_WEBHOOK_SECRET: optionalInDev(z.string()),
      ENABLE_SCHEDULER: z
        .enum(["true", "false", ""])
        .default("")
        .transform((v) => v === "true"),
    });
  }

  describe("development mode (isDev = true)", () => {
    const schema = buildEnvSchema(true);

    it("provides defaults for all fields when no env vars are set", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
        expect(result.data.PORT).toBe(3001);
        expect(result.data.CORS_ORIGIN).toBe("http://localhost:3000");
        expect(result.data.APP_URL).toBe("http://localhost:3001");
        expect(result.data.DATABASE_URL).toBe("");
        expect(result.data.REDIS_URL).toBe("");
        expect(result.data.JWT_SECRET).toBe(
          "dev-jwt-secret-change-in-production-must-be-32-chars",
        );
        expect(result.data.ENABLE_SCHEDULER).toBe(false);
      }
    });

    it("accepts valid env vars", () => {
      const result = schema.safeParse({
        NODE_ENV: "development",
        PORT: "4000",
        DATABASE_URL: "postgres://localhost:5432/hararai",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "super-secret-key-that-is-long-enough",
        ANTHROPIC_API_KEY: "sk-ant-test",
        ENABLE_SCHEDULER: "true",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(4000);
        expect(result.data.ENABLE_SCHEDULER).toBe(true);
      }
    });

    it("coerces PORT from string to number", () => {
      const result = schema.safeParse({ PORT: "8080" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
      }
    });

    it("transforms ENABLE_SCHEDULER to boolean", () => {
      const trueResult = schema.safeParse({ ENABLE_SCHEDULER: "true" });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) expect(trueResult.data.ENABLE_SCHEDULER).toBe(true);

      const falseResult = schema.safeParse({ ENABLE_SCHEDULER: "false" });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) expect(falseResult.data.ENABLE_SCHEDULER).toBe(false);

      const emptyResult = schema.safeParse({ ENABLE_SCHEDULER: "" });
      expect(emptyResult.success).toBe(true);
      if (emptyResult.success) expect(emptyResult.data.ENABLE_SCHEDULER).toBe(false);
    });

    it("rejects invalid NODE_ENV", () => {
      const result = schema.safeParse({ NODE_ENV: "staging" });
      expect(result.success).toBe(false);
    });
  });

  describe("production mode (isDev = false)", () => {
    const schema = buildEnvSchema(false);

    it("rejects empty config in production", () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects missing DATABASE_URL in production", () => {
      const result = schema.safeParse({
        NODE_ENV: "production",
        REDIS_URL: "redis://prod:6379",
        JWT_SECRET: "a".repeat(32),
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_PHONE_NUMBER: "+15551234567",
        ANTHROPIC_API_KEY: "sk-ant-prod",
        RESEND_API_KEY: "re_prod",
        STRIPE_SECRET_KEY: "sk_live_test",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        VAPI_API_KEY: "vapi_test",
        VAPI_WEBHOOK_SECRET: "vapi_secret",
      });
      expect(result.success).toBe(false);
    });

    it("rejects JWT_SECRET shorter than 32 characters in production", () => {
      const result = schema.safeParse({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://prod:5432/hararai",
        REDIS_URL: "redis://prod:6379",
        JWT_SECRET: "short",
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_PHONE_NUMBER: "+15551234567",
        ANTHROPIC_API_KEY: "sk-ant-prod",
        RESEND_API_KEY: "re_prod",
        STRIPE_SECRET_KEY: "sk_live_test",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        VAPI_API_KEY: "vapi_test",
        VAPI_WEBHOOK_SECRET: "vapi_secret",
      });
      expect(result.success).toBe(false);
    });

    it("accepts fully populated production config", () => {
      const result = schema.safeParse({
        NODE_ENV: "production",
        PORT: "3001",
        DATABASE_URL: "postgres://prod:5432/hararai",
        REDIS_URL: "redis://prod:6379",
        JWT_SECRET: "a".repeat(32),
        CORS_ORIGIN: "https://app.hararai.com",
        APP_URL: "https://api.hararai.com",
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_PHONE_NUMBER: "+15551234567",
        ANTHROPIC_API_KEY: "sk-ant-prod",
        RESEND_API_KEY: "re_prod",
        RESEND_DEFAULT_FROM: "HararAI <noreply@hararai.com>",
        STRIPE_SECRET_KEY: "sk_live_test",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        VAPI_API_KEY: "vapi_test",
        VAPI_WEBHOOK_SECRET: "vapi_secret",
        ENABLE_SCHEDULER: "true",
      });
      expect(result.success).toBe(true);
    });
  });
});
