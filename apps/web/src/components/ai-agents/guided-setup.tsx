'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mic, Rocket, Check } from 'lucide-react';
import {
  INDUSTRY_LABELS,
  GEMINI_VOICES,
  DEFAULT_AGENT_SETTINGS,
  getIndustryDefaults,
  buildPromptFromTemplate,
} from '@hararai/shared';
import type { GeminiVoice } from '@hararai/shared';
import { VoiceCard, usePrefetchVoiceSamples } from './voice-card';
import { useCreateAgent } from '@/lib/hooks/use-ai-agents';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuidedSetupProps {
  businessName: string;
  orgIndustry?: string;
}

// ── Progress Indicator ────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isCurrent = stepNum === current;

        return (
          <div key={stepNum} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                isDone
                  ? 'bg-blue-500 text-white'
                  : isCurrent
                  ? 'ring-2 ring-blue-500 bg-zinc-900 text-blue-400'
                  : 'bg-zinc-800 text-zinc-500',
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : stepNum}
            </div>
            {stepNum < total && (
              <div
                className={cn(
                  'h-px w-8 transition-all',
                  isDone ? 'bg-blue-500' : 'bg-zinc-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-zinc-100">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GuidedSetup({ businessName, orgIndustry }: GuidedSetupProps) {
  const router = useRouter();
  const toast = useToast();
  const { mutate, isLoading } = useCreateAgent();
  usePrefetchVoiceSamples(GEMINI_VOICES);

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [industry, setIndustry] = useState<string | null>(orgIndustry ?? null);
  const [agentName, setAgentName] = useState('');
  const [voiceName, setVoiceName] = useState<GeminiVoice>('Aoede');
  const [greeting, setGreeting] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function handleIndustrySelect(v: string) {
    setIndustry(v);
    const defaults = getIndustryDefaults(v);
    setAgentName(defaults.defaultAgentName);
  }

  function handleCreate() {
    if (!industry) return;

    const industryDefaults = getIndustryDefaults(industry);
    const settings = {
      ...DEFAULT_AGENT_SETTINGS,
      greeting,
      services: industryDefaults.defaultServices,
      emergencyKeywords: industryDefaults.defaultEmergencyKeywords,
      voiceConfig: {
        voice: voiceName,
        languageCode: 'en-US' as const,
      },
    };

    const systemPrompt = buildPromptFromTemplate({
      agentName,
      businessName,
      industry,
      settings,
    });

    const agentData = {
      name: agentName,
      type: 'phone' as const,
      industry,
      systemPrompt,
      settings,
      isActive: true,
    };

    mutate(agentData).then((result) => {
      if (!result) {
        toast.error('Failed to create agent. Please try again.');
        return;
      }
      // The API returns { data: agent } — handle both wrapped and unwrapped
      const agent = (result as { data?: { id: string }; id?: string });
      const id = agent.data?.id ?? agent.id;

      toast.success(`${agentName} is ready!`);
      router.push(`/dashboard/settings/ai-agents/${id}`);
    });
  }

  const defaultGreeting = `Hi, this is ${agentName || 'your AI receptionist'} from ${businessName}. This call may be recorded. How can I help you today?`;
  const industryDefaults = industry ? getIndustryDefaults(industry) : null;
  const servicesCount = industryDefaults?.defaultServices.length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {/* Back to AI Agents list */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/settings/ai-agents')}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI Agents
      </button>

      <StepIndicator current={step} total={3} />

      {/* ── Step 1: Business Info ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Tell us about your business</h2>
            <p className="text-sm text-zinc-400">
              We'll use this to configure your AI receptionist with the right knowledge and defaults.
            </p>
          </div>

          {/* Business name (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Business Name
            </label>
            <input
              type="text"
              disabled
              value={businessName}
              className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300 opacity-70 cursor-not-allowed"
            />
          </div>

          {/* Vertical picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Industry
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(INDUSTRY_LABELS).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleIndustrySelect(v)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    industry === v
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/40'
                      : 'border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!industry}
            onClick={() => setStep(2)}
            className={cn(
              'mt-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              industry
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed',
            )}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Agent Config ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Mic className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Meet your AI receptionist</h2>
            <p className="text-sm text-zinc-400">
              Give your agent a name and voice that fits your brand.
            </p>
          </div>

          {/* Agent name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="agent-name" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Agent Name
            </label>
            <input
              id="agent-name"
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Alex"
              className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          {/* Voice picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Voice
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GEMINI_VOICES.map((v) => (
                <VoiceCard
                  key={v}
                  voice={v}
                  selected={voiceName === v}
                  onSelect={() => setVoiceName(v)}
                />
              ))}
            </div>
          </div>

          {/* Greeting (optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="greeting" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Opening Greeting <span className="normal-case text-zinc-600">(optional)</span>
            </label>
            <textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              placeholder={defaultGreeting}
              className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!agentName.trim()}
              onClick={() => setStep(3)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                agentName.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed',
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Create ───────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Rocket className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Ready to go!</h2>
            <p className="text-sm text-zinc-400">
              Here's a summary of your new AI receptionist.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 divide-y divide-zinc-700/60">
            <SummaryRow label="Agent Name" value={agentName} />
            <SummaryRow label="Business" value={businessName} />
            <SummaryRow label="Industry" value={industry ? (INDUSTRY_LABELS[industry] ?? industry) : '—'} />
            <SummaryRow label="Voice" value={voiceName} />
            <SummaryRow label="Services" value={`${servicesCount} pre-configured`} />
          </div>

          <p className="text-center text-xs text-zinc-500">
            You can customise everything in detail after creation.
          </p>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCreate}
              className={cn(
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isLoading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500',
              )}
            >
              {isLoading ? 'Creating…' : 'Create & Activate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
