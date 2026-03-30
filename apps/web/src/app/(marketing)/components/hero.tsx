"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import {
  Phone as PhoneIcon,
  CalendarCheck,
  TrendUp,
  Lightning,
  ArrowRight,
  ChartLineUp,
  ChatCircleDots,
  Bell as BellIcon,
  Star as StarIcon,
  CheckCircle,
} from "@phosphor-icons/react";
import { MagneticButton } from "@/components/ui/magnetic-button";

/* ------------------------------------------------------------------ */
/*  Count-Up Hook (Intersection Observer)                              */
/* ------------------------------------------------------------------ */
function useCountUp(end: number, duration = 1800, prefix = "", suffix = "") {
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const ref = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(end * eased);
            setDisplay(`${prefix}${current.toLocaleString()}${suffix}`);
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, prefix, suffix]);

  return { ref, display };
}

/* ------------------------------------------------------------------ */
/*  Hero Stat                                                          */
/* ------------------------------------------------------------------ */
function HeroStat({
  endValue,
  prefix,
  suffix,
  label,
  icon,
}: {
  endValue: number;
  prefix?: string;
  suffix?: string;
  label: string;
  icon: React.ReactNode;
}) {
  const { ref, display } = useCountUp(endValue, 1800, prefix ?? "", suffix ?? "");
  return (
    <div ref={ref} className="flex items-center justify-center gap-3 px-6 py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
        {icon}
      </div>
      <div>
        <div className="tabular-nums text-xl font-bold text-white">{display}</div>
        <div className="text-xs text-white/35">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Mockup                                                   */
/* ------------------------------------------------------------------ */
function DashboardMockup() {
  const sidebarItems = [
    { name: "Dashboard", icon: "grid", active: true },
    { name: "Contacts", icon: "users", active: false },
    { name: "Pipeline", icon: "kanban", active: false },
    { name: "Inbox", icon: "inbox", badge: 3, active: false },
    { name: "Calls", icon: "phone", active: false },
    { name: "Scheduling", icon: "cal", active: false },
  ];

  const pipelineData = [
    {
      stage: "New Lead",
      color: "bg-sky-400",
      borderColor: "border-sky-400/15",
      items: [
        { name: "Sarah M.", detail: "Consultation", time: "2m ago" },
        { name: "James K.", detail: "Deep Clean", time: "18m ago" },
        { name: "Lisa P.", detail: "Website Redesign", time: "1h ago" },
      ],
    },
    {
      stage: "Quoted",
      color: "bg-amber-400",
      borderColor: "border-amber-400/15",
      items: [
        { name: "Mike R.", detail: "Kitchen Reno", time: "$2,400" },
        { name: "Anna T.", detail: "Color & Cut", time: "$180" },
      ],
    },
    {
      stage: "Scheduled",
      color: "bg-violet-400",
      borderColor: "border-violet-400/15",
      items: [
        { name: "Tom B.", detail: "AC Tune-up", time: "Tomorrow" },
        { name: "Karen W.", detail: "Tax Review", time: "Mar 28" },
      ],
    },
    {
      stage: "Completed",
      color: "bg-emerald-400",
      borderColor: "border-emerald-400/15",
      items: [
        { name: "David L.", detail: "Drain Clear", time: "$320" },
      ],
    },
  ];

  return (
    <motion.div
      className="mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.5 }}
    >
      {/* Desktop mockup */}
      <div className="hidden sm:block">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c20]/80 shadow-2xl shadow-black/40 ring-1 ring-white/[0.03]">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.04] bg-white/[0.015] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="ml-3 flex-1 rounded-lg bg-white/[0.03] px-3 py-1 text-[10px] font-mono text-white/20">
              app.hararai.com/dashboard
            </div>
          </div>

          <div className="flex" style={{ height: "340px" }}>
            {/* Sidebar */}
            <div className="hidden w-44 shrink-0 border-r border-white/[0.04] bg-[#08081a] p-3 md:block">
              <div className="mb-5 flex items-center gap-2 px-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500">
                  <Lightning className="h-3 w-3 text-white" weight="fill" />
                </div>
                <span className="text-[11px] font-bold tracking-tight text-white/70">HararAI</span>
              </div>

              <div className="space-y-0.5">
                {sidebarItems.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[10px] transition-colors ${
                      item.active
                        ? "bg-white/[0.06] font-semibold text-white/80"
                        : "text-white/25"
                    }`}
                  >
                    <div className={`h-3 w-3 rounded ${item.active ? "bg-white/20" : "bg-white/8"}`} />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/80 text-[7px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-white/[0.04] pt-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[7px] font-bold text-white">
                    JD
                  </div>
                  <div>
                    <div className="text-[9px] font-medium text-white/50">Johnson & Co</div>
                    <div className="text-[7px] text-white/20">Pro Plan</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden bg-[#0a0a1e] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-white/85">Good morning, Jake</div>
                  <div className="text-[9px] text-white/25">Tuesday, March 25 — 8 new leads today</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-white/25">
                    <BellIcon className="h-3 w-3" weight="duotone" />
                  </div>
                  <div className="flex h-7 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 text-[9px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI Active
                  </div>
                </div>
              </div>

              <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Leads Today", value: "12", change: "+3", color: "text-sky-400" },
                  { label: "Booked", value: "5", change: "+2", color: "text-emerald-400" },
                  { label: "Revenue", value: "$3.2k", change: "+18%", color: "text-amber-400" },
                  { label: "Response", value: "98%", change: "Top 5%", color: "text-violet-400" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <div className="text-[8px] font-medium uppercase tracking-wider text-white/20">{stat.label}</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-[15px] font-bold ${stat.color}`}>{stat.value}</span>
                      <span className="text-[7px] font-medium text-emerald-400/60">{stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-white/40">Pipeline</div>
                  <div className="text-[8px] text-white/15">8 active · $6,570 total</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {pipelineData.map((stage) => (
                    <div key={stage.stage}>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${stage.color}`} />
                        <span className="text-[8px] font-semibold uppercase tracking-wider text-white/25">{stage.stage}</span>
                      </div>
                      <div className="space-y-1">
                        {stage.items.map((item, j) => (
                          <div key={j} className={`rounded-lg border ${stage.borderColor} bg-white/[0.02] p-1.5`}>
                            <div className="text-[8px] font-medium text-white/50">{item.name}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[7px] text-white/20">{item.detail}</span>
                              <span className="text-[7px] text-white/15">{item.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: badge */}
      <div className="flex justify-center sm:hidden">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
            <Lightning className="h-4 w-4 text-white" weight="fill" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white/75">Full dashboard included</div>
            <div className="text-[10px] text-white/25">CRM + Pipeline + AI Agent + Scheduling</div>
          </div>
        </div>
      </div>

      {/* Glow reflection */}
      <div className="mx-8 hidden h-14 rounded-b-3xl bg-gradient-to-b from-sky-500/10 to-transparent blur-2xl sm:block" />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating Notification Cards                                        */
/* ------------------------------------------------------------------ */
function FloatingCard({
  children,
  className,
  delay,
  duration,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  duration: number;
}) {
  return (
    <motion.div
      className={`absolute z-10 hidden rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl lg:block ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -12, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: aurora blobs drift up as you scroll
  const auroraY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={sectionRef} className="relative min-h-screen overflow-hidden bg-[#060614]">
      {/* Mesh gradient background */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: auroraY }}
      >
        <div className="absolute -top-1/4 left-[20%] h-[700px] w-[700px] rounded-full bg-sky-600/15 blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-[40%] h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </motion.div>

      {/* Dot grid */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      <motion.div
        className="relative mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-28 lg:px-8"
        style={{ opacity: contentOpacity }}
      >
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-white/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <Lightning className="h-3.5 w-3.5 text-sky-400" weight="fill" />
            AI that works while you sleep
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl leading-[1.02] font-extrabold tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[5.5rem]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 }}
          >
            <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
              Never miss a call.
            </span>
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
              Never lose a lead.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/40 sm:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
          >
            HararAI answers every call, books every appointment, and follows up
            every lead — 24/7, for any business.
          </motion.p>

          {/* Social proof */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-3 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            <div className="flex -space-x-2">
              {["from-sky-400 to-sky-600", "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600", "from-violet-400 to-violet-600", "from-rose-400 to-rose-600"].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#060614] bg-gradient-to-br ${bg} text-[9px] font-bold text-white`}
                >
                  {["J", "S", "M", "R", "D"][i]}
                </div>
              ))}
            </div>
            <span className="font-medium text-white/35">
              Trusted by 500+ local businesses
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
          >
            <MagneticButton
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:brightness-110"
              onClick={() => window.location.href = "/register"}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
            </MagneticButton>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-4 text-base font-semibold text-white/60 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:text-white/80"
            >
              See a live demo
            </Link>
          </motion.div>
        </div>

        {/* Floating cards + Dashboard mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          {/* Card 1 — Appointment booked */}
          <FloatingCard
            className="border-emerald-500/15 bg-[#0a1a12]/80 shadow-emerald-500/5 -left-6 top-4"
            delay={0.8}
            duration={6}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                <CalendarCheck className="h-[18px] w-[18px] text-emerald-400" weight="duotone" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/90">AI booked an appointment</div>
                <div className="text-[11px] text-emerald-400/50">Consultation — Tomorrow 2pm</div>
              </div>
            </div>
          </FloatingCard>

          {/* Card 2 — Lead scored */}
          <FloatingCard
            className="border-sky-500/15 bg-[#0a1420]/80 shadow-sky-500/5 -right-6 top-10"
            delay={1.1}
            duration={7}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/15">
                <ChartLineUp className="h-[18px] w-[18px] text-sky-400" weight="duotone" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/90">Lead scored 92</div>
                <div className="text-[11px] text-sky-400/50">High intent — new customer inquiry</div>
              </div>
            </div>
          </FloatingCard>

          {/* Card 3 — Review responded */}
          <FloatingCard
            className="border-amber-500/15 bg-[#1a1408]/80 shadow-amber-500/5 -right-10 bottom-16"
            delay={1.4}
            duration={5}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/15">
                <StarIcon className="h-[18px] w-[18px] text-amber-400" weight="duotone" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/90">Review responded</div>
                <div className="text-[11px] text-amber-400/50">5-star reply sent automatically</div>
              </div>
            </div>
          </FloatingCard>

          <DashboardMockup />
        </div>

        {/* Stats bar */}
        <motion.div
          className="mx-auto mt-16 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-sm">
            <div className="grid grid-cols-1 divide-y divide-white/[0.04] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <HeroStat
                endValue={342}
                label="calls answered"
                icon={<PhoneIcon className="h-4 w-4 text-emerald-400" weight="duotone" />}
              />
              <HeroStat
                endValue={47}
                label="appointments booked"
                icon={<CalendarCheck className="h-4 w-4 text-sky-400" weight="duotone" />}
              />
              <HeroStat
                endValue={12400}
                prefix="$"
                label="revenue generated"
                icon={<TrendUp className="h-4 w-4 text-amber-400" weight="duotone" />}
              />
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-white/20">
            — this month alone, for a single customer
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
