"use client";

import { PhoneOff, Clock, Layers } from "lucide-react";
import { RevealSection } from "./reveal-section";

export function ProblemSection() {
  const problems = [
    {
      icon: <PhoneOff className="h-6 w-6" />,
      title: "Missing calls while on a job",
      stat: "27%",
      detail: "of calls missed = lost revenue",
      gradient: "from-red-500 to-orange-500",
      glowColor: "shadow-red-500/20",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Spending hours on admin instead of actual work",
      stat: "10+ hrs",
      detail: "per week on average",
      gradient: "from-amber-500 to-yellow-500",
      glowColor: "shadow-amber-500/20",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Juggling 7+ apps that don't talk to each other",
      stat: "$500-1,000",
      detail: "per month wasted",
      gradient: "from-purple-500 to-pink-500",
      glowColor: "shadow-purple-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Sound familiar?
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Every missed call is a missed opportunity. Every hour on admin is
              an hour not earning.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {problems.map((p, i) => (
            <RevealSection key={p.title} delay={i * 120}>
              <div className={`card-hover group relative overflow-hidden rounded-2xl bg-card p-8 shadow-xl ${p.glowColor}`}>
                {/* Gradient accent bar at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.gradient}`} />
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${p.iconBg} ${p.iconColor}`}>
                  {p.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className={`bg-gradient-to-r ${p.gradient} bg-clip-text text-3xl font-extrabold text-transparent`}>
                    {p.stat}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {p.detail}
                  </span>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
