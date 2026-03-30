import type { AgentSettings, AgentTone, Vertical } from '../types/index.js';
import { VERTICAL_TEMPLATES, type VerticalTemplate } from './verticals.js';

export { VERTICAL_TEMPLATES, type VerticalTemplate } from './verticals.js';

const TONE_MAP: Record<AgentTone, string> = {
  professional: 'professional and polished',
  friendly: 'friendly and casual',
  balanced: 'warm and professional',
};

function buildServicesBlock(services: AgentSettings['services']): string {
  if (services.length === 0) {
    return '- Ask the customer what service they need and offer to provide a quote';
  }
  return services
    .map((s) => `- ${s.name}: $${s.priceLow}\u2013$${s.priceHigh}`)
    .join('\n');
}

export interface PromptBuildInput {
  agentName: string;
  businessName: string;
  vertical: Vertical;
  settings: AgentSettings;
}

export function buildPromptFromTemplate(input: PromptBuildInput): string {
  const { agentName, businessName, vertical, settings } = input;
  const verticalTemplate = VERTICAL_TEMPLATES[vertical] ?? VERTICAL_TEMPLATES.general_contractor;
  const tone = TONE_MAP[settings.tone] ?? TONE_MAP.balanced;
  const servicesBlock = buildServicesBlock(settings.services);
  const emergencyKeywords = settings.emergencyKeywords.join(', ');

  const greeting = settings.greeting ||
    `Hi, this is ${agentName} from ${businessName}. This call may be recorded. How can I help you today?`;

  return `You are ${agentName}, a ${tone} AI phone assistant for ${businessName}.

CALL HANDLING RULES:
1. Start every call with: "${greeting}"
2. This call may be recorded \u2014 mention this in your greeting.
3. Be patient with audio quality \u2014 phone calls can have background noise. Ask callers to repeat if needed, but do NOT escalate to a human unless the caller explicitly asks or you cannot understand after ${settings.escalationThreshold} attempts.
4. Only provide price RANGES, never exact prices.
5. If the customer mentions any emergency keyword (${emergencyKeywords}), immediately acknowledge the emergency and let them know you're alerting the team.
6. Always be professional, warm, and conversational.
7. Collect customer name, phone number, and address when booking appointments.
8. Confirm all appointment details before finalizing.
9. You are an AI assistant \u2014 never claim to be human.

${verticalTemplate.knowledge}

SERVICES & PRICING:
${servicesBlock}

VOICE STYLE:
- Keep responses short and conversational (1-2 sentences at a time)
- Sound ${tone}, not scripted or robotic
- Use natural language \u2014 "sure", "absolutely", "no worries"
- Wait for the caller to finish speaking before responding
- If the caller goes quiet, gently prompt: "Are you still there?"
- End calls warmly: "Thanks for calling ${businessName}. Have a great day!"`.trim();
}

export function getVerticalDefaults(vertical: Vertical): VerticalTemplate {
  return VERTICAL_TEMPLATES[vertical] ?? VERTICAL_TEMPLATES.general_contractor;
}

export interface PromptValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export function validatePromptCompliance(prompt: string): PromptValidationIssue[] {
  const issues: PromptValidationIssue[] = [];
  const lower = prompt.toLowerCase();

  const aiTerms = ['ai assistant', 'ai receptionist', 'ai phone assistant', 'artificial intelligence', 'ai agent'];
  if (!aiTerms.some((term) => lower.includes(term))) {
    issues.push({
      type: 'error',
      message: 'Your prompt must instruct the agent to disclose that it\'s an AI. This is a legal requirement.',
    });
  }

  const exactPricePattern = /\$\d+(?!\s*[\u2013\u2014\-])/;
  if (exactPricePattern.test(prompt)) {
    issues.push({
      type: 'warning',
      message: 'We noticed what looks like exact pricing. AI agents should only quote price ranges to avoid liability.',
    });
  }

  if (!lower.includes('record')) {
    issues.push({
      type: 'warning',
      message: 'Consider mentioning that calls may be recorded in your prompt.',
    });
  }

  if (!lower.includes('emergency') && !lower.includes('urgent')) {
    issues.push({
      type: 'warning',
      message: 'Consider adding emergency handling instructions to your prompt.',
    });
  }

  return issues;
}
