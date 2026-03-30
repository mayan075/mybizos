'use client';

import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeminiVoice } from '@hararai/shared';

// ── Voice metadata ───────────────────────────────────────────────────────────

const VOICE_META: Record<GeminiVoice, { description: string; tone: string }> = {
  Puck:    { description: 'Upbeat & playful',      tone: 'Energetic'    },
  Charon:  { description: 'Deep & authoritative',  tone: 'Commanding'   },
  Kore:    { description: 'Clear & composed',      tone: 'Neutral'      },
  Fenrir:  { description: 'Bold & confident',      tone: 'Assertive'    },
  Aoede:   { description: 'Warm & melodic',        tone: 'Welcoming'    },
  Leda:    { description: 'Soft & approachable',   tone: 'Gentle'       },
  Orus:    { description: 'Steady & reassuring',   tone: 'Calm'         },
  Zephyr:  { description: 'Bright & expressive',   tone: 'Lively'       },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface VoiceCardProps {
  voice: GeminiVoice;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VoiceCard({ voice, selected, onSelect, disabled }: VoiceCardProps) {
  const meta = VOICE_META[voice];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative flex flex-col gap-1 rounded-lg border p-3 text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
          : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/60',
      )}
    >
      <div className="flex items-center gap-2">
        <Volume2
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            selected ? 'text-blue-400' : 'text-zinc-500',
          )}
        />
        <span
          className={cn(
            'text-xs font-semibold',
            selected ? 'text-blue-300' : 'text-zinc-100',
          )}
        >
          {voice}
        </span>
      </div>
      <p className="text-[11px] leading-tight text-zinc-500">{meta.description}</p>
      <span
        className={cn(
          'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          selected
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-zinc-700/50 text-zinc-500',
        )}
      >
        {meta.tone}
      </span>
    </button>
  );
}
