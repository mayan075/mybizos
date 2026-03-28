"use client";

import {
  Phone,
  Inbox,
  BarChart3,
  Bot,
  CalendarCheck,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { RevealSection } from "./reveal-section";

export function FeaturesSection() {
  const features = [
    {
      icon: <Phone className="h-7 w-7" />,
      title: "AI Phone Agent",
      description: "Never miss a call again. AI answers 24/7, qualifies leads, books appointments.",
      gradient: "from-blue-500 to-indigo-600",
      size: "large",
    },
    {
      icon: <Inbox className="h-6 w-6" />,
      title: "Unified Inbox",
      description: "SMS, email, calls, social — all in one place.",
      gradient: "from-violet-500 to-purple-600",
      size: "small",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Smart Pipeline",
      description: "See every deal, every stage, at a glance.",
      gradient: "from-emerald-500 to-teal-600",
      size: "small",
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "Automated Follow-Up",
      description: "AI follows up so you don't have to. Never let a warm lead go cold.",
      gradient: "from-amber-500 to-orange-600",
      size: "small",
    },
    {
      icon: <CalendarCheck className="h-6 w-6" />,
      title: "Online Booking",
      description: "Customers book themselves. You just show up.",
      gradient: "from-cyan-500 to-blue-600",
      size: "small",
    },
    {
      icon: <CreditCard className="h-7 w-7" />,
      title: "Get Paid Faster",
      description: "Send invoices, collect payments by text. No chasing checks.",
      gradient: "from-rose-500 to-pink-600",
      size: "large",
    },
  ];

  return (
    <section id="features" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-sm font-medium text-green-500 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              The solution
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              One system. AI-powered.{" "}
              <span className="text-gradient-blue">Built for you.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Everything you need to run your business, in one place.
            </p>
          </div>
        </RevealSection>

        {/* Bento grid */}
        <div className="mx-auto mt-16 max-w-6xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const isLarge = f.size === "large";
              return (
                <RevealSection
                  key={f.title}
                  delay={i * 80}
                  className={isLarge ? "sm:col-span-2" : ""}
                >
                  <div className={`card-hover group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-7 shadow-sm ${isLarge ? "min-h-[200px]" : ""}`}>
                    {/* Gradient glow on hover — top corner */}
                    <div className={`pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${f.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-10`} />

                    <div className={`mb-5 flex ${isLarge ? "h-14 w-14" : "h-12 w-12"} items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg`}>
                      {f.icon}
                    </div>
                    <h3 className={`${isLarge ? "text-xl" : "text-lg"} font-bold text-foreground`}>
                      {f.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
