/**
 * Audio format conversion for Twilio ↔ Gemini Live API bridge.
 *
 * Twilio Media Streams send/receive mu-law (G.711) 8kHz mono.
 * Gemini Live API expects PCM 16-bit 16kHz input, returns 24kHz output.
 *
 * No external dependencies — pure math on typed arrays.
 */

// ─── G.711 Mu-Law Tables ────────────────────────────────────────────────────

/** Mu-law byte → 16-bit linear PCM value */
const MULAW_DECODE_TABLE = new Int16Array(256);

/** Build the decode table once at module load */
(function buildDecodeTable() {
  for (let i = 0; i < 256; i++) {
    // Invert all bits
    let mulaw = ~i & 0xff;

    // Extract sign, exponent, and mantissa
    const sign = mulaw & 0x80;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0f;

    // Compute magnitude: (mantissa << 1 | 0x21) << exponent, then subtract bias
    let magnitude = ((mantissa << 1) | 0x21) << exponent;
    magnitude -= 0x21;

    MULAW_DECODE_TABLE[i] = sign ? -magnitude : magnitude;
  }
})();

/** Encode a 16-bit PCM sample to mu-law byte */
function linearToMulaw(sample: number): number {
  const MULAW_MAX = 0x1fff; // 8191
  const MULAW_BIAS = 0x84; // 132

  // Determine sign
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;

  // Clamp
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  // Add bias
  sample += MULAW_BIAS;

  // Find exponent (position of highest bit in biased sample)
  let exponent = 7;
  const expMask = 0x4000;
  for (let i = 0; i < 8; i++) {
    if (sample & (expMask >> i)) {
      exponent = 7 - i;
      break;
    }
  }

  // Extract mantissa
  const mantissa = (sample >> (exponent + 3)) & 0x0f;

  // Compose mu-law byte (inverted)
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulawByte;
}

// ─── Low-Pass Filter (Anti-Alias) ──────────────────────────────────────────

/**
 * Pre-computed FIR low-pass filter kernel for 24kHz → 8kHz downsampling.
 *
 * Cutoff at 4kHz (Nyquist of 8kHz target) with a Hamming-windowed sinc.
 * 13 taps gives a good balance between quality and CPU cost on a real-time
 * audio path.  The kernel is normalised so the sum of coefficients = 1.
 */
const LP_KERNEL = (() => {
  const N = 13; // filter length (odd → symmetric)
  const M = (N - 1) / 2; // centre tap index
  const fc = 4000 / 24000; // normalised cutoff = target_nyquist / source_rate
  const raw = new Float64Array(N);
  let sum = 0;

  for (let n = 0; n < N; n++) {
    const x = n - M;
    // Windowed-sinc: sinc(2·fc·x) · hamming(n)
    const sinc = x === 0
      ? 2 * Math.PI * fc
      : Math.sin(2 * Math.PI * fc * x) / x;
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
    raw[n] = sinc * hamming;
    sum += raw[n]!;
  }

  // Normalise
  for (let n = 0; n < N; n++) raw[n]! /= sum;
  return raw;
})();

const LP_HALF = (LP_KERNEL.length - 1) / 2;

/** Apply the FIR low-pass filter to an array of PCM samples in-place. */
function applyLowPass(samples: Int16Array): Int16Array {
  const len = samples.length;
  const out = new Int16Array(len);

  for (let i = 0; i < len; i++) {
    let acc = 0;
    for (let k = 0; k < LP_KERNEL.length; k++) {
      const idx = i - LP_HALF + k;
      // Mirror-pad at boundaries
      const s = idx < 0
        ? samples[-idx]!
        : idx >= len
          ? samples[2 * len - idx - 2]!
          : samples[idx]!;
      acc += s * LP_KERNEL[k]!;
    }
    out[i] = Math.round(Math.max(-32768, Math.min(32767, acc)));
  }

  return out;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert mu-law 8kHz audio to linear PCM 16-bit 16kHz.
 *
 * Steps:
 * 1. Decode each mu-law byte to a 16-bit PCM sample at 8kHz
 * 2. Upsample from 8kHz to 16kHz using linear interpolation (2x)
 */
export function mulawToLinear16(mulawBuffer: Buffer): Buffer {
  const inputSamples = mulawBuffer.length;
  const outputSamples = inputSamples * 2; // 8kHz → 16kHz = 2x

  const output = Buffer.alloc(outputSamples * 2); // 16-bit = 2 bytes per sample

  // Decode all mulaw samples first
  const decoded = new Int16Array(inputSamples);
  for (let i = 0; i < inputSamples; i++) {
    decoded[i] = MULAW_DECODE_TABLE[mulawBuffer[i]!]!;
  }

  for (let i = 0; i < inputSamples; i++) {
    const currentSample = decoded[i]!;
    const nextSample = i < inputSamples - 1 ? decoded[i + 1]! : currentSample;

    // Write original sample at position 2*i
    output.writeInt16LE(currentSample, i * 4);
    // Write interpolated sample at position 2*i+1
    const interpolated = Math.round((currentSample + nextSample) / 2);
    output.writeInt16LE(interpolated, i * 4 + 2);
  }

  return output;
}

/**
 * Convert linear PCM 16-bit 24kHz to mu-law 8kHz.
 *
 * Steps:
 * 1. Apply 13-tap FIR low-pass filter (Hamming-windowed sinc, 4kHz cutoff)
 * 2. Downsample from 24kHz to 8kHz by picking every 3rd sample
 * 3. Encode each sample to mu-law
 */
export function linear16ToMulaw(pcmBuffer: Buffer): Buffer {
  const totalSamples = pcmBuffer.length / 2;
  const outputSamples = Math.floor(totalSamples / 3); // 24kHz → 8kHz = 1/3

  // Read all PCM samples into a typed array
  const raw = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    raw[i] = pcmBuffer.readInt16LE(i * 2);
  }

  // Anti-alias: low-pass filter removes frequencies above 4kHz
  const filtered = applyLowPass(raw);

  // Decimate: pick every 3rd sample from the filtered signal
  const output = Buffer.alloc(outputSamples);
  for (let i = 0; i < outputSamples; i++) {
    output[i] = linearToMulaw(filtered[i * 3]!);
  }

  return output;
}

/**
 * Calculate audio duration in milliseconds from a PCM buffer.
 * @param pcmBuffer - Raw PCM 16-bit buffer
 * @param sampleRate - Sample rate in Hz (e.g. 16000 or 24000)
 */
export function pcmDurationMs(pcmBuffer: Buffer, sampleRate: number): number {
  const samples = pcmBuffer.length / 2; // 16-bit = 2 bytes per sample
  return (samples / sampleRate) * 1000;
}
