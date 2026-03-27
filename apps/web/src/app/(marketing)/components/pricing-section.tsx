"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RevealSection } from "./reveal-section";

export function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      description: "Everything you need to organize your business",
      features: [
        "CRM with contact management",
        "Unified inbox (SMS + email)",
        "Deal pipeline",
        "Scheduling & online booking",
        "AI SMS follow-ups",
        "Email campaigns",
        "Booking page",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "$99",
      description: "AI superpowers for maximum growth",
      features: [
        "Everything in Starter",
        "AI Phone Agent (24/7)",
        "Voice AI with custom scripts",
        "Advanced automations",
        "Analytics dashboard",
        "Priority support",
        "Custom integrations",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-[#06061a] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Simple, honest pricing
            </h2>
            <p className="mt-5 text-lg text-white/40">
              No hidden fees. No per-user charges. Cancel anytime.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan, i) => (
            <RevealSection key={plan.name} delay={i * 150}>
              <div
                className={`relative flex h-full flex-col rounded-3xl p-8 transition-all ${
                  plan.popular
                    ? "pricing-glow glass-card scale-[1.02] bg-white/[0.08]"
                    : "glass-card bg-white/[0.04]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-white/40">{plan.description}</p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {plan.price}
                  </span>
                  <span className="text-lg text-white/30">/mo</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                      <span className="text-sm text-white/60">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 block rounded-2xl py-3.5 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
                      : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection>
          <p className="mt-10 text-center text-sm text-white/30">
            Both plans include a free 14-day trial. No credit card required.
          </p>
        </RevealSection>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
