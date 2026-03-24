"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Inbox,
  BarChart3,
  Bot,
  CalendarCheck,
  CreditCard,
  PhoneOff,
  Clock,
  Layers,
  CheckCircle2,
  Star,
  ArrowRight,
  Zap,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Bell,
  MessageSquare,
  Truck,
  Wrench,
  Flame,
  Trash2,
  SprayCan,
  XCircle,
  MinusCircle,
  HelpCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-triggered fade-in           */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/10 bg-[#0a0a1a]/80 shadow-lg shadow-black/10 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            MyBizOS
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-ai-works" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="glow-sm rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-white/60 transition-colors hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[#0a0a1a]/95 px-4 pb-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how-ai-works" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <hr className="my-2 border-white/10" />
            <Link
              href="/login"
              className="rounded-xl px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section — Dark gradient + floating cards + particle grid      */
/* ------------------------------------------------------------------ */
function Hero() {
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
            MyBizOS answers every call, books every appointment, and follows up
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
          {/* Card 1 — top left */}
          <div
            className="glass-card absolute -left-4 top-0 hidden px-4 py-3 shadow-2xl shadow-black/20 lg:block"
            style={{ animation: "floatCard1 6s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/20">
                <CalendarCheck className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/90">AI booked an appointment</div>
                <div className="text-[11px] text-white/40">HVAC Install — Tomorrow 2pm</div>
              </div>
            </div>
          </div>

          {/* Card 2 — top right */}
          <div
            className="glass-card absolute -right-4 top-8 hidden px-4 py-3 shadow-2xl shadow-black/20 lg:block"
            style={{ animation: "floatCard2 7s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/90">Lead scored 92</div>
                <div className="text-[11px] text-white/40">High intent — water heater repair</div>
              </div>
            </div>
          </div>

          {/* Card 3 — bottom center-right */}
          <div
            className="glass-card absolute -right-8 bottom-12 hidden px-4 py-3 shadow-2xl shadow-black/20 lg:block"
            style={{ animation: "floatCard3 5s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20">
                <Star className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/90">Review responded</div>
                <div className="text-[11px] text-white/40">5-star reply sent automatically</div>
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
                value="342"
                label="calls answered"
                icon={<Phone className="h-4 w-4 text-green-400" />}
              />
              <HeroStat
                value="47"
                label="appointments booked"
                icon={<CalendarCheck className="h-4 w-4 text-indigo-400" />}
              />
              <HeroStat
                value="$12,400"
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

function HeroStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-xs text-white/40">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Mockup                                                   */
/* ------------------------------------------------------------------ */
function DashboardMockup() {
  return (
    <div className="dashboard-mockup mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f2a]/80 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="ml-3 flex-1 rounded-lg bg-white/5 px-3 py-1 text-[10px] text-white/30">
            app.mybizos.com/dashboard
          </div>
        </div>

        <div className="flex" style={{ height: "320px" }}>
          {/* Sidebar */}
          <div className="hidden w-48 shrink-0 border-r border-white/5 bg-white/[0.02] p-3 sm:block">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600" />
              <div className="h-3 w-16 rounded bg-white/10" />
            </div>
            {["Dashboard", "Contacts", "Pipeline", "Inbox", "Schedule", "AI Agent"].map(
              (item, i) => (
                <div
                  key={item}
                  className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
                    i === 0
                      ? "bg-indigo-500/10 font-medium text-indigo-400"
                      : "text-white/30"
                  }`}
                >
                  <div
                    className={`h-3 w-3 rounded ${
                      i === 0 ? "bg-indigo-500/30" : "bg-white/10"
                    }`}
                  />
                  {item}
                </div>
              ),
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="h-4 w-28 rounded bg-white/15" />
                <div className="mt-1 h-2.5 w-40 rounded bg-white/5" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-lg bg-white/5" />
                <div className="h-7 w-7 rounded-lg bg-white/5" />
              </div>
            </div>

            {/* Stat cards */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Calls Today", value: "12", color: "bg-blue-500" },
                { label: "Booked", value: "5", color: "bg-green-500" },
                { label: "Revenue", value: "$3.2k", color: "bg-amber-500" },
                { label: "Response", value: "98%", color: "bg-violet-500" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-2"
                >
                  <div className="text-[9px] text-white/30">{stat.label}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${stat.color}`} />
                    <div className="text-sm font-bold text-white/80">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 text-[10px] font-medium text-white/50">Pipeline</div>
              <div className="grid grid-cols-4 gap-2">
                {["New Lead", "Quoted", "Scheduled", "Completed"].map((stage, i) => (
                  <div key={stage}>
                    <div className="mb-1.5 text-[8px] font-medium text-white/25">{stage}</div>
                    {Array.from({ length: 3 - i }).map((_, j) => (
                      <div key={j} className="mb-1 rounded-lg bg-white/[0.04] p-1.5">
                        <div className="h-1.5 w-full rounded bg-white/10" />
                        <div className="mt-1 h-1 w-2/3 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Glow reflection beneath */}
      <div className="mx-8 h-12 rounded-b-3xl bg-gradient-to-b from-indigo-500/10 to-transparent blur-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem Section — Glassmorphism cards on light bg                   */
/* ------------------------------------------------------------------ */
function ProblemSection() {
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
              <div className={`card-hover group relative overflow-hidden rounded-2xl bg-white p-8 shadow-xl ${p.glowColor}`}>
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

/* ------------------------------------------------------------------ */
/*  How AI Works — Dark section with glowing steps                     */
/* ------------------------------------------------------------------ */
function HowAIWorksSection() {
  return (
    <section
      id="how-ai-works"
      className="relative scroll-mt-16 overflow-hidden bg-[#06061a] py-24 sm:py-32"
    >
      {/* Subtle gradient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Bot className="h-3.5 w-3.5" />
              AI-Powered
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              How your AI employee works
            </h2>
            <p className="mt-5 text-lg text-white/40">
              From ring to revenue — fully automated, 24 hours a day.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-6">
            {/* Gradient connection line */}
            <div className="pointer-events-none absolute top-[72px] right-[16%] left-[16%] z-0 hidden md:block">
              <div className="gradient-line-h w-full" />
            </div>

            {/* Step 1 */}
            <RevealSection delay={0}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  {/* Outer ring pulse */}
                  <div className="absolute inset-0 rounded-3xl bg-blue-500/20" style={{ animation: "ringPulse 3s ease-out infinite" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-500/30">
                    <Phone className="h-14 w-14" />
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  Step 1
                </div>
                <h3 className="text-xl font-bold text-white">
                  Customer calls your number
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Your existing business number. No changes needed — AI picks up instantly.
                </p>
              </div>
            </RevealSection>

            {/* Step 2 */}
            <RevealSection delay={200}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-violet-500/20" style={{ animation: "ringPulse 3s ease-out infinite 1s" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/30">
                    <Bot className="h-14 w-14" />
                    {/* Floating conversation bubbles */}
                    <div className="glass-card absolute -right-6 -top-3 px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-medium text-white/80">Booked!</span>
                      </div>
                    </div>
                    <div className="glass-card absolute -left-6 -bottom-3 px-2.5 py-1.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span className="text-[10px] font-medium text-white/80">Qualified</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
                  Step 2
                </div>
                <h3 className="text-xl font-bold text-white">
                  AI answers, qualifies, and books
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Natural conversation. Understands your services, pricing, and availability.
                </p>
              </div>
            </RevealSection>

            {/* Step 3 */}
            <RevealSection delay={400}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-emerald-500/20" style={{ animation: "ringPulse 3s ease-out infinite 2s" }} />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30">
                    <Bell className="h-14 w-14" />
                    {/* Notification card */}
                    <div className="glass-card absolute -right-8 -top-4 p-2.5 shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                        <span className="text-[10px] font-medium text-white/80">New booking</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-white/40">HVAC Install - $850</div>
                    </div>
                  </div>
                </div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Step 3
                </div>
                <h3 className="text-xl font-bold text-white">
                  You get notified with a summary
                </h3>
                <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-white/40">
                  Full call transcript, customer details, and appointment on your calendar.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features — Bento Grid Layout                                       */
/* ------------------------------------------------------------------ */
function FeaturesSection() {
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-sm font-medium text-green-600">
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
                  <div className={`card-hover group relative overflow-hidden rounded-2xl border border-border/40 bg-white p-7 shadow-sm ${isLarge ? "min-h-[200px]" : ""}`}>
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

/* ------------------------------------------------------------------ */
/*  Industry Section — Horizontal scroll on mobile, gradient borders   */
/* ------------------------------------------------------------------ */
function IndustryShowcase() {
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

/* ------------------------------------------------------------------ */
/*  ROI Calculator — Dark section                                      */
/* ------------------------------------------------------------------ */
function ROICalculator() {
  const [missedCalls, setMissedCalls] = useState(5);
  const [avgJobValue, setAvgJobValue] = useState(500);

  const missedRevenue = missedCalls * avgJobValue * 4;
  const capturedRevenue = Math.round(missedRevenue * 0.7);

  const animatedMissed = useAnimatedNumber(missedRevenue);
  const animatedCaptured = useAnimatedNumber(capturedRevenue);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section className="relative overflow-hidden bg-[#06061a] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
              <TrendingUp className="h-3.5 w-3.5" />
              ROI Calculator
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              How much revenue are you leaving on the table?
            </h2>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-14 max-w-2xl">
            <div className="glass-card overflow-hidden shadow-2xl shadow-black/30">
              <div className="p-6 sm:p-8">
                {/* Missed calls slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">
                      How many calls do you miss per week?
                    </label>
                    <span className="rounded-lg bg-indigo-500/20 px-3 py-1 text-lg font-bold tabular-nums text-indigo-300">
                      {missedCalls}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={missedCalls}
                    onChange={(e) => setMissedCalls(Number(e.target.value))}
                    className="roi-slider w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/25">
                    <span>1</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Job value slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">
                      Average job value?
                    </label>
                    <span className="rounded-lg bg-indigo-500/20 px-3 py-1 text-lg font-bold tabular-nums text-indigo-300">
                      {formatCurrency(avgJobValue)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={avgJobValue}
                    onChange={(e) => setAvgJobValue(Number(e.target.value))}
                    className="roi-slider w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/25">
                    <span>$100</span>
                    <span>$2,500</span>
                    <span>$5,000</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="border-t border-white/5 bg-white/[0.02] p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="text-sm font-medium text-red-400">
                      You&apos;re leaving on the table
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tabular-nums text-red-400">
                      {formatCurrency(animatedMissed)}
                      <span className="text-base font-medium text-red-400/60">/mo</span>
                    </div>
                  </div>
                  <div className="glow-success overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                    <div className="text-sm font-medium text-green-400">
                      MyBizOS would capture
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tabular-nums text-green-400">
                      {formatCurrency(animatedCaptured)}
                      <span className="text-base font-medium text-green-400/60">/mo</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 hover:brightness-110"
                >
                  Start capturing that revenue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials — Premium cards                                       */
/* ------------------------------------------------------------------ */
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "MyBizOS paid for itself in the first week. The AI booked 12 appointments while I was on a job.",
      name: "Jim H.",
      role: "Plumber, Chicago",
      stars: 5,
    },
    {
      quote: "I went from missing 30% of calls to missing zero. My revenue jumped 40%.",
      name: "Sarah M.",
      role: "HVAC, Dallas",
      stars: 5,
    },
    {
      quote: "The AI is like having a full-time receptionist for $99/month. Game changer.",
      name: "Dave T.",
      role: "Electrician, Miami",
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
              <div className="card-hover flex h-full flex-col rounded-2xl border border-border/40 bg-white p-8 shadow-sm">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-indigo-600">
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

/* ------------------------------------------------------------------ */
/*  Comparison Table — Minimal, clean                                  */
/* ------------------------------------------------------------------ */
function ComparisonTable() {
  type CellValue = "yes" | "no" | "partial" | string;
  const rows: { feature: string; mybizos: CellValue; ghl: CellValue; jobber: CellValue; servicetitan: CellValue }[] = [
    { feature: "Monthly Price", mybizos: "$99/mo", ghl: "$297/mo", jobber: "$199/mo", servicetitan: "$500+/mo" },
    { feature: "Setup Time", mybizos: "5 minutes", ghl: "2-4 weeks", jobber: "1-2 weeks", servicetitan: "4-8 weeks" },
    { feature: "AI Phone Agent", mybizos: "yes", ghl: "no", jobber: "no", servicetitan: "no" },
    { feature: "AI SMS Follow-up", mybizos: "yes", ghl: "partial", jobber: "no", servicetitan: "no" },
    { feature: "CRM + Pipeline", mybizos: "yes", ghl: "yes", jobber: "yes", servicetitan: "yes" },
    { feature: "Online Booking", mybizos: "yes", ghl: "yes", jobber: "yes", servicetitan: "yes" },
    { feature: "Invoicing", mybizos: "yes", ghl: "partial", jobber: "yes", servicetitan: "yes" },
    { feature: "Built for Trades", mybizos: "yes", ghl: "no", jobber: "yes", servicetitan: "yes" },
    { feature: "No Training Needed", mybizos: "yes", ghl: "no", jobber: "partial", servicetitan: "no" },
  ];

  function renderCell(value: CellValue, isMyBizOS: boolean) {
    if (value === "yes") {
      return (
        <div className={`flex items-center justify-center ${isMyBizOS ? "text-green-500" : "text-muted-foreground/50"}`}>
          <CheckCircle2 className="h-5 w-5" />
        </div>
      );
    }
    if (value === "no") {
      return (
        <div className="flex items-center justify-center text-muted-foreground/20">
          <XCircle className="h-5 w-5" />
        </div>
      );
    }
    if (value === "partial") {
      return (
        <div className="flex items-center justify-center text-amber-400/60">
          <MinusCircle className="h-5 w-5" />
        </div>
      );
    }
    return (
      <span className={`text-sm font-medium ${isMyBizOS ? "font-bold text-green-600" : "text-muted-foreground"}`}>
        {value}
      </span>
    );
  }

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Subtle bg accent */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/30 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              See how we compare
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              MyBizOS gives you more for less — and it actually works out of the box.
            </p>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-14 max-w-4xl overflow-x-auto">
            <div className="min-w-[600px]">
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white text-sm shadow-xl shadow-black/5">
                <thead>
                  <tr>
                    <th className="border-b border-border/30 bg-accent/20 px-5 py-4 text-left text-sm font-medium text-muted-foreground">
                      Feature
                    </th>
                    <th className="border-b border-indigo-200/50 bg-indigo-50 px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="glow-sm mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-bold text-indigo-600">MyBizOS</span>
                      </div>
                    </th>
                    <th className="border-b border-border/30 bg-accent/20 px-4 py-4 text-center text-sm font-medium text-muted-foreground">GoHighLevel</th>
                    <th className="border-b border-border/30 bg-accent/20 px-4 py-4 text-center text-sm font-medium text-muted-foreground">Jobber</th>
                    <th className="border-b border-border/30 bg-accent/20 px-4 py-4 text-center text-sm font-medium text-muted-foreground">ServiceTitan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.feature}>
                      <td className={`border-b border-border/10 px-5 py-3.5 font-medium text-foreground ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                        {row.feature}
                      </td>
                      <td className="border-b border-indigo-100/30 bg-indigo-50/30 px-4 py-3.5 text-center">
                        {renderCell(row.mybizos, true)}
                      </td>
                      <td className={`border-b border-border/10 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                        {renderCell(row.ghl, false)}
                      </td>
                      <td className={`border-b border-border/10 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                        {renderCell(row.jobber, false)}
                      </td>
                      <td className={`border-b border-border/10 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                        {renderCell(row.servicetitan, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing — Glass cards on dark background                           */
/* ------------------------------------------------------------------ */
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      description: "Everything you need to organize your business",
      features: [
        "CRM with contact management",
        "Unified inbox (SMS + email)",
        "Deal pipeline",
        "Scheduling & online booking",
        "AI SMS follow-ups",
        "Email campaigns",
        "Booking page",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "$99",
      description: "AI superpowers for maximum growth",
      features: [
        "Everything in Starter",
        "AI Phone Agent (24/7)",
        "Voice AI with custom scripts",
        "Advanced automations",
        "Analytics dashboard",
        "Priority support",
        "Custom integrations",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-[#06061a] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Simple, honest pricing
            </h2>
            <p className="mt-5 text-lg text-white/40">
              No hidden fees. No per-user charges. Cancel anytime.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan, i) => (
            <RevealSection key={plan.name} delay={i * 150}>
              <div
                className={`relative flex h-full flex-col rounded-3xl p-8 transition-all ${
                  plan.popular
                    ? "pricing-glow glass-card scale-[1.02] bg-white/[0.08]"
                    : "glass-card bg-white/[0.04]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-white/40">{plan.description}</p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {plan.price}
                  </span>
                  <span className="text-lg text-white/30">/mo</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                      <span className="text-sm text-white/60">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 block rounded-2xl py-3.5 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
                      : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection>
          <p className="mt-10 text-center text-sm text-white/30">
            Both plans include a free 14-day trial. No credit card required.
          </p>
        </RevealSection>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ — Clean accordion with smooth transitions                      */
/* ------------------------------------------------------------------ */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-indigo-600"
      >
        <span className="text-[15px] font-medium text-foreground">{question}</span>
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/50 transition-all duration-300 ${isOpen ? "rotate-180 bg-indigo-500 border-indigo-500" : "bg-transparent"}`}>
          <ChevronDown className={`h-3.5 w-3.5 ${isOpen ? "text-white" : "text-muted-foreground"}`} />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Do I need technical skills?",
      answer: "Not at all. MyBizOS is designed for busy tradespeople, not tech experts. Answer a few questions about your business, and our AI configures everything for you. If you can use a smartphone, you can use MyBizOS.",
    },
    {
      question: "How does the AI phone agent work?",
      answer: "When a customer calls your business number, our AI answers with a natural-sounding voice. It greets them by your business name, asks what service they need, provides a price range, checks your availability, and books the appointment. You get an instant notification with the full call summary and recording.",
    },
    {
      question: "What does it cost?",
      answer: "Our Starter plan is $49/month and our Pro plan (with AI Phone Agent) is $99/month. Both include a free 14-day trial with no credit card required. There are no setup fees, no per-user charges, and you can cancel anytime.",
    },
    {
      question: "Can I keep my existing phone number?",
      answer: "Yes. We set up call forwarding from your existing number to your MyBizOS AI agent. Your customers keep calling the same number they always have. No changes needed on your end.",
    },
    {
      question: "How long does setup take?",
      answer: "About 5 minutes. Tell us your business name, services you offer, your hours, and general pricing. The AI does the rest — configuring your phone agent scripts, booking page, pipeline stages, and follow-up automations.",
    },
    {
      question: "Is there a free trial?",
      answer: "Yes. Every plan includes a full 14-day free trial with no credit card required. You get access to all features so you can see real results before you pay a cent.",
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data is yours. If you cancel, we give you 30 days to export everything — contacts, call recordings, messages, invoices. After that, we securely delete everything from our servers. No lock-in, ever.",
    },
  ];

  return (
    <section id="faq" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-muted-foreground/15 bg-accent px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Got questions?
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Everything you need to know before getting started.
            </p>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-14 max-w-2xl rounded-3xl border border-border/40 bg-white px-6 shadow-xl shadow-black/5 sm:px-8">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} {...faq} />
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 px-8 py-20 text-center shadow-2xl shadow-indigo-500/20 sm:px-16 sm:py-24">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="dot-grid absolute inset-0 opacity-10" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to stop missing calls
                <br />
                and start growing?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
                Join hundreds of local businesses that have transformed their
                operations with AI.
              </p>
              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-indigo-600 shadow-xl transition-all hover:bg-white/95 hover:shadow-2xl"
                >
                  Start Free Trial — No Credit Card
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                  See live demo
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer — Dark, premium                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="relative bg-[#06061a]">
      {/* Gradient line at top */}
      <div className="gradient-line-h" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-white">MyBizOS</span>
            </Link>
            <p className="mt-3 text-sm text-white/30">
              The AI-powered operating system for local service businesses.
            </p>

            <div className="mt-5 flex gap-3">
              {[
                { label: "Twitter", path: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" },
                { label: "LinkedIn", path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
                { label: "Facebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/30 transition-colors hover:bg-indigo-500/20 hover:text-indigo-400"
                  aria-label={social.label}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white/80">Product</h4>
            <ul className="mt-4 space-y-3">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", href: "/dashboard" },
                { label: "AI Phone Agent", href: "#how-ai-works" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/30 transition-colors hover:text-white/60">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white/80">Company</h4>
            <ul className="mt-4 space-y-3">
              {["About", "Blog", "Careers", "Partners"].map((label) => (
                <li key={label}>
                  <a href="#" className="text-sm text-white/30 transition-colors hover:text-white/60">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white/80">Support</h4>
            <ul className="mt-4 space-y-3">
              {[
                { label: "Help Center", href: "#" },
                { label: "Contact", href: "mailto:support@mybizos.com" },
                { label: "Status", href: "#" },
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/30 transition-colors hover:text-white/60">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-14 glass-card p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-white/90">
                Get growth tips for service businesses
              </h4>
              <p className="mt-1 text-sm text-white/30">
                Weekly insights on AI, marketing, and running a better business. No spam.
              </p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex w-full gap-2 sm:w-auto">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-64"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/5 pt-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-white/25">
              Built for local businesses by people who understand local businesses.
            </p>
            <p className="text-xs text-white/15">
              &copy; 2026 MyBizOS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <HowAIWorksSection />
        <FeaturesSection />
        <IndustryShowcase />
        <ROICalculator />
        <TestimonialsSection />
        <ComparisonTable />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
