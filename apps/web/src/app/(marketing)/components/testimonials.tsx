"use client";

import { motion } from "motion/react";
import { Star } from "@phosphor-icons/react";

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
      quote: "I set up HararAI on a Saturday morning and had my AI agent answering calls by lunch. First customer booked that afternoon.",
      name: "Early Access User",
      role: "Beta Tester",
      stars: 5,
    },
  ];

  return (
    <section id="testimonials" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Trusted by local pros
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Real results from real service businesses.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="flex h-full flex-col rounded-2xl border border-border/30 bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            >
              <div className="mb-4 text-5xl font-serif leading-none text-sky-500/10">&ldquo;</div>
              <div className="mb-5 flex gap-1">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]"
                    weight="fill"
                  />
                ))}
              </div>
              <p className="flex-1 text-[15px] leading-relaxed text-foreground/75 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="rounded-full bg-gradient-to-br from-sky-500 to-teal-500 p-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-sm font-bold text-sky-600 dark:text-sky-400">
                    {t.name[0]}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
