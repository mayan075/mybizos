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

/** Convert Float32 audio samples to PCM 16-bit LE and base64-encode. */
function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Decode base64 PCM 16-bit LE back to Float32 for AudioContext playback. */
function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i]! / (pcm16[i]! < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // ── Playback: drain queued audio chunks ─────────────────────────────
  const drainPlaybackQueue = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || isPlayingRef.current || playbackQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const chunk = playbackQueueRef.current.shift()!;
    const buf = ctx.createBuffer(1, chunk.length, 24000);
    buf.copyToChannel(new Float32Array(chunk), 0);

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      drainPlaybackQueue();
    };
    source.start();
  }, []);

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
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
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
      // 1. Get session token + WS URL from backend
      const response = await apiClient.post<TestSessionResponse>(
        buildPath('/orgs/:orgId/gemini/test-session'),
        { systemPrompt, voiceName },
      );

      // 2. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // 3. Create AudioContext at 16kHz for mic capture
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const micSource = audioCtx.createMediaStreamSource(stream);

      // 4. Open WebSocket to Gemini Live
      const ws = new WebSocket(response.data.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup message with session config
        ws.send(JSON.stringify({
          setup: {
            model: response.data.config.model,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: response.data.config.voiceName,
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: response.data.config.systemPrompt }],
            },
          },
        }));

        setStatus('connected');

        // Start elapsed timer
        timerRef.current = setInterval(() => {
          setElapsed((prev) => prev + 1);
        }, 1000);
      };

      // 5. Capture mic audio and send to Gemini via ScriptProcessor
      //    (AudioWorklet is preferable but requires a separate module file;
      //     ScriptProcessor works reliably for short test calls)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      workletNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64 = float32ToPcm16Base64(inputData);
        ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64,
            }],
          },
        }));
      };

      micSource.connect(processor);
      processor.connect(audioCtx.destination); // required for processing to run

      // 6. Handle incoming audio from Gemini
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;

          // Gemini sends audio in serverContent.modelTurn.parts[].inlineData
          const serverContent = msg['serverContent'] as Record<string, unknown> | undefined;
          if (!serverContent) return;

          const modelTurn = serverContent['modelTurn'] as Record<string, unknown> | undefined;
          if (!modelTurn) return;

          const parts = modelTurn['parts'] as Array<Record<string, unknown>> | undefined;
          if (!parts) return;

          for (const part of parts) {
            const inlineData = part['inlineData'] as { mimeType: string; data: string } | undefined;
            if (inlineData?.data) {
              const float32 = pcm16Base64ToFloat32(inlineData.data);
              playbackQueueRef.current.push(float32);
              drainPlaybackQueue();
            }
          }
        } catch {
          // Non-JSON or unexpected format — ignore
        }
      };

      ws.onerror = () => {
        setErrorMsg('WebSocket connection error');
        setStatus('error');
        cleanup();
      };

      ws.onclose = (e) => {
        if (status === 'connected' || status === 'connecting') {
          // Unexpected close
          if (e.code !== 1000) {
            setErrorMsg(`Connection closed (code ${e.code})`);
            setStatus('error');
          } else {
            setStatus('idle');
          }
          cleanup();
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start test call';
      setErrorMsg(message);
      setStatus('error');
      cleanup();
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
