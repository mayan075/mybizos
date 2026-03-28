"use client";

import { Star } from "lucide-react";
import { RevealSection } from "./reveal-section";

export function Testimonials() {
  const testimonials = [
    {
      quote: "The AI phone agent books 3-4 extra appointments every week while we're on the road. That's $2,000+ in revenue we were leaving on the table.",
      name: "Mayan",
      role: "Northern Removals",
      stars: 5,
    },
    {
      quote: "We switched from GoHighLevel and cut our software bill by 60%. The AI actually does more than GHL ever did.",
      name: "Mayan",
      role: "Readytomove",
      stars: 5,
    },
    {
      quote: "I set up MyBizOS on a Saturday morning and had my AI agent answering calls by lunch. First customer booked that afternoon.",
      name: "Early Access User",
      role: "Beta Tester",
      stars: 5,
    },
  ];

  return (
    <section id="testimonials" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Trusted by local pros
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Real results from real service businesses.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <RevealSection key={t.name} delay={i * 120}>
              <div className="card-hover flex h-full flex-col rounded-2xl border border-border/40 bg-card p-8 shadow-sm">
                {/* Large decorative quote */}
                <div className="mb-4 text-5xl font-serif leading-none text-indigo-500/15">&ldquo;</div>
                {/* Stars with glow */}
                <div className="mb-5 flex gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
                    />
                  ))}
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-foreground/80 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  {/* Avatar with gradient ring */}
                  <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-sm font-bold text-indigo-600">
                      {t.name[0]}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
