/**
 * Sound effects using Web Audio API — no audio files needed.
 *
 * playNotification() — subtle ding for new messages
 * playCallRing()     — dual-tone ring for incoming calls (440+480Hz)
 * playCallEnd()      — soft end tone when call disconnects
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext || audioContext.state === 'closed') {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }

  // Resume if suspended (browsers require user gesture)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * Play a tone at the given frequency for the given duration with fade-out.
 */
function playTone(
  frequency: number,
  durationMs: number,
  options?: {
    type?: OscillatorType;
    volume?: number;
    fadeOutMs?: number;
  },
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const {
    type = 'sine',
    volume = 0.15,
    fadeOutMs = Math.min(durationMs * 0.6, 100),
  } = options ?? {};

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);

  // Fade out towards the end
  const fadeStart = ctx.currentTime + (durationMs - fadeOutMs) / 1000;
  const fadeEnd = ctx.currentTime + durationMs / 1000;
  gainNode.gain.setValueAtTime(volume, fadeStart);
  gainNode.gain.linearRampToValueAtTime(0, fadeEnd);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(fadeEnd);
}

/**
 * Play a dual-tone (two frequencies simultaneously).
 */
function playDualTone(
  freq1: number,
  freq2: number,
  durationMs: number,
  options?: { volume?: number; fadeOutMs?: number },
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const { volume = 0.1, fadeOutMs = 50 } = options ?? {};

  [freq1, freq2].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);

    const fadeStart = ctx.currentTime + (durationMs - fadeOutMs) / 1000;
    const fadeEnd = ctx.currentTime + durationMs / 1000;
    gain.gain.setValueAtTime(volume, fadeStart);
    gain.gain.linearRampToValueAtTime(0, fadeEnd);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(fadeEnd);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Subtle notification ding — 800Hz sine wave, 150ms, fade out.
 * Used when a new message arrives in the inbox.
 */
export function playNotification(): void {
  playTone(800, 150, { type: 'sine', volume: 0.12, fadeOutMs: 90 });
}

/**
 * Phone ring — 440Hz + 480Hz dual tone, 500ms on / 500ms off.
 * Returns a stop function to cancel the ring.
 * Used during incoming call "Ringing" state.
 */
export function playCallRing(): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function ring() {
    if (stopped) return;
    playDualTone(440, 480, 500, { volume: 0.08 });
    // 500ms tone + 500ms silence = 1s cycle
    timeoutId = setTimeout(() => {
      if (!stopped) ring();
    }, 1000);
  }

  ring();

  return () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Subtle end tone — 480Hz, 200ms, fade out.
 * Used when a call ends (hangup).
 */
export function playCallEnd(): void {
  playTone(480, 200, { type: 'sine', volume: 0.1, fadeOutMs: 120 });
}
