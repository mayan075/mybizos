/**
 * Onboarding Chat API Route
 *
 * POST /onboarding/chat — Process a chat message for AI onboarding.
 * No org scope needed (org doesn't exist yet during onboarding).
 * Returns JSON with the assistant response and config updates.
 *
 * POST /onboarding/finalize — Persist the final config to the database.
 * Requires authentication (user must be registered).
 */

import { Hono } from "hono";
import { z } from "zod";
import { processOnboardingChat } from "../services/onboarding-ai-service.js";
import { processOnboardingData } from "../services/onboarding-service.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { logger } from "../middleware/logger.js";
import { createEmptyOnboardingConfig } from "@hararai/shared";
import type { OnboardingConfig, OnboardingServiceConfig } from "@hararai/shared";

const onboardingChat = new Hono();

// Rate limit unauthenticated chat: 20 messages per minute per IP
const chatLimiter = rateLimit(20, 60 * 1000);

const onboardingConfigSchema = z.object({
  businessName: z.string().max(200).optional().default(""),
  industry: z.string().max(100).optional().default(""),
  industryCategory: z.string().max(50).optional().default(""),
  timezone: z.string().max(50).optional().default(""),
  services: z.array(z.object({
    name: z.string().max(200),
    description: z.string().max(1000).optional().nullable(),
    durationMinutes: z.number().int().min(5).max(480).optional().nullable(),
    pricingMode: z.string().max(20).optional().nullable(),
    pricingUnit: z.string().max(20).optional().nullable(),
    priceMin: z.number().min(0).max(1_000_000).optional().nullable(),
    priceMax: z.number().min(0).max(1_000_000).optional().nullable(),
  })).max(50).optional().default([]),
  hours: z.record(z.string(), z.object({
    open: z.boolean(),
    start: z.string().max(10),
    end: z.string().max(10),
  })).optional().nullable(),
  aiAgent: z.object({
    tone: z.string().max(50).optional(),
    greeting: z.string().max(500).optional(),
    emergencyKeywords: z.array(z.string().max(50)).max(20).optional(),
    knowledgeBase: z.array(z.string().max(2000)).max(20).optional(),
  }).optional().nullable(),
}).passthrough();

const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(10000),
  })).max(50).default([]),
  config: onboardingConfigSchema.nullable().default(null),
});

const finalizeRequestSchema = z.object({
  config: onboardingConfigSchema,
});

/**
 * POST /onboarding/chat — Send a message to the onboarding AI
 */
onboardingChat.post("/chat", chatLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", status: 422 },
        422,
      );
    }

    const currentConfig: OnboardingConfig = parsed.data.config
      ? { ...createEmptyOnboardingConfig(), ...parsed.data.config }
      : createEmptyOnboardingConfig();

    const result = await processOnboardingChat(
      parsed.data.history,
      parsed.data.message,
      currentConfig,
    );

    return c.json({
      data: {
        message: result.assistantMessage,
        configUpdates: result.configUpdates,
        config: result.config,
      },
    });
  } catch (err) {
    logger.error("Onboarding chat error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: "Failed to process message", code: "CHAT_ERROR", status: 500 },
      500,
    );
  }
});

/**
 * POST /onboarding/finalize — Persist the AI-configured onboarding data
 * Requires authentication — the user must be logged in.
 */
onboardingChat.post("/finalize", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const orgId = c.get("orgId");

    if (!orgId) {
      return c.json(
        { error: "No organization found", code: "NO_ORG", status: 400 },
        400,
      );
    }

    const body = await c.req.json();
    const parsed = finalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", status: 422 },
        422,
      );
    }

    const config = { ...createEmptyOnboardingConfig(), ...parsed.data.config } as OnboardingConfig;

    // Convert OnboardingConfig to the format expected by processOnboardingData
    const onboardingData = {
      businessName: config.businessName,
      industry: config.industry,
      industryCategory: config.industryCategory,
      timezone: config.timezone,
      services: config.services.map((s: OnboardingServiceConfig) => ({ name: s.name, enabled: true })),
      hours: config.hours ? (config.hours as unknown as Record<string, { open: boolean; start: string; end: string }>) : undefined,
    };

    await processOnboardingData(orgId, onboardingData);

    // Create AI agent if configured
    if (config.aiAgent) {
      try {
        const { db, aiAgents } = await import("@hararai/db");

        await db.insert(aiAgents).values({
          orgId,
          type: "phone",
          name: "AI Receptionist",
          systemPrompt: buildAgentPromptFromConfig(config),
          industry: config.industry || "general",
          settings: {
            tone: config.aiAgent.tone,
            greeting: config.aiAgent.greeting,
            emergencyKeywords: config.aiAgent.emergencyKeywords,
            services: config.services.map((s: OnboardingServiceConfig) => ({
              name: s.name,
              priceLow: s.priceMin,
              priceHigh: s.priceMax,
            })),
          },
          isActive: true,
        });

        logger.info("AI agent created from onboarding", { orgId });
      } catch (agentErr) {
        logger.warn("Failed to create AI agent from onboarding", {
          orgId,
          error: agentErr instanceof Error ? agentErr.message : String(agentErr),
        });
      }
    }

    // Create bookable services
    if (config.services.length > 0) {
      try {
        const { db, bookableServices } = await import("@hararai/db");

        await db.insert(bookableServices).values(
          config.services.map((s: OnboardingServiceConfig) => ({
            orgId,
            name: s.name,
            description: s.description || null,
            durationMinutes: s.durationMinutes || 60,
            bufferMinutes: 15,
            pricingMode: s.pricingMode || "range",
            pricingUnit: s.pricingUnit || "job",
            priceMin: s.priceMin || null,
            priceMax: s.priceMax || null,
            isActive: true,
          })),
        );

        logger.info("Bookable services created from onboarding", {
          orgId,
          count: config.services.length,
        });
      } catch (serviceErr) {
        logger.warn("Failed to create bookable services from onboarding", {
          orgId,
          error: serviceErr instanceof Error ? serviceErr.message : String(serviceErr),
        });
      }
    }

    return c.json({ data: { success: true, message: "Onboarding complete!" } });
  } catch (err) {
    logger.error("Onboarding finalize error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      { error: "Failed to finalize onboarding", code: "FINALIZE_ERROR", status: 500 },
      500,
    );
  }
});

/**
 * Build a system prompt for the AI phone agent from the onboarding config.
 */
function buildAgentPromptFromConfig(config: OnboardingConfig): string {
  const businessName = config.businessName || "our business";
  const industry = config.industry || "general";
  const tone = config.aiAgent?.tone || "friendly";

  const servicesBlock = config.services.length > 0
    ? config.services.map((s: OnboardingServiceConfig) => `- ${s.name}: $${s.priceMin}-$${s.priceMax}`).join("\n")
    : "- Ask the customer what service they need and offer to provide a quote";

  const emergencyKeywords = config.aiAgent?.emergencyKeywords?.join(", ") || "emergency, urgent";

  const knowledgeBlock = config.aiAgent?.knowledgeBase?.length
    ? config.aiAgent.knowledgeBase.map((k: string) => `- ${k}`).join("\n")
    : "";

  return `You are a ${tone} AI phone assistant for ${businessName}, a ${industry.replace(/_/g, " ")} business.

CALL HANDLING RULES:
1. Start every call with: "${config.aiAgent?.greeting || `Hi, this is ${businessName}'s AI assistant. This call may be recorded. How can I help you today?`}"
2. This call may be recorded — mention this in your greeting.
3. Only provide price RANGES, never exact prices.
4. If the customer mentions any emergency keyword (${emergencyKeywords}), immediately acknowledge the emergency and alert the team.
5. Always be ${tone} and conversational.
6. Collect customer name, phone number, and details when booking appointments.
7. Confirm all appointment details before finalizing.
8. You are an AI assistant — never claim to be human.
9. If you can't understand after 2 attempts, offer to transfer to a team member.

SERVICES & PRICING:
${servicesBlock}

${knowledgeBlock ? `BUSINESS KNOWLEDGE:\n${knowledgeBlock}` : ""}

VOICE STYLE:
- Keep responses short and conversational (1-2 sentences at a time)
- Sound ${tone}, not scripted or robotic
- Use natural language — "sure", "absolutely", "no worries"
- End calls warmly: "Thanks for calling ${businessName}. Have a great day!"`.trim();
}

export { onboardingChat as onboardingChatRoutes };
