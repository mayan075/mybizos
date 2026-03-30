"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { TrendUp, ArrowRight } from "@phosphor-icons/react";

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
    <section className="relative overflow-hidden bg-[#060614] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600/8 blur-[140px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-white/50">
            <TrendUp className="h-3.5 w-3.5 text-amber-400" weight="fill" />
            ROI Calculator
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            How much revenue are you leaving on the table?
          </h2>
        </motion.div>

        <motion.div
          className="mx-auto mt-14 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.15 }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div className="p-6 sm:p-8">
              {/* Missed calls slider */}
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-white/70">
                    How many calls do you miss per week?
                  </label>
                  <span className="rounded-lg bg-sky-500/15 px-3 py-1 text-lg font-bold tabular-nums text-sky-300">
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
                <div className="mt-1 flex justify-between text-xs text-white/20">
                  <span>1</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>

              {/* Job value slider */}
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-white/70">
                    Average job value?
                  </label>
                  <span className="rounded-lg bg-sky-500/15 px-3 py-1 text-lg font-bold tabular-nums text-sky-300">
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
                <div className="mt-1 flex justify-between text-xs text-white/20">
                  <span>$100</span>
                  <span>$2,500</span>
                  <span>$5,000</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="border-t border-white/[0.04] bg-white/[0.015] p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
                  <div className="text-sm font-medium text-red-400">
                    You&apos;re leaving on the table
                  </div>
                  <div className="mt-1 text-3xl font-extrabold tabular-nums text-red-400">
                    {formatCurrency(animatedMissed)}
                    <span className="text-base font-medium text-red-400/50">/mo</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                  <div className="text-sm font-medium text-emerald-400">
                    HararAI would capture
                  </div>
                  <div className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-400">
                    {formatCurrency(animatedCaptured)}
                    <span className="text-base font-medium text-emerald-400/50">/mo</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register"
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/15 transition-all hover:shadow-sky-500/25 hover:brightness-110"
              >
                Start capturing that revenue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
