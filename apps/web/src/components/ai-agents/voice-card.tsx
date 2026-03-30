'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, Play, Loader2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { getUser } from '@/lib/auth';
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

// ── Types ────────────────────────────────────────────────────────────────────

interface VoiceSampleResponse {
  audio: string;
  mimeType: string;
}

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
  const [playState, setPlayState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger onSelect

    // If already playing, stop
    if (playState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayState('idle');
      return;
    }

    if (playState === 'loading') return;

    setPlayState('loading');
    try {
      const user = getUser();
      if (!user?.orgId) throw new Error('No org');

      const response = await apiClient.get<VoiceSampleResponse>(
        `/orgs/${user.orgId}/gemini/voice-sample`,
        { params: { voiceName: voice } },
      );

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(response.audio), (c) => c.charCodeAt(0))],
        { type: response.mimeType },
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayState('idle');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setPlayState('playing');
    } catch {
      setPlayState('idle');
    }
  }, [playState, voice]);

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

        {/* Play sample button */}
        <button
          type="button"
          onClick={(e) => void handlePlay(e)}
          disabled={disabled || playState === 'loading'}
          className={cn(
            'ml-auto flex h-5 w-5 items-center justify-center rounded-full transition-all',
            'hover:bg-zinc-600/50 focus:outline-none',
            'disabled:opacity-40',
            playState === 'playing'
              ? 'text-blue-400'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
          title={playState === 'playing' ? 'Stop sample' : 'Play sample'}
        >
          {playState === 'loading' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : playState === 'playing' ? (
            <Square className="h-2.5 w-2.5 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current" />
          )}
        </button>
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
