"use client";

import { motion } from "motion/react";
import { PhoneSlash, Clock, Stack } from "@phosphor-icons/react";

export function ProblemSection() {
  const problems = [
    {
      icon: <PhoneSlash className="h-6 w-6" weight="duotone" />,
      title: "Missing calls while on a job",
      stat: "27%",
      detail: "of calls missed = lost revenue",
      accent: "text-red-400",
      accentBg: "bg-red-500/8",
      accentBorder: "border-red-500/10",
      barGradient: "from-red-500 to-orange-500",
    },
    {
      icon: <Clock className="h-6 w-6" weight="duotone" />,
      title: "Spending hours on admin instead of actual work",
      stat: "10+ hrs",
      detail: "per week on average",
      accent: "text-amber-400",
      accentBg: "bg-amber-500/8",
      accentBorder: "border-amber-500/10",
      barGradient: "from-amber-500 to-yellow-500",
    },
    {
      icon: <Stack className="h-6 w-6" weight="duotone" />,
      title: "Juggling 7+ apps that don't talk to each other",
      stat: "$500-1,000",
      detail: "per month wasted",
      accent: "text-rose-400",
      accentBg: "bg-rose-500/8",
      accentBorder: "border-rose-500/10",
      barGradient: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Sound familiar?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Every missed call is a missed opportunity. Every hour on admin is
            an hour not earning.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              className={`group relative overflow-hidden rounded-2xl border ${p.accentBorder} bg-card p-8 shadow-sm transition-all hover:shadow-lg`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${p.barGradient}`} />
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${p.accentBg} ${p.accent}`}>
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${p.accent}`}>{p.stat}</span>
                <span className="text-sm text-muted-foreground">{p.detail}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
