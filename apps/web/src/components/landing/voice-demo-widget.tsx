'use client';

import { useGeminiDemo } from '@/hooks/use-gemini-demo';
import { Microphone, Phone, PhoneSlash, ArrowRight, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Mic Button                                                         */
/* ------------------------------------------------------------------ */
function MicButton({
  state,
  onClick,
}: {
  state: 'idle' | 'connecting' | 'connected';
  onClick: () => void;
}) {
  const isConnected = state === 'connected';
  const isConnecting = state === 'connecting';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing rings */}
      {!isConnecting && (
        <>
          <span
            className={`absolute h-28 w-28 rounded-full border ${
              isConnected
                ? 'border-emerald-500/15 animate-[ringPulse_3s_ease-out_infinite]'
                : 'border-indigo-500/15 animate-[ringPulse_3s_ease-out_infinite]'
            }`}
            style={{ animationDelay: '0s' }}
          />
          <span
            className={`absolute h-36 w-36 rounded-full border ${
              isConnected
                ? 'border-emerald-500/10 animate-[ringPulse_3s_ease-out_infinite]'
                : 'border-indigo-500/10 animate-[ringPulse_3s_ease-out_infinite]'
            }`}
            style={{ animationDelay: '0.5s' }}
          />
        </>
      )}

      <button
        type="button"
        onClick={onClick}
        className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all ${
          isConnected
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-[breathe_2s_ease-in-out_infinite]'
            : isConnecting
              ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:scale-105 hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] active:scale-95'
        }`}
        aria-label={isConnected ? 'Call active' : isConnecting ? 'Connecting...' : 'Start demo call'}
      >
        {isConnecting ? (
          <Phone className="h-8 w-8 text-white animate-pulse" weight="fill" />
        ) : (
          <Microphone className="h-8 w-8 text-white" weight={isConnected ? 'fill' : 'duotone'} />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Waveform Visualization                                             */
/* ------------------------------------------------------------------ */
function Waveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {[8, 16, 24, 12, 20, 10, 18].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm bg-emerald-400"
          style={{
            height: `${h}px`,
            animation: `wave 0.6s ease-in-out infinite`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timer Display                                                      */
/* ------------------------------------------------------------------ */
function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="font-mono text-sm tabular-nums text-emerald-400/70">
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Voice Demo Widget                                                  */
/* ------------------------------------------------------------------ */
export function VoiceDemoWidget() {
  const { state, elapsed, error, startCall, endCall } = useGeminiDemo();

  const handleMicClick = () => {
    if (state === 'idle' || state === 'ended' || state === 'error') {
      void startCall();
    }
  };

  const isActive = state === 'connected';
  const isConnecting = state === 'connecting' || state === 'requesting-mic';

  return (
    <motion.div
      id="voice-demo"
      className="relative mx-auto max-w-md w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.4 }}
    >
      {/* Label tag */}
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-indigo-500/30 bg-[#060614] px-3 py-1 text-[11px] tracking-wider text-indigo-400/80 uppercase">
        Try it live — no signup needed
      </span>

      <AnimatePresence mode="wait">
        {/* ── Idle / Ready State ─────────────────────────────────────── */}
        {(state === 'idle' || isConnecting) && (
          <motion.div
            key="idle"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="mb-2 text-lg font-semibold text-white/90">
              Talk to Our AI Right Now
            </h3>
            <p className="mb-8 text-sm text-white/40 max-w-xs">
              Ask about features, pricing, or how it works for your business
            </p>

            <MicButton
              state={isConnecting ? 'connecting' : 'idle'}
              onClick={handleMicClick}
            />

            <p className="mt-5 text-xs text-white/25">
              {isConnecting ? 'Connecting...' : 'Tap to start a live call'}
            </p>
          </motion.div>
        )}

        {/* ── Connected State ────────────────────────────────────────── */}
        {isActive && (
          <motion.div
            key="connected"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MicButton state="connected" onClick={() => {}} />

            <div className="mt-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-emerald-400">Connected</span>
              <Timer seconds={elapsed} />
            </div>

            <div className="mt-4">
              <Waveform />
            </div>

            <button
              type="button"
              onClick={endCall}
              className="mt-6 flex items-center gap-2 rounded-xl bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20"
            >
              <PhoneSlash className="h-4 w-4" weight="fill" />
              End Call
            </button>
          </motion.div>
        )}

        {/* ── Ended State ────────────────────────────────────────────── */}
        {state === 'ended' && (
          <motion.div
            key="ended"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Phone className="h-5 w-5 text-emerald-400" weight="fill" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-white/90">
              Call Ended
            </h3>
            <p className="mb-6 text-sm text-white/40 max-w-xs">
              That&apos;s the kind of AI that could be answering YOUR customers&apos; calls
            </p>

            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/register"
                className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:brightness-110"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
              </Link>
              <button
                type="button"
                onClick={() => void startCall()}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/50 transition-all hover:bg-white/[0.06] hover:text-white/70"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Error State ────────────────────────────────────────────── */}
        {state === 'error' && (
          <motion.div
            key="error"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
              <Warning className="h-5 w-5 text-red-400" weight="fill" />
            </div>
            <p className="mb-4 text-sm text-red-400/80">{error}</p>
            <button
              type="button"
              onClick={() => void startCall()}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/50 transition-all hover:bg-white/[0.06] hover:text-white/70"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* ── Rate Limited State ─────────────────────────────────────── */}
        {state === 'rate-limited' && (
          <motion.div
            key="rate-limited"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <Phone className="h-5 w-5 text-amber-400" weight="fill" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white/90">
              Demo Limit Reached
            </h3>
            <p className="mb-6 text-sm text-white/40 max-w-xs">
              You&apos;ve used all 3 demo calls for today. Sign up to get unlimited AI calls for your business!
            </p>
            <Link
              href="/register"
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:brightness-110"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
