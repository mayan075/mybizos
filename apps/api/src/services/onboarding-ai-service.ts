/**
 * Onboarding AI Service
 *
 * Manages the conversational onboarding flow using Claude with tool_use.
 * Handles tool execution, config accumulation, and SSE streaming.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { ONBOARDING_SYSTEM_PROMPT, ONBOARDING_TOOLS } from "@hararai/ai";
import { findBestTemplate, INDUSTRY_TEMPLATES } from "@hararai/shared";
import type {
  OnboardingConfig,
  OnboardingServiceConfig,
  OnboardingHoursConfig,
  OnboardingPipelineStage,
  OnboardingAiAgentConfig,
  OnboardingFollowUpStep,
} from "@hararai/shared";
import { createEmptyOnboardingConfig } from "@hararai/shared";
import { config as appConfig } from "../config.js";
import { logger } from "../middleware/logger.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OnboardingChatResult {
  assistantMessage: string;
  configUpdates: Array<{ toolName: string; config: Partial<OnboardingConfig> }>;
  config: OnboardingConfig;
}

/**
 * Execute a tool call from Claude and return the config update.
 */
function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  currentConfig: OnboardingConfig,
): { result: string; configUpdate: Partial<OnboardingConfig> } {
  switch (toolName) {
    case "set_business_profile": {
      const update: Partial<OnboardingConfig> = {};
      if (input.businessName) update.businessName = input.businessName as string;
      if (input.industry) update.industry = input.industry as string;
      if (input.industryCategory) update.industryCategory = input.industryCategory as string;
      if (input.location) update.location = input.location as string;
      if (input.timezone) update.timezone = input.timezone as string;
      if (input.description) update.description = input.description as string;
      if (input.phone) update.phone = input.phone as string;
      if (input.website) update.website = input.website as string;
      return { result: `Business profile updated: ${input.businessName || ""}`, configUpdate: update };
    }

    case "add_service": {
      const service: OnboardingServiceConfig = {
        name: (input.name as string) || "Service",
        priceMin: (input.priceMin as number) || 0,
        priceMax: (input.priceMax as number) || 0,
        durationMinutes: (input.durationMinutes as number) || 60,
        description: (input.description as string) || "",
        isEstimate: (input.isEstimate as boolean) || false,
      };
      const services = [...currentConfig.services, service];
      return { result: `Added service: ${service.name} ($${service.priceMin}-$${service.priceMax})`, configUpdate: { services } };
    }

    case "set_business_hours": {
      const hours = input as unknown as OnboardingHoursConfig;
      return { result: "Business hours configured", configUpdate: { hours } };
    }

    case "set_pipeline_stages": {
      const stages = (input.stages as OnboardingPipelineStage[]) || [];
      return { result: `Pipeline configured with ${stages.length} stages`, configUpdate: { pipelineStages: stages } };
    }

    case "configure_ai_agent": {
      const agentConfig: OnboardingAiAgentConfig = {
        greeting: (input.greeting as string) || "",
        tone: (input.tone as "professional" | "friendly" | "casual") || "friendly",
        emergencyKeywords: (input.emergencyKeywords as string[]) || [],
        knowledgeBase: (input.knowledgeBase as string[]) || [],
      };
      return { result: "AI agent configured", configUpdate: { aiAgent: agentConfig } };
    }

    case "suggest_from_industry": {
      const industry = (input.industry as string) || "general";
      const component = (input.component as string) || "all";
      const template = findBestTemplate(industry);
      const update: Partial<OnboardingConfig> = {};

      if (component === "services" || component === "all") {
        const suggestedServices: OnboardingServiceConfig[] = template.defaultServices.map((s) => ({
          name: s.name,
          priceMin: s.priceLow,
          priceMax: s.priceHigh,
          durationMinutes: 60,
          description: "",
          isEstimate: true,
        }));
        update.services = [...currentConfig.services, ...suggestedServices];
      }

      if (component === "pipeline" || component === "all") {
        update.pipelineStages = [
          { name: "New Lead", order: 0 },
          { name: "Contacted", order: 1 },
          { name: "Quoted", order: 2 },
          { name: "Scheduled", order: 3 },
          { name: "Completed", order: 4 },
        ];
      }

      if (component === "hours" || component === "all") {
        const weekday = { open: true, start: "09:00", end: "17:00" };
        const weekend = { open: false, start: "09:00", end: "17:00" };
        update.hours = {
          monday: weekday, tuesday: weekday, wednesday: weekday,
          thursday: weekday, friday: weekday, saturday: weekend, sunday: weekend,
        };
      }

      if (component === "emergency_keywords" || component === "all") {
        if (!currentConfig.aiAgent) {
          update.aiAgent = {
            greeting: `Hi, this is ${currentConfig.businessName || "our"} AI assistant. How can I help you today?`,
            tone: "friendly",
            emergencyKeywords: template.defaultEmergencyKeywords,
            knowledgeBase: [],
          };
        }
      }

      return {
        result: `Loaded ${component} defaults for ${industry} industry. ${template.defaultServices.length} services suggested.`,
        configUpdate: update,
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}`, configUpdate: {} };
  }
}

/**
 * Process a single onboarding chat turn.
 * Sends the message to Claude, handles tool calls, and returns the response.
 */
export async function processOnboardingChat(
  history: ChatMessage[],
  userMessage: string,
  currentConfig: OnboardingConfig,
): Promise<OnboardingChatResult> {
  const client = new Anthropic({ apiKey: appConfig.ANTHROPIC_API_KEY });

  // Build messages array
  const messages: MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });

  const configUpdates: Array<{ toolName: string; config: Partial<OnboardingConfig> }> = [];
  let assistantMessage = "";
  let workingConfig = { ...currentConfig };

  // Claude may make multiple rounds of tool calls before producing a final text response
  let continueLoop = true;
  while (continueLoop) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: ONBOARDING_SYSTEM_PROMPT,
      tools: ONBOARDING_TOOLS,
      messages,
    });

    // Process response content blocks
    const toolResults: ToolResultBlockParam[] = [];
    const assistantContent: ContentBlockParam[] = [];

    for (const block of response.content) {
      assistantContent.push(block as ContentBlockParam);

      if (block.type === "text") {
        assistantMessage += block.text;
      } else if (block.type === "tool_use") {
        const { result, configUpdate } = executeTool(
          block.name,
          block.input as Record<string, unknown>,
          workingConfig,
        );

        // Apply update to working config
        workingConfig = { ...workingConfig, ...configUpdate };
        configUpdates.push({ toolName: block.name, config: configUpdate });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });

        logger.info("Onboarding tool executed", { tool: block.name, result });
      }
    }

    // Add assistant message to conversation
    messages.push({ role: "assistant", content: assistantContent });

    // If there were tool calls, send results back and continue
    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }

    // Stop if there are no more tool calls (Claude produced final text)
    continueLoop = response.stop_reason === "tool_use";
  }

  return {
    assistantMessage,
    configUpdates,
    config: workingConfig,
  };
}
