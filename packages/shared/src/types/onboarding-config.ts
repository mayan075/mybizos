/**
 * Types for the AI-powered conversational onboarding system.
 * The AI progressively builds this config object during the onboarding chat.
 */

export interface OnboardingServiceConfig {
  name: string;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
  description: string;
  isEstimate: boolean; // true = AI suggested this, not user-provided
}

export interface OnboardingHoursConfig {
  monday: { open: boolean; start: string; end: string };
  tuesday: { open: boolean; start: string; end: string };
  wednesday: { open: boolean; start: string; end: string };
  thursday: { open: boolean; start: string; end: string };
  friday: { open: boolean; start: string; end: string };
  saturday: { open: boolean; start: string; end: string };
  sunday: { open: boolean; start: string; end: string };
}

export interface OnboardingPipelineStage {
  name: string;
  order: number;
}

export interface OnboardingAiAgentConfig {
  greeting: string;
  tone: "professional" | "friendly" | "casual";
  emergencyKeywords: string[];
  knowledgeBase: string[];
}

export interface OnboardingFollowUpStep {
  delayMinutes: number;
  channel: "sms" | "email";
  message: string;
}

/**
 * The full onboarding configuration that gets progressively built
 * through the AI conversation. All fields are optional since they
 * get filled in incrementally.
 */
export interface OnboardingConfig {
  // Business profile
  businessName?: string;
  industry?: string;
  industryCategory?: string;
  location?: string;
  timezone?: string;
  description?: string;
  phone?: string;
  website?: string;

  // Services
  services: OnboardingServiceConfig[];

  // Business hours
  hours?: OnboardingHoursConfig;

  // Pipeline
  pipelineStages: OnboardingPipelineStage[];

  // AI agent
  aiAgent?: OnboardingAiAgentConfig;

  // Follow-up sequence
  followUpSteps: OnboardingFollowUpStep[];
}

/**
 * SSE event types sent from the server to the client during onboarding chat.
 */
export type OnboardingSSEEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; toolName: string; config: Partial<OnboardingConfig> }
  | { type: "done"; config: OnboardingConfig }
  | { type: "error"; message: string };

/**
 * Creates an empty onboarding config.
 */
export function createEmptyOnboardingConfig(): OnboardingConfig {
  return {
    services: [],
    pipelineStages: [],
    followUpSteps: [],
  };
}
