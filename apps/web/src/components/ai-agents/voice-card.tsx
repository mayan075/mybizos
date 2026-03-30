'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, Play, Loader2, Square, AlertCircle } from 'lucide-react';
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

// ── Shared in-memory audio cache ─────────────────────────────────────────────
// Persists across re-renders and across VoiceCard instances so each sample is
// fetched at most once per page session.

interface CacheEntry {
  status: 'loading' | 'ready' | 'error';
  objectUrl?: string;
  promise?: Promise<string | null>;
}

const audioCache = new Map<string, CacheEntry>();

function fetchAndCacheSample(voice: string): Promise<string | null> {
  const existing = audioCache.get(voice);
  if (existing?.promise) return existing.promise;

  const promise = (async (): Promise<string | null> => {
    try {
      const user = getUser();
      if (!user?.orgId) return null;

      const response = await apiClient.get<{ audio: string; mimeType: string }>(
        `/orgs/${user.orgId}/gemini/voice-sample`,
        { params: { voiceName: voice } },
      );

      const audioBlob = new Blob(
        [Uint8Array.from(atob(response.audio), (c) => c.charCodeAt(0))],
        { type: response.mimeType },
      );
      const objectUrl = URL.createObjectURL(audioBlob);

      audioCache.set(voice, { status: 'ready', objectUrl });
      return objectUrl;
    } catch {
      audioCache.set(voice, { status: 'error' });
      return null;
    }
  })();

  audioCache.set(voice, { status: 'loading', promise });
  return promise;
}

// ── Prefetch hook — call once in the parent to warm all samples ──────────────

export function usePrefetchVoiceSamples(voices: readonly string[]) {
  useEffect(() => {
    for (const voice of voices) {
      if (!audioCache.has(voice)) {
        fetchAndCacheSample(voice);
      }
    }
  }, [voices]);
}

// ── Types ────────────────────────────────────────────────────────────────────

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
  const [sampleError, setSampleError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync error state from cache (for prefetch failures)
  useEffect(() => {
    const entry = audioCache.get(voice);
    if (entry?.status === 'error') setSampleError(true);
  }, [voice]);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If already playing, stop
    if (playState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayState('idle');
      return;
    }

    if (playState === 'loading') return;

    // Check if already cached
    const cached = audioCache.get(voice);
    if (cached?.status === 'error') {
      // Clear stale error and retry
      audioCache.delete(voice);
      setSampleError(false);
    }

    if (cached?.status === 'ready' && cached.objectUrl) {
      // Instant playback from cache
      const audio = new Audio(cached.objectUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayState('idle');
      audio.onerror = () => setPlayState('idle');
      await audio.play();
      setPlayState('playing');
      return;
    }

    // Not cached yet — fetch (shows loading spinner)
    setPlayState('loading');
    const objectUrl = await fetchAndCacheSample(voice);
    if (!objectUrl) {
      setSampleError(true);
      setPlayState('idle');
      return;
    }

    const audio = new Audio(objectUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayState('idle');
    audio.onerror = () => setPlayState('idle');
    await audio.play();
    setPlayState('playing');
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
          disabled={disabled || playState === 'loading' || sampleError}
          className={cn(
            'ml-auto flex h-5 w-5 items-center justify-center rounded-full transition-all',
            'hover:bg-zinc-600/50 focus:outline-none',
            'disabled:opacity-40',
            sampleError
              ? 'text-red-500 cursor-not-allowed'
              : playState === 'playing'
                ? 'text-blue-400'
                : 'text-zinc-500 hover:text-zinc-300',
          )}
          title={
            sampleError
              ? 'Sample unavailable'
              : playState === 'playing'
                ? 'Stop sample'
                : 'Play sample'
          }
        >
          {sampleError ? (
            <AlertCircle className="h-3 w-3" />
          ) : playState === 'loading' ? (
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
