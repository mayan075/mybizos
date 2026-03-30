'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { env } from '@/lib/env';

// ── Types ────────────────────────────────────────────────────────────────────

export type DemoState =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'connected'
  | 'ending'
  | 'ended'
  | 'error'
  | 'rate-limited';

interface DemoSessionResponse {
  token: string;
  expiresAt: string;
  wsUrl: string;
  sessionConfig: Record<string, unknown>;
  maxDurationMs: number;
}

interface UseGeminiDemoReturn {
  state: DemoState;
  elapsed: number;
  error: string | null;
  startCall: () => Promise<void>;
  endCall: () => void;
}

// ── Audio Helpers ────────────────────────────────────────────────────────────

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

// ── Hook ─────────────────────────────────────────────────────────────────────

const API_BASE = env.NEXT_PUBLIC_API_URL;
const MAX_DURATION_S = 120;

export function useGeminiDemo(): UseGeminiDemoReturn {
  const [state, setState] = useState<DemoState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const stateRef = useRef<DemoState>('idle');

  // Keep stateRef in sync for use in callbacks
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Playback: drain queued audio chunks ──────────────────────────────
  const drainPlaybackQueue = useCallback(() => {
    const ctx = playbackCtxRef.current;
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

  // ── Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Start Call ───────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    setState('requesting-mic');
    setError(null);
    setElapsed(0);

    try {
      // 1. Request microphone access
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        setState('error');
        setError('Microphone access is needed for the demo. Please allow it and try again.');
        return;
      }
      micStreamRef.current = stream;

      // 2. Get session token from backend
      setState('connecting');
      const res = await fetch(`${API_BASE}/demo/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.status === 429) {
        cleanup();
        setState('rate-limited');
        setError("You've used all 3 demo calls today. Sign up to keep going!");
        return;
      }

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = (await res.json()) as DemoSessionResponse;

      // 3. Create AudioContexts
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = captureCtx;

      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;

      const micSource = captureCtx.createMediaStreamSource(stream);

      // 4. Open WebSocket to Gemini Live
      const ws = new WebSocket(data.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup message
        ws.send(
          JSON.stringify({
            setup: data.sessionConfig,
          }),
        );
      };

      // 5. Handle messages from Gemini
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;

          // Setup complete — start capturing audio
          if ('setupComplete' in msg) {
            setState('connected');

            // Start elapsed timer
            timerRef.current = setInterval(() => {
              setElapsed((prev) => {
                const next = prev + 1;
                if (next >= MAX_DURATION_S) {
                  // Auto-end at max duration
                  endCallInternal();
                }
                return next;
              });
            }, 1000);

            // Start capturing mic audio
            const processor = captureCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (ws.readyState !== WebSocket.OPEN) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const b64 = float32ToPcm16Base64(inputData);
              ws.send(
                JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [
                      {
                        mimeType: 'audio/pcm;rate=16000',
                        data: b64,
                      },
                    ],
                  },
                }),
              );
            };

            micSource.connect(processor);
            processor.connect(captureCtx.destination);
            return;
          }

          // Server content (audio, transcripts, tool calls)
          const serverContent = msg['serverContent'] as Record<string, unknown> | undefined;
          if (serverContent) {
            // Interrupted (barge-in) — clear playback queue
            if (serverContent['interrupted']) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
              return;
            }

            // Audio from model
            const modelTurn = serverContent['modelTurn'] as Record<string, unknown> | undefined;
            if (modelTurn) {
              const parts = modelTurn['parts'] as Array<Record<string, unknown>> | undefined;
              if (parts) {
                for (const part of parts) {
                  const inlineData = part['inlineData'] as { mimeType: string; data: string } | undefined;
                  if (inlineData?.data) {
                    const float32 = pcm16Base64ToFloat32(inlineData.data);
                    playbackQueueRef.current.push(float32);
                    drainPlaybackQueue();
                  }
                }
              }
            }
          }

          // Tool calls — respond with mock data (demo doesn't actually book)
          const toolCall = msg['toolCall'] as { functionCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }> } | undefined;
          if (toolCall?.functionCalls) {
            const responses = toolCall.functionCalls.map((fc) => ({
              id: fc.id,
              name: fc.name,
              response: {
                result: {
                  success: true,
                  message: fc.name === 'book_demo'
                    ? 'Demo call booked successfully!'
                    : 'Action completed.',
                },
              },
            }));

            ws.send(
              JSON.stringify({
                toolResponse: { functionResponses: responses },
              }),
            );
          }
        } catch {
          // Non-JSON or unexpected format — ignore
        }
      };

      ws.onerror = () => {
        setError('Connection error. Please try again.');
        setState('error');
        cleanup();
      };

      ws.onclose = (e) => {
        if (stateRef.current === 'connected' || stateRef.current === 'connecting') {
          if (e.code !== 1000) {
            setError(`Connection closed unexpectedly (code ${e.code})`);
            setState('error');
          } else {
            setState('ended');
          }
          cleanup();
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start demo call';
      setError(message);
      setState('error');
      cleanup();
    }
  }, [cleanup, drainPlaybackQueue]);

  // ── End Call (internal — called by timer or close) ───────────────────
  const endCallInternal = useCallback(() => {
    cleanup();
    setState('ended');
  }, [cleanup]);

  // ── End Call (public — called by user) ───────────────────────────────
  const endCall = useCallback(() => {
    cleanup();
    setState('ended');
  }, [cleanup]);

  return { state, elapsed, error, startCall, endCall };
}
