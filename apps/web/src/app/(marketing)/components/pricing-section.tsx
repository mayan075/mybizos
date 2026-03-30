"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle } from "@phosphor-icons/react";

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
    <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-[#060614] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-[140px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Simple, honest pricing
          </h2>
          <p className="mt-5 text-lg text-white/35">
            No hidden fees. No per-user charges. Cancel anytime.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative flex h-full flex-col rounded-3xl p-8 transition-all ${
                plan.popular
                  ? "scale-[1.02] border border-sky-500/15 bg-white/[0.05] shadow-[0_0_0_1px_rgba(14,165,233,0.15),0_0_30px_rgba(14,165,233,0.06),0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-sm"
                  : "border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/35">{plan.description}</p>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-white">
                  {plan.price}
                </span>
                <span className="text-lg text-white/25">/mo</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" weight="fill" />
                    <span className="text-sm text-white/55">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-8 block rounded-2xl py-3.5 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-xl hover:shadow-sky-500/25 hover:brightness-110"
                    : "border border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-10 text-center text-sm text-white/25"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          Both plans include a free 14-day trial. No credit card required.
        </motion.p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
