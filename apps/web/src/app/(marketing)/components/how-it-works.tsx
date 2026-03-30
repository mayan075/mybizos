"use client";

import { motion } from "motion/react";
import {
  Phone,
  Robot,
  Bell,
  ChatCircleDots,
  CheckCircle,
} from "@phosphor-icons/react";

export function HowItWorks() {
  const steps = [
    {
      icon: <Phone className="h-12 w-12" weight="duotone" />,
      step: "Step 1",
      title: "Customer calls your number",
      description: "Your existing business number. No changes needed — AI picks up instantly.",
      accent: "from-sky-500 to-sky-600",
      accentText: "text-sky-400",
      accentBorder: "border-sky-500/15",
      accentBg: "bg-sky-500/10",
      shadow: "shadow-sky-500/20",
    },
    {
      icon: <Robot className="h-12 w-12" weight="duotone" />,
      step: "Step 2",
      title: "AI answers, qualifies, and books",
      description: "Natural conversation. Understands your services, pricing, and availability.",
      accent: "from-teal-500 to-emerald-500",
      accentText: "text-teal-400",
      accentBorder: "border-teal-500/15",
      accentBg: "bg-teal-500/10",
      shadow: "shadow-teal-500/20",
      badges: [
        { icon: <ChatCircleDots className="h-3 w-3 text-sky-400" weight="fill" />, label: "Booked!" },
        { icon: <CheckCircle className="h-3 w-3 text-emerald-400" weight="fill" />, label: "Qualified" },
      ],
    },
    {
      icon: <Bell className="h-12 w-12" weight="duotone" />,
      step: "Step 3",
      title: "You get notified with a summary",
      description: "Full call transcript, customer details, and appointment on your calendar.",
      accent: "from-emerald-500 to-green-500",
      accentText: "text-emerald-400",
      accentBorder: "border-emerald-500/15",
      accentBg: "bg-emerald-500/10",
      shadow: "shadow-emerald-500/20",
      notification: { status: "New booking", detail: "Install — $850" },
    },
  ];

  return (
    <section
      id="how-ai-works"
      className="relative scroll-mt-16 overflow-hidden bg-[#060614] py-24 sm:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-[140px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-white/50">
            <Robot className="h-3.5 w-3.5 text-teal-400" weight="fill" />
            AI-Powered
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            How your AI employee works
          </h2>
          <p className="mt-5 text-lg text-white/35">
            From ring to revenue — fully automated, 24 hours a day.
          </p>
        </motion.div>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-6">
            {/* Connection line */}
            <div className="pointer-events-none absolute top-[72px] right-[16%] left-[16%] z-0 hidden md:block">
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
            </div>

            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                className="relative z-10 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.15 }}
              >
                <div className="relative mb-8">
                  <motion.div
                    className={`relative flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br ${s.accent} text-white shadow-2xl ${s.shadow}`}
                    whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 300, damping: 15 } }}
                  >
                    {s.icon}
                  </motion.div>

                  {/* Floating badges for step 2 */}
                  {s.badges?.map((badge, j) => (
                    <motion.div
                      key={badge.label}
                      className="absolute rounded-xl border border-white/[0.06] bg-[#0a0a1e]/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                      style={j === 0 ? { right: -24, top: -12 } : { left: -24, bottom: -12 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + j * 0.15, type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="flex items-center gap-1.5">
                        {badge.icon}
                        <span className="text-[10px] font-medium text-white/75">{badge.label}</span>
                      </div>
                    </motion.div>
                  ))}

                  {/* Notification card for step 3 */}
                  {s.notification && (
                    <motion.div
                      className="absolute -right-8 -top-4 rounded-xl border border-white/[0.06] bg-[#0a0a1e]/90 p-2.5 shadow-lg backdrop-blur-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-medium text-white/75">{s.notification.status}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-white/30">{s.notification.detail}</div>
                    </motion.div>
                  )}
                </div>

                <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full ${s.accentBg} ${s.accentBorder} border px-3 py-1 text-xs font-semibold ${s.accentText}`}>
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/35">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
