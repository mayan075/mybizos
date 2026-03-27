"use client";

import Link from "next/link";
import {
  Truck,
  Wrench,
  Flame,
  Zap,
  SprayCan,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { RevealSection } from "./reveal-section";

export function IndustryShowcase() {
  const industries = [
    { icon: <Trash2 className="h-7 w-7" />, name: "Rubbish Removals", slug: "rubbish-removal", gradient: "from-green-500 to-emerald-600" },
    { icon: <Truck className="h-7 w-7" />, name: "Moving Companies", slug: "moving", gradient: "from-blue-500 to-indigo-600" },
    { icon: <Wrench className="h-7 w-7" />, name: "Plumbing", slug: "plumbing", gradient: "from-cyan-500 to-blue-600" },
    { icon: <Flame className="h-7 w-7" />, name: "HVAC", slug: "hvac", gradient: "from-orange-500 to-red-600" },
    { icon: <Zap className="h-7 w-7" />, name: "Electrical", slug: "electrical", gradient: "from-amber-500 to-orange-600" },
    { icon: <SprayCan className="h-7 w-7" />, name: "Cleaning", slug: "cleaning", gradient: "from-violet-500 to-purple-600" },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Built for{" "}
              <span className="text-gradient-blue">YOUR</span>{" "}
              industry
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Pre-configured AI scripts, booking flows, and automations tailored to your trade.
            </p>
          </div>
        </RevealSection>

        {/* Mobile: horizontal scroll */}
        <div className="mt-14 -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:hidden snap-x snap-mandatory">
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/book/demo-${ind.slug}`}
              className="gradient-border card-hover flex w-40 shrink-0 snap-start flex-col items-center rounded-2xl border border-border/40 bg-white p-5 text-center shadow-sm"
            >
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-lg`}>
                {ind.icon}
              </div>
              <span className="text-sm font-semibold text-foreground">{ind.name}</span>
            </Link>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="mx-auto mt-14 hidden max-w-5xl grid-cols-3 gap-4 sm:grid lg:grid-cols-6">
          {industries.map((ind, i) => (
            <RevealSection key={ind.slug} delay={i * 80}>
              <Link
                href={`/book/demo-${ind.slug}`}
                className="gradient-border card-hover group flex flex-col items-center rounded-2xl border border-border/40 bg-white p-6 text-center shadow-sm"
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
