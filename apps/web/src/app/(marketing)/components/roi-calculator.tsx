"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { RevealSection } from "./reveal-section";

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevTarget.current = target;
  }, [target, duration]);

  return value;
}

export function ROICalculator() {
  const [missedCalls, setMissedCalls] = useState(5);
  const [avgJobValue, setAvgJobValue] = useState(500);

  const missedRevenue = missedCalls * avgJobValue * 4;
  const capturedRevenue = Math.round(missedRevenue * 0.7);

  const animatedMissed = useAnimatedNumber(missedRevenue);
  const animatedCaptured = useAnimatedNumber(capturedRevenue);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section className="relative overflow-hidden bg-[#06061a] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
              <TrendingUp className="h-3.5 w-3.5" />
              ROI Calculator
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              How much revenue are you leaving on the table?
            </h2>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-14 max-w-2xl">
            <div className="glass-card overflow-hidden shadow-2xl shadow-black/30">
              <div className="p-6 sm:p-8">
                {/* Missed calls slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">
                      How many calls do you miss per week?
                    </label>
                    <span className="rounded-lg bg-indigo-500/20 px-3 py-1 text-lg font-bold tabular-nums text-indigo-300">
                      {missedCalls}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={missedCalls}
                    onChange={(e) => setMissedCalls(Number(e.target.value))}
                    className="roi-slider w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/25">
                    <span>1</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Job value slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">
                      Average job value?
                    </label>
                    <span className="rounded-lg bg-indigo-500/20 px-3 py-1 text-lg font-bold tabular-nums text-indigo-300">
                      {formatCurrency(avgJobValue)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={avgJobValue}
                    onChange={(e) => setAvgJobValue(Number(e.target.value))}
                    className="roi-slider w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/25">
                    <span>$100</span>
                    <span>$2,500</span>
                    <span>$5,000</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="border-t border-white/5 bg-white/[0.02] p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="text-sm font-medium text-red-400">
                      You&apos;re leaving on the table
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tabular-nums text-red-400">
                      {formatCurrency(animatedMissed)}
                      <span className="text-base font-medium text-red-400/60">/mo</span>
                    </div>
                  </div>
                  <div className="glow-success overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                    <div className="text-sm font-medium text-green-400">
                      HararAI would capture
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tabular-nums text-green-400">
                      {formatCurrency(animatedCaptured)}
                      <span className="text-base font-medium text-green-400/60">/mo</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 hover:brightness-110"
                >
                  Start capturing that revenue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
