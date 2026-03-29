"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone,
  CalendarCheck,
  TrendingUp,
  Star,
  ArrowRight,
  Zap,
  ChevronRight,
  Sparkles,
  Bell,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animated Counter Hook                                              */
/* ------------------------------------------------------------------ */
function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevTarget.current = target;
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Count Up Hook                                                      */
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
        if (entry.isIntersecting && !hasRun.current) {
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
/*  HeroStat                                                           */
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
  const { ref, display } = useCountUp(endValue, 1800, prefix || "", suffix || "");
  return (
    <div ref={ref} className="flex items-center justify-center gap-3 px-6 py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <div>
        <div className="tabular-nums text-xl font-bold text-white">{display}</div>
        <div className="text-xs text-white/40">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini sidebar icons for the mockup                                  */
/* ------------------------------------------------------------------ */
function SidebarIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "text-indigo-400" : "text-white/20";
  const size = "h-3 w-3";
  switch (name) {
    case "grid":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1.5" />
          <rect x="9" y="1" width="6" height="6" rx="1.5" />
          <rect x="1" y="9" width="6" height="6" rx="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "users":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <circle cx="6" cy="5" r="2.5" /><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5H1z" />
          <circle cx="11" cy="4" r="2" opacity="0.5" /><path d="M10 9.5c1 0 2 .3 2.8.9C14.1 11.3 15 12.5 15 14h-4" opacity="0.5" />
        </svg>
      );
    case "kanban":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="3.5" height="14" rx="1" />
          <rect x="6.25" y="1" width="3.5" height="10" rx="1" />
          <rect x="11.5" y="1" width="3.5" height="7" rx="1" />
        </svg>
      );
    case "inbox":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7l-3 3H3a1 1 0 01-1-1V3z" />
          <path d="M11 10h3l-3 3v-3z" opacity="0.5" />
        </svg>
      );
    case "phone":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.6 1.2c.5-.5 1.3-.4 1.7.1L7 3.5c.4.5.3 1.2-.1 1.6l-.7.7c-.2.2-.2.5 0 .8l2.2 2.2c.3.3.6.2.8 0l.7-.7c.4-.4 1.1-.5 1.6-.1l2.2 1.7c.5.4.6 1.2.1 1.7l-1.4 1.4c-.5.5-1.2.7-1.9.5C7.1 12.5 3.5 8.9 2.7 5.5c-.2-.7 0-1.4.5-1.9L3.6 1.2z" />
        </svg>
      );
    case "cal":
      return (
        <svg className={`${size} ${color}`} viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="3" width="14" height="12" rx="2" />
          <rect x="4" y="1" width="1.5" height="4" rx="0.75" />
          <rect x="10.5" y="1" width="1.5" height="4" rx="0.75" />
          <rect x="1" y="6.5" width="14" height="1" opacity="0.3" />
        </svg>
      );
    default:
      return <div className={`h-3 w-3 rounded bg-white/10`} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Dashboard Mockup                                                   */
/* ------------------------------------------------------------------ */
function DashboardMockup() {
  const sidebarItems = [
    { name: "Dashboard", icon: "grid", active: true },
    { name: "Contacts", icon: "users", active: false },
    { name: "Pipeline", icon: "kanban", active: false },
    { name: "Inbox", icon: "inbox", active: false },
    { name: "Calls", icon: "phone", active: false },
    { name: "Scheduling", icon: "cal", active: false },
  ];

  const pipelineData = [
    {
      stage: "New Lead",
      color: "bg-blue-400",
      borderColor: "border-blue-500/20",
      items: [
        { name: "Sarah M.", detail: "AC Repair", time: "2m ago" },
        { name: "James K.", detail: "Furnace Install", time: "18m ago" },
        { name: "Lisa P.", detail: "Duct Cleaning", time: "1h ago" },
      ],
    },
    {
      stage: "Quoted",
      color: "bg-amber-400",
      borderColor: "border-amber-500/20",
      items: [
        { name: "Mike R.", detail: "Water Heater", time: "$2,400" },
        { name: "Anna T.", detail: "Pipe Repair", time: "$850" },
      ],
    },
    {
      stage: "Scheduled",
      color: "bg-purple-400",
      borderColor: "border-purple-500/20",
      items: [
        { name: "Tom B.", detail: "HVAC Tune-up", time: "Tomorrow" },
        { name: "Karen W.", detail: "AC Install", time: "Mar 28" },
      ],
    },
    {
      stage: "Completed",
      color: "bg-green-400",
      borderColor: "border-green-500/20",
      items: [
        { name: "David L.", detail: "Drain Clear", time: "$320" },
      ],
    },
  ];

  return (
    <div className="dashboard-mockup mx-auto max-w-4xl">
      {/* Hide on mobile — too small to be useful */}
      <div className="hidden sm:block">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c24]/90 shadow-2xl shadow-indigo-900/20 ring-1 ring-white/5">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-3 flex-1 rounded-lg bg-white/[0.04] px-3 py-1 text-[10px] text-white/25 font-mono">
              app.hararai.com/dashboard
            </div>
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-white/10" />
              <div className="h-2 w-2 rounded-sm bg-white/10" />
            </div>
          </div>

          <div className="flex" style={{ height: "340px" }}>
            {/* Sidebar */}
            <div className="hidden w-44 shrink-0 border-r border-white/5 bg-[#08081c] p-3 md:block">
              {/* Logo */}
              <div className="mb-5 flex items-center gap-2 px-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-[7px] font-bold text-white">M</span>
                </div>
                <span className="text-[11px] font-bold tracking-tight text-white/80">HararAI</span>
              </div>

              {/* Nav items */}
              <div className="space-y-0.5">
                {sidebarItems.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[10px] transition-colors ${
                      item.active
                        ? "bg-indigo-500/15 font-semibold text-indigo-300"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    <SidebarIcon name={item.icon} active={item.active} />
                    {item.name}
                    {item.name === "Inbox" && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-[7px] font-bold text-white">3</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom section */}
              <div className="mt-6 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-[7px] font-bold text-white">
                    JD
                  </div>
                  <div>
                    <div className="text-[9px] font-medium text-white/60">Johnson HVAC</div>
                    <div className="text-[7px] text-white/25">Pro Plan</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-hidden bg-[#0a0a22] p-4">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-white/90">Good morning, Jake</div>
                  <div className="text-[9px] text-white/30">Tuesday, March 25 — 8 new leads today</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/30">
                    <Bell className="h-3 w-3" />
                  </div>
                  <div className="flex h-7 items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 text-[9px] font-medium text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    AI Active
                  </div>
                </div>
              </div>

              {/* Stat cards row */}
              <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Leads Today", value: "12", change: "+3", color: "text-blue-400", accent: "bg-blue-500", arrow: "\u2191" },
                  { label: "Booked", value: "5", change: "+2", color: "text-green-400", accent: "bg-green-500", arrow: "\u2191" },
                  { label: "Revenue", value: "$3.2k", change: "+18%", color: "text-amber-400", accent: "bg-amber-500", arrow: "\u2191" },
                  { label: "Response", value: "98%", change: "Top 5%", color: "text-violet-400", accent: "bg-violet-500", arrow: "\u2605" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[8px] font-medium uppercase tracking-wider text-white/25">{stat.label}</div>
                      <div className={`h-1.5 w-1.5 rounded-full ${stat.accent}`} />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-[15px] font-bold ${stat.color}`}>{stat.value}</span>
                      <span className="text-[7px] font-medium text-green-400/70">{stat.arrow} {stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline kanban */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-white/50">Pipeline</div>
                  <div className="flex items-center gap-1 text-[8px] text-white/20">
                    <span>8 active</span>
                    <span className="text-white/10">|</span>
                    <span>$6,570 total</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {pipelineData.map((stage) => (
                    <div key={stage.stage}>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${stage.color}`} />
                        <span className="text-[8px] font-semibold uppercase tracking-wider text-white/30">{stage.stage}</span>
                        <span className="ml-auto text-[7px] text-white/15">{stage.items.length}</span>
                      </div>
                      <div className="space-y-1">
                        {stage.items.map((item, j) => (
                          <div
                            key={j}
                            className={`rounded-lg border ${stage.borderColor} bg-white/[0.03] p-1.5`}
                          >
                            <div className="text-[8px] font-medium text-white/60">{item.name}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[7px] text-white/25">{item.detail}</span>
                              <span className="text-[7px] text-white/20">{item.time}</span>
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

      {/* Mobile: simplified badge instead of unusable tiny mockup */}
      <div className="flex justify-center sm:hidden">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white/80">Full dashboard included</div>
            <div className="text-[10px] text-white/30">CRM + Pipeline + AI Agent + Scheduling</div>
          </div>
        </div>
      </div>

      {/* Glow reflection beneath */}
      <div className="mx-8 hidden h-14 rounded-b-3xl bg-gradient-to-b from-indigo-500/15 to-transparent blur-2xl sm:block" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#06061a]">
      {/* Aurora gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/4 left-1/4 h-[800px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px]"
          style={{ animation: "auroraShift 20s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-purple-600/15 blur-[100px]"
          style={{ animation: "auroraShift 25s ease-in-out infinite reverse" }}
        />
        <div
          className="absolute -bottom-1/4 left-1/2 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[100px]"
          style={{ animation: "auroraShift 18s ease-in-out infinite 5s" }}
        />
      </div>

      {/* Dot grid overlay */}
      <div className="dot-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Built for local service businesses
          </div>

          {/* Hero headline */}
          <h1
            className="text-gradient-hero text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
          >
            Your AI Employee
            <br />
            That Never Sleeps
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
            HararAI answers every call, books every appointment, and follows up
            every lead — so you can focus on doing the work you love.
          </p>

          {/* Social proof */}
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-white/40">
            <div className="flex -space-x-2">
              {[
                "from-blue-400 to-blue-600",
                "from-green-400 to-green-600",
                "from-amber-400 to-amber-600",
                "from-violet-400 to-violet-600",
                "from-rose-400 to-rose-600",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0a0a1a] bg-gradient-to-br ${bg} text-[10px] font-bold text-white`}
                >
                  {["J", "S", "M", "R", "D"][i]}
                </div>
              ))}
            </div>
            <span className="font-medium text-white/50">
              Trusted by 500+ local businesses
            </span>
          </div>

          {/* CTA buttons */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110"
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
              <span className="relative">Start Free Trial</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="glass inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              See a live demo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Floating glassmorphism cards around hero */}
        <div className="pointer-events-none relative mx-auto mt-16 max-w-5xl">
          {/* Card 1 — top left: green accent */}
          <div
            className="absolute -left-6 top-4 z-10 hidden rounded-2xl border border-green-500/20 bg-[#0d1a14]/90 px-4 py-3 shadow-lg shadow-green-500/10 backdrop-blur-xl lg:block"
            style={{ animation: "floatCard1 6s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 ring-1 ring-green-500/20">
                <CalendarCheck className="h-4.5 w-4.5 text-green-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/95">AI booked an appointment</div>
                <div className="text-[11px] text-green-400/60">HVAC Install — Tomorrow 2pm</div>
              </div>
            </div>
          </div>

          {/* Card 2 — top right: blue accent */}
          <div
            className="absolute -right-6 top-10 z-10 hidden rounded-2xl border border-blue-500/20 bg-[#0d1420]/90 px-4 py-3 shadow-lg shadow-blue-500/10 backdrop-blur-xl lg:block"
            style={{ animation: "floatCard2 7s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20">
                <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/95">Lead scored 92</div>
                <div className="text-[11px] text-blue-400/60">High intent — water heater repair</div>
              </div>
            </div>
          </div>

          {/* Card 3 — bottom right: amber/gold accent */}
          <div
            className="absolute -right-10 bottom-16 z-10 hidden rounded-2xl border border-amber-500/20 bg-[#1a1608]/90 px-4 py-3 shadow-lg shadow-amber-500/10 backdrop-blur-xl lg:block"
            style={{ animation: "floatCard3 5s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
                <Star className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/95">Review responded</div>
                <div className="text-[11px] text-amber-400/60">5-star reply sent automatically</div>
              </div>
            </div>
          </div>

          {/* Dashboard mockup */}
          <DashboardMockup />
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="glass-card overflow-hidden p-1">
            <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <HeroStat
                endValue={342}
                label="calls answered"
                icon={<Phone className="h-4 w-4 text-green-400" />}
              />
              <HeroStat
                endValue={47}
                label="appointments booked"
                icon={<CalendarCheck className="h-4 w-4 text-indigo-400" />}
              />
              <HeroStat
                endValue={12400}
                prefix="$"
                label="revenue generated"
                icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
              />
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-white/30">
            — this month alone, for a single customer
          </p>
        </div>
      </div>

      {/* Bottom gradient fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}
