/**
 * AI Onboarding Agent
 *
 * This agent conducts a conversational onboarding flow, using Claude's tool_use
 * to progressively configure the platform for a new business. It works for ANY
 * industry by combining curated templates with AI reasoning.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const ONBOARDING_SYSTEM_PROMPT = `You are HararAI's onboarding assistant. Your job is to have a friendly, efficient conversation with a new business owner and configure their entire platform in about 5 minutes.

## YOUR PERSONALITY
- Warm, professional, and encouraging
- Never overwhelm — one topic at a time
- Keep responses short (2-3 sentences max per turn)
- Use the business owner's name if they share it

## CONVERSATION FLOW
Guide the conversation through these phases naturally. Don't rush, but don't linger.

1. **Identity** (1-2 turns): "Tell me about your business — what do you do?"
   → Call set_business_profile with whatever you learn

2. **Services** (2-3 turns): "What services do you offer? Roughly what do they cost?"
   → Call add_service for each service mentioned
   → If they're unsure about pricing, use suggest_from_industry to fill in typical ranges

3. **Hours** (1-2 turns): "What are your business hours?"
   → Call set_business_hours

4. **Workflow** (1-2 turns): "Walk me through what happens from first contact to job done"
   → Call set_pipeline_stages based on their description

5. **AI Agent** (1 turn): "Last thing — how should your AI receptionist sound? Professional, friendly, or casual?"
   → Call configure_ai_agent

6. **Wrap up**: "You're all set! Here's what I've configured. Click any section on the right to adjust, or hit Launch to get started."

## CRITICAL RULES

1. **NEVER stall on missing information.** If the user says "I don't know" or is vague:
   - Use suggest_from_industry to fill in typical values for their industry
   - Mark those values as estimates (isEstimate: true for services)
   - Tell them: "No worries — I've set some typical defaults. You can change these anytime."
   - Move to the next topic

2. **Call tools DURING the conversation**, not after. Each user message may trigger 0-3 tool calls. The frontend shows updates in real-time.

3. **Complete setup in under 10 turns.** Don't ask more than 2 questions per phase.

4. **Stay on topic.** If asked non-onboarding questions, say: "Great question! Once we finish setting up, you'll have a full AI assistant to help with that. For now, let's get your platform configured."

5. **Be specific about what you configured.** After each tool call, briefly tell the user what you set up: "Got it — I've added drain cleaning at $150-350 and water heater repair at $200-500."

6. **Default business hours** if not discussed: Monday-Friday 9am-5pm, closed weekends.

7. **Default pipeline** if workflow isn't discussed: New Lead → Contacted → Quoted → Scheduled → Completed.
`;

/**
 * Tool definitions for the onboarding agent.
 * These are called by Claude during the conversation to progressively configure the platform.
 */
export const ONBOARDING_TOOLS: Tool[] = [
  {
    name: "set_business_profile",
    description: "Set core business information. Call this as soon as you learn about the business.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessName: { type: "string", description: "The business name" },
        industry: { type: "string", description: "Industry slug (e.g., 'plumbing', 'salon_spa', 'consulting')" },
        industryCategory: { type: "string", description: "Broad category (e.g., 'Trades & Home Services', 'Health & Wellness')" },
        location: { type: "string", description: "City, state, or region" },
        timezone: { type: "string", description: "IANA timezone (e.g., 'America/New_York')" },
        description: { type: "string", description: "Brief business description" },
        phone: { type: "string", description: "Business phone number" },
        website: { type: "string", description: "Business website URL" },
      },
      required: ["industry"],
    },
  },
  {
    name: "add_service",
    description: "Add a service the business offers. Call once per service.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Service name" },
        priceMin: { type: "number", description: "Minimum price in dollars" },
        priceMax: { type: "number", description: "Maximum price in dollars" },
        durationMinutes: { type: "number", description: "Typical duration in minutes" },
        description: { type: "string", description: "Brief description of the service" },
        isEstimate: { type: "boolean", description: "True if the price was AI-suggested rather than user-provided" },
      },
      required: ["name", "priceMin", "priceMax"],
    },
  },
  {
    name: "set_business_hours",
    description: "Set operating hours for the business.",
    input_schema: {
      type: "object" as const,
      properties: {
        monday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        tuesday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        wednesday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        thursday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        friday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        saturday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
        sunday: {
          type: "object",
          properties: { open: { type: "boolean" }, start: { type: "string" }, end: { type: "string" } },
          required: ["open"],
        },
      },
      required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    },
  },
  {
    name: "set_pipeline_stages",
    description: "Configure the sales/service pipeline stages. Call after understanding the business workflow.",
    input_schema: {
      type: "object" as const,
      properties: {
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Stage name (e.g., 'New Lead', 'Quoted', 'Scheduled')" },
              order: { type: "number", description: "Stage order (0-based)" },
            },
            required: ["name", "order"],
          },
          description: "Ordered list of pipeline stages",
        },
      },
      required: ["stages"],
    },
  },
  {
    name: "configure_ai_agent",
    description: "Set up the AI phone agent's personality and behavior.",
    input_schema: {
      type: "object" as const,
      properties: {
        greeting: { type: "string", description: "The AI agent's opening greeting on phone calls" },
        tone: { type: "string", enum: ["professional", "friendly", "casual"], description: "Communication style" },
        emergencyKeywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords that trigger urgent alerts (e.g., 'flooding', 'gas leak')",
        },
        knowledgeBase: {
          type: "array",
          items: { type: "string" },
          description: "Key facts about the business the AI should know",
        },
      },
      required: ["greeting", "tone"],
    },
  },
  {
    name: "suggest_from_industry",
    description: "When the user is uncertain about details, use this to load industry-typical defaults. This will auto-populate services, pipeline stages, or hours based on the business type.",
    input_schema: {
      type: "object" as const,
      properties: {
        industry: { type: "string", description: "The industry to load defaults for" },
        component: {
          type: "string",
          enum: ["services", "pipeline", "hours", "emergency_keywords", "all"],
          description: "Which component to suggest defaults for",
        },
      },
      required: ["industry", "component"],
    },
  },
];
