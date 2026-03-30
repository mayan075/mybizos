"use client";

import { motion } from "motion/react";
import {
  Phone,
  Tray,
  ChartBar,
  Robot,
  CalendarCheck,
  CreditCard,
  CheckCircle,
} from "@phosphor-icons/react";

export function FeaturesSection() {
  const features = [
    {
      icon: <Phone className="h-7 w-7" weight="duotone" />,
      title: "AI Phone Agent",
      description: "Never miss a call again. AI answers 24/7, qualifies leads, books appointments.",
      gradient: "from-sky-500 to-sky-600",
      size: "large" as const,
    },
    {
      icon: <Tray className="h-6 w-6" weight="duotone" />,
      title: "Unified Inbox",
      description: "SMS, email, calls, social — all in one place.",
      gradient: "from-violet-500 to-violet-600",
      size: "small" as const,
    },
    {
      icon: <ChartBar className="h-6 w-6" weight="duotone" />,
      title: "Smart Pipeline",
      description: "See every deal, every stage, at a glance.",
      gradient: "from-emerald-500 to-teal-600",
      size: "small" as const,
    },
    {
      icon: <Robot className="h-6 w-6" weight="duotone" />,
      title: "Automated Follow-Up",
      description: "AI follows up so you don't have to. Never let a warm lead go cold.",
      gradient: "from-amber-500 to-orange-500",
      size: "small" as const,
    },
    {
      icon: <CalendarCheck className="h-6 w-6" weight="duotone" />,
      title: "Online Booking",
      description: "Customers book themselves. You just show up.",
      gradient: "from-cyan-500 to-sky-600",
      size: "small" as const,
    },
    {
      icon: <CreditCard className="h-7 w-7" weight="duotone" />,
      title: "Get Paid Faster",
      description: "Send invoices, collect payments by text. No chasing checks.",
      gradient: "from-rose-500 to-rose-600",
      size: "large" as const,
    },
  ];

  return (
    <section id="features" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" weight="fill" />
            The solution
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            One system. AI-powered.{" "}
            <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">
              Built for you.
            </span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Everything you need to run your business, in one place.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 max-w-6xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const isLarge = f.size === "large";
              return (
                <motion.div
                  key={f.title}
                  className={`group relative overflow-hidden rounded-2xl border border-border/30 bg-card p-7 shadow-sm transition-shadow hover:shadow-lg ${isLarge ? "sm:col-span-2 min-h-[200px]" : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.06 }}
                  whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                >
                  {/* Gradient glow on hover */}
                  <div className={`pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${f.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.07]`} />

                  <div className={`mb-5 flex ${isLarge ? "h-14 w-14" : "h-12 w-12"} items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg`}>
                    {f.icon}
                  </div>
                  <h3 className={`${isLarge ? "text-xl" : "text-lg"} font-bold text-foreground`}>
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
