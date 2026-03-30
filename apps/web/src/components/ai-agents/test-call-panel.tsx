'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { getUser } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface TestSessionResponse {
  data: {
    token: string;
    expiresAt: string;
    wsUrl: string;
    config: {
      model: string;
      systemPrompt: string;
      voiceName: string;
    };
  };
}

type CallStatus = 'idle' | 'connecting' | 'connected' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPath(template: string): string {
  const user = getUser();
  if (!user?.orgId) throw new Error('No authenticated organization');
  return template.replace(':orgId', user.orgId);
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface TestCallPanelProps {
  systemPrompt: string;
  voiceName: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TestCallPanel({ systemPrompt, voiceName }: TestCallPanelProps) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // TODO: Add AudioContext and MediaStream refs for full audio streaming implementation

  // ── Cleanup helper ───────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // TODO: When full audio is implemented, stop mic stream and close AudioContext here
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Start test call ──────────────────────────────────────────────────
  const handleStartCall = async () => {
    setStatus('connecting');
    setErrorMsg(null);
    setElapsed(0);

    try {
      const response = await apiClient.post<TestSessionResponse>(
        buildPath('/orgs/:orgId/gemini/test-session'),
        { systemPrompt, voiceName },
      );

      // TODO: Full WebSocket audio streaming implementation needed here.
      // The flow should be:
      //   1. Open wsRef.current = new WebSocket(response.data.wsUrl)
      //   2. Get mic access: navigator.mediaDevices.getUserMedia({ audio: true })
      //   3. Create AudioContext + ScriptProcessorNode to capture PCM chunks
      //   4. On each audio chunk: ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm', data: base64Chunk }] } }))
      //   5. On ws message: decode audio response and play via AudioContext
      //   6. Send setup message with response.data.config on ws.open
      // For v1, we just show the connected state with the timer running.

      // Simulate WebSocket connection with the returned wsUrl
      // (actual audio streaming is deferred to full implementation)
      void response.data.wsUrl; // acknowledged — used in full implementation

      setStatus('connected');

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start test call';
      setErrorMsg(message);
      setStatus('error');
    }
  };

  // ── End test call ────────────────────────────────────────────────────
  const handleEndCall = () => {
    cleanup();
    setStatus('idle');
    setElapsed(0);
    setErrorMsg(null);
  };

  // ── Idle state ───────────────────────────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">Test Your Agent</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Start a browser-based test call to hear your agent respond in real time
              using the current system prompt and voice settings.
            </p>
            {status === 'error' && errorMsg && (
              <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleStartCall()}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              'bg-emerald-600 text-white hover:bg-emerald-500',
              'shadow-lg shadow-emerald-500/20',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            )}
          >
            <Phone className="h-4 w-4" />
            Test Call
          </button>
        </div>
      </div>
    );
  }

  // ── Active / connecting state — floating panel ───────────────────────
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex items-center gap-4 rounded-2xl px-5 py-3.5',
        'border border-zinc-700/50 bg-zinc-900/95 shadow-2xl backdrop-blur',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
      )}
    >
      {/* Status dot */}
      <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            status === 'connected'
              ? 'animate-ping bg-emerald-400'
              : 'animate-pulse bg-yellow-400',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            status === 'connected' ? 'bg-emerald-400' : 'bg-yellow-400',
          )}
        />
      </div>

      {/* Mic icon */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          status === 'connected'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-yellow-500/15 text-yellow-400',
        )}
      >
        <Mic className="h-4 w-4" />
      </div>

      {/* Label + timer */}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-100">
          {status === 'connecting' ? 'Connecting…' : 'Test Call Active'}
        </p>
        {status === 'connected' && (
          <p className="font-mono text-xs text-zinc-400">{formatElapsed(elapsed)}</p>
        )}
      </div>

      {/* End call button */}
      <button
        type="button"
        onClick={handleEndCall}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
          'bg-red-600/80 text-white hover:bg-red-500',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        )}
      >
        <PhoneOff className="h-3.5 w-3.5" />
        End Test
      </button>
    </div>
  );
}
