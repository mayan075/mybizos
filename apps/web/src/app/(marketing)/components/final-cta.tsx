"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/ui/magnetic-button";

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-teal-600 to-emerald-600 px-8 py-20 text-center shadow-2xl shadow-sky-500/15 sm:px-16 sm:py-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/8 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-white/8 blur-3xl" />
            <div className="dot-grid absolute inset-0 opacity-[0.07]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to stop missing calls
              <br />
              and start growing?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/55">
              Join hundreds of local businesses that have transformed their
              operations with AI.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <MagneticButton
                className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-sky-700 shadow-xl transition-all hover:bg-white/95 hover:shadow-2xl"
                onClick={() => window.location.href = "/register"}
              >
                Start Free Trial — No Credit Card
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
              </MagneticButton>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
              >
                See live demo
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
