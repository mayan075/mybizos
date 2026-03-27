"use client";

import {
  Phone,
  Bot,
  Bell,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { RevealSection } from "./reveal-section";

export function HowItWorks() {
  return (
    <section
      id="how-ai-works"
      className="relative scroll-mt-16 overflow-hidden bg-[#06061a] py-24 sm:py-32"
    >
      {/* Subtle gradient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Bot className="h-3.5 w-3.5" />
              AI-Powered
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              How your AI employee works
            </h2>
            <p className="mt-5 text-lg text-white/40">
              From ring to revenue — fully automated, 24 hours a day.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-6">
            {/* Gradient connection line */}
            <div className="pointer-events-none absolute top-[72px] right-[16%] left-[16%] z-0 hidden md:block">
              <div className="gradient-line-h w-full" />
            </div>

            {/* Step 1 */}
            <RevealSection delay={0}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  {/* Outer ring pulse */}
                  <div className="absolute inset-0 rounded-3xl bg-blue-500/20" style={{ animation: "ringPulse 3s ease-out infinite" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-500/30">
                    <Phone className="h-14 w-14" />
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  Step 1
                </div>
                <h3 className="text-xl font-bold text-white">
                  Customer calls your number
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Your existing business number. No changes needed — AI picks up instantly.
                </p>
              </div>
            </RevealSection>

            {/* Step 2 */}
            <RevealSection delay={200}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-violet-500/20" style={{ animation: "ringPulse 3s ease-out infinite 1s" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/30">
                    <Bot className="h-14 w-14" />
                    {/* Floating conversation bubbles */}
                    <div className="glass-card absolute -right-6 -top-3 px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-medium text-white/80">Booked!</span>
                      </div>
                    </div>
                    <div className="glass-card absolute -left-6 -bottom-3 px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span className="text-[10px] font-medium text-white/80">Qualified</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
                  Step 2
                </div>
                <h3 className="text-xl font-bold text-white">
                  AI answers, qualifies, and books
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Natural conversation. Understands your services, pricing, and availability.
                </p>
              </div>
            </RevealSection>

            {/* Step 3 */}
            <RevealSection delay={400}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-emerald-500/20" style={{ animation: "ringPulse 3s ease-out infinite 2s" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30">
                    <Bell className="h-14 w-14" />
                    {/* Notification card */}
                    <div className="glass-card absolute -right-8 -top-4 p-2.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                        <span className="text-[10px] font-medium text-white/80">New booking</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-white/40">HVAC Install - $850</div>
                    </div>
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Step 3
                </div>
                <h3 className="text-xl font-bold text-white">
                  You get notified with a summary
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Full call transcript, customer details, and appointment on your calendar.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
