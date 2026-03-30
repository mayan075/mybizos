'use client';

import { cn } from '@/lib/utils';
import type { AgentSettings, AgentTone, GeminiVoice } from '@hararai/shared';
import { GEMINI_VOICES } from '@hararai/shared';
import { VoiceCard } from './voice-card';

// ── Tone options ─────────────────────────────────────────────────────────────

const TONE_OPTIONS: { value: AgentTone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Polished & formal'  },
  { value: 'balanced',     label: 'Balanced',     description: 'Warm & professional' },
  { value: 'friendly',     label: 'Friendly',     description: 'Casual & relaxed'   },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface VoicePersonalitySectionProps {
  voiceName: string;
  settings: AgentSettings;
  onVoiceChange: (name: string) => void;
  onSettingsChange: (partial: Partial<AgentSettings>) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VoicePersonalitySection({
  voiceName,
  settings,
  onVoiceChange,
  onSettingsChange,
  disabled,
}: VoicePersonalitySectionProps) {
  return (
    <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Voice &amp; Personality
      </h3>

      {/* Voice picker */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Agent Voice
        </label>
        <div className="grid grid-cols-4 gap-2">
          {GEMINI_VOICES.map((voice) => (
            <VoiceCard
              key={voice}
              voice={voice as GeminiVoice}
              selected={voiceName === voice}
              onSelect={() => onVoiceChange(voice)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Greeting */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Opening Greeting
        </label>
        <textarea
          value={settings.greeting}
          onChange={(e) => onSettingsChange({ greeting: e.target.value })}
          disabled={disabled}
          rows={3}
          placeholder={`Hi, this is [Agent Name] from [Business Name]. This call may be recorded. How can I help you today?`}
          className={cn(
            'w-full resize-none rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
            'border-zinc-700 placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <p className="text-[11px] text-zinc-600">
          Leave blank to use the default AI-generated greeting for your business.
        </p>
      </div>

      {/* Tone selector */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Conversational Tone
        </label>
        <div className="flex gap-2">
          {TONE_OPTIONS.map(({ value, label, description }) => {
            const active = settings.tone === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSettingsChange({ tone: value })}
                disabled={disabled}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-center transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  active
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60',
                )}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] opacity-70">{description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
