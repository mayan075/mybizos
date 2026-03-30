"use client";

import Link from "next/link";
import {
  Wrench,
  Flame,
  Zap,
  SprayCan,
  Scissors,
  Briefcase,
  Dumbbell,
  UtensilsCrossed,
  Car,
  Camera,
  Building2,
  Heart,
  ArrowRight,
} from "lucide-react";
import { RevealSection } from "./reveal-section";

export function IndustryShowcase() {
  const industries = [
    { icon: <Wrench className="h-7 w-7" />, name: "Plumbing", slug: "plumbing", gradient: "from-cyan-500 to-blue-600" },
    { icon: <Flame className="h-7 w-7" />, name: "HVAC", slug: "hvac", gradient: "from-orange-500 to-red-600" },
    { icon: <Zap className="h-7 w-7" />, name: "Electrical", slug: "electrical", gradient: "from-amber-500 to-orange-600" },
    { icon: <SprayCan className="h-7 w-7" />, name: "Cleaning", slug: "cleaning", gradient: "from-violet-500 to-purple-600" },
    { icon: <Scissors className="h-7 w-7" />, name: "Salon & Spa", slug: "salon-spa", gradient: "from-pink-500 to-rose-600" },
    { icon: <Heart className="h-7 w-7" />, name: "Dental", slug: "dental", gradient: "from-sky-500 to-blue-600" },
    { icon: <Dumbbell className="h-7 w-7" />, name: "Fitness", slug: "fitness", gradient: "from-red-500 to-orange-600" },
    { icon: <UtensilsCrossed className="h-7 w-7" />, name: "Restaurant", slug: "restaurant", gradient: "from-emerald-500 to-green-600" },
    { icon: <Car className="h-7 w-7" />, name: "Auto Repair", slug: "auto-repair", gradient: "from-slate-500 to-zinc-600" },
    { icon: <Camera className="h-7 w-7" />, name: "Photography", slug: "photography", gradient: "from-purple-500 to-indigo-600" },
    { icon: <Briefcase className="h-7 w-7" />, name: "Consulting", slug: "consulting", gradient: "from-blue-500 to-indigo-600" },
    { icon: <Building2 className="h-7 w-7" />, name: "And More...", slug: "other", gradient: "from-gray-500 to-gray-600" },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Works for{" "}
              <span className="text-gradient-blue">every</span>{" "}
              industry
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Pre-configured templates for popular industries — or let AI set up your business from scratch.
            </p>
          </div>
        </RevealSection>

        {/* Mobile: horizontal scroll */}
        <div className="mt-14 -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:hidden snap-x snap-mandatory">
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/book/demo-${ind.slug}`}
              className="gradient-border card-hover flex w-40 shrink-0 snap-start flex-col items-center rounded-2xl border border-border/40 bg-card p-5 text-center shadow-sm"
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
            <RevealSection key={ind.slug} delay={i * 80}>
              <Link
                href={`/book/demo-${ind.slug}`}
                className="gradient-border card-hover group flex flex-col items-center rounded-2xl border border-border/40 bg-card p-6 text-center shadow-sm"
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  {ind.icon}
                </div>
                <span className="text-sm font-semibold text-foreground">{ind.name}</span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Try demo <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
