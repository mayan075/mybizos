"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Wrench,
  Fire,
  Lightning,
  SprayBottle,
  Scissors,
  Heartbeat,
  Barbell,
  ForkKnife,
  Car,
  Camera,
  Briefcase,
  Buildings,
  ArrowRight,
} from "@phosphor-icons/react";

export function IndustryShowcase() {
  const industries = [
    { icon: <Wrench className="h-7 w-7" weight="duotone" />, name: "Plumbing", slug: "plumbing", gradient: "from-cyan-500 to-sky-600" },
    { icon: <Fire className="h-7 w-7" weight="duotone" />, name: "HVAC", slug: "hvac", gradient: "from-orange-500 to-red-500" },
    { icon: <Lightning className="h-7 w-7" weight="duotone" />, name: "Electrical", slug: "electrical", gradient: "from-amber-500 to-orange-500" },
    { icon: <SprayBottle className="h-7 w-7" weight="duotone" />, name: "Cleaning", slug: "cleaning", gradient: "from-violet-500 to-violet-600" },
    { icon: <Scissors className="h-7 w-7" weight="duotone" />, name: "Salon & Spa", slug: "salon-spa", gradient: "from-pink-500 to-rose-500" },
    { icon: <Heartbeat className="h-7 w-7" weight="duotone" />, name: "Dental", slug: "dental", gradient: "from-sky-500 to-sky-600" },
    { icon: <Barbell className="h-7 w-7" weight="duotone" />, name: "Fitness", slug: "fitness", gradient: "from-red-500 to-orange-500" },
    { icon: <ForkKnife className="h-7 w-7" weight="duotone" />, name: "Restaurant", slug: "restaurant", gradient: "from-emerald-500 to-green-500" },
    { icon: <Car className="h-7 w-7" weight="duotone" />, name: "Auto Repair", slug: "auto-repair", gradient: "from-slate-500 to-zinc-500" },
    { icon: <Camera className="h-7 w-7" weight="duotone" />, name: "Photography", slug: "photography", gradient: "from-violet-500 to-indigo-500" },
    { icon: <Briefcase className="h-7 w-7" weight="duotone" />, name: "Consulting", slug: "consulting", gradient: "from-sky-500 to-indigo-500" },
    { icon: <Buildings className="h-7 w-7" weight="duotone" />, name: "And More...", slug: "other", gradient: "from-gray-500 to-gray-600" },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Works for{" "}
            <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">every</span>{" "}
            industry
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Pre-configured templates for popular industries — or let AI set up your business from scratch.
          </p>
        </motion.div>

        {/* Mobile: horizontal scroll */}
        <div className="-mx-4 mt-14 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:hidden">
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/book/demo-${ind.slug}`}
              className="flex w-40 shrink-0 snap-start flex-col items-center rounded-2xl border border-border/30 bg-card p-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-lg`}>
                {ind.icon}
              </div>
              <span className="text-sm font-semibold text-foreground">{ind.name}</span>
            </Link>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="mx-auto mt-14 hidden max-w-5xl grid-cols-3 gap-4 sm:grid md:grid-cols-4 lg:grid-cols-6">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.04 }}
            >
              <Link
                href={`/book/demo-${ind.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-border/30 bg-card p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-border/50"
              >
                <motion.div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-lg`}
                  whileHover={{ scale: 1.1, transition: { type: "spring", stiffness: 400, damping: 15 } }}
                >
                  {ind.icon}
                </motion.div>
                <span className="text-sm font-semibold text-foreground">{ind.name}</span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-sky-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Try demo <ArrowRight className="h-3 w-3" weight="bold" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
