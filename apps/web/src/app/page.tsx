"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Users,
  TrendingUp,
  Bell,
  MessageSquare,
  Truck,
  Wrench,
  Flame,
  Droplets,
  Trash2,
  SprayCan,
  Shield,
  XCircle,
  MinusCircle,
  Mail,
  MapPin,
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
      className={`fixed top-0 right-0 left-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-border/60 bg-white/90 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-white/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            MyBizOS
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-ai-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <a
              href="#features"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Features
            </a>
            <a
              href="#how-ai-works"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              FAQ
            </a>
            <hr className="border-border" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
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
/*  CSS Dashboard Mockup                                               */
/* ------------------------------------------------------------------ */
function DashboardMockup() {
  return (
    <div className="dashboard-mockup mx-auto mt-12 max-w-4xl sm:mt-16">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-white shadow-2xl shadow-primary/10">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-accent/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-[10px] text-muted-foreground">
            app.mybizos.com/dashboard
          </div>
        </div>

        <div className="flex" style={{ height: "320px" }}>
          {/* Sidebar */}
          <div className="hidden w-48 shrink-0 border-r border-border/30 bg-accent/20 p-3 sm:block">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary/80" />
              <div className="h-3 w-16 rounded bg-foreground/15" />
            </div>
            {["Dashboard", "Contacts", "Pipeline", "Inbox", "Schedule", "AI Agent"].map(
              (item, i) => (
                <div
                  key={item}
                  className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${
                    i === 0
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`h-3 w-3 rounded ${
                      i === 0 ? "bg-primary/30" : "bg-muted-foreground/20"
                    }`}
                  />
                  {item}
                </div>
              ),
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="h-4 w-28 rounded bg-foreground/15" />
                <div className="mt-1 h-2.5 w-40 rounded bg-muted-foreground/10" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent" />
                <div className="h-7 w-7 rounded-lg bg-accent" />
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
                  className="rounded-lg border border-border/30 bg-white p-2"
                >
                  <div className="text-[9px] text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${stat.color}`}
                    />
                    <div className="text-sm font-bold text-foreground">
                      {stat.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline preview */}
            <div className="rounded-lg border border-border/30 bg-accent/20 p-3">
              <div className="mb-2 text-[10px] font-medium text-foreground">
                Pipeline
              </div>
              <div className="grid grid-cols-4 gap-2">
                {["New Lead", "Quoted", "Scheduled", "Completed"].map(
                  (stage, i) => (
                    <div key={stage}>
                      <div className="mb-1.5 text-[8px] font-medium text-muted-foreground">
                        {stage}
                      </div>
                      {Array.from({ length: 3 - i }).map((_, j) => (
                        <div
                          key={j}
                          className="mb-1 rounded bg-white p-1.5 shadow-sm"
                        >
                          <div className="h-1.5 w-full rounded bg-foreground/10" />
                          <div className="mt-1 h-1 w-2/3 rounded bg-muted-foreground/10" />
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Reflection/glow */}
      <div className="mx-4 h-8 rounded-b-xl bg-gradient-to-b from-primary/5 to-transparent blur-sm" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-32 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-48 right-1/4 h-[300px] w-[300px] rounded-full bg-info/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-20 pb-8 sm:px-6 sm:pt-28 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Built for local service businesses
          </div>

          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Your AI Employee{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              That Never Sleeps
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            MyBizOS answers every call, books every appointment, and follows up
            every lead — so you can focus on doing the work you love.
          </p>

          {/* Social proof */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[
                "bg-blue-500",
                "bg-green-500",
                "bg-amber-500",
                "bg-violet-500",
                "bg-rose-500",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${bg} text-[10px] font-bold text-white`}
                >
                  {["J", "S", "M", "R", "D"][i]}
                </div>
              ))}
            </div>
            <span className="ml-1 font-medium">
              Trusted by 500+ local businesses
            </span>
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/50 px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
            >
              See a live demo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Dashboard mockup */}
        <DashboardMockup />

        {/* Stats bar */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-2xl border border-border/50 bg-white/60 p-1 shadow-sm backdrop-blur-sm">
            <div className="grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <StatItem
                value="342"
                label="calls answered"
                icon={<Phone className="h-4 w-4 text-success" />}
              />
              <StatItem
                value="47"
                label="appointments booked"
                icon={<CalendarCheck className="h-4 w-4 text-primary" />}
              />
              <StatItem
                value="$12,400"
                label="revenue generated"
                icon={<TrendingUp className="h-4 w-4 text-warning" />}
              />
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            — this month alone, for a single customer
          </p>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem Section                                                    */
/* ------------------------------------------------------------------ */
function ProblemSection() {
  const problems = [
    {
      icon: <PhoneOff className="h-6 w-6" />,
      title: "Missing calls while on a job",
      stat: "27%",
      detail: "of calls missed = lost revenue",
      color: "from-red-500/10 to-orange-500/10",
      iconColor: "text-destructive",
      borderColor: "border-red-200",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Spending hours on admin instead of actual work",
      stat: "10+ hrs",
      detail: "per week on average",
      color: "from-amber-500/10 to-yellow-500/10",
      iconColor: "text-warning",
      borderColor: "border-amber-200",
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Juggling 7+ apps that don't talk to each other",
      stat: "$500-1,000",
      detail: "per month wasted",
      color: "from-purple-500/10 to-pink-500/10",
      iconColor: "text-primary",
      borderColor: "border-purple-200",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sound familiar?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every missed call is a missed opportunity. Every hour on admin is
              an hour not earning.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {problems.map((p, i) => (
            <RevealSection key={p.title} delay={i * 120}>
              <div
                className={`group relative overflow-hidden rounded-2xl border ${p.borderColor} bg-gradient-to-br ${p.color} p-8 transition-all hover:-translate-y-1 hover:shadow-lg`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 ${p.iconColor} shadow-sm`}
                >
                  {p.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
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
/*  How AI Works — 3-Step Visual Flow                                  */
/* ------------------------------------------------------------------ */
function HowAIWorksSection() {
  return (
    <section
      id="how-ai-works"
      className="scroll-mt-16 bg-gradient-to-b from-accent/30 to-background py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/5 px-4 py-1.5 text-sm font-medium text-info">
              <Bot className="h-3.5 w-3.5" />
              AI-Powered
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How your AI employee works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From ring to revenue — fully automated, 24 hours a day.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-4">
            {/* Connection lines (desktop) */}
            <div className="pointer-events-none absolute top-[60px] right-0 left-0 z-0 hidden md:block">
              <svg
                className="w-full"
                height="4"
                viewBox="0 0 100 4"
                preserveAspectRatio="none"
              >
                <line
                  x1="20"
                  y1="2"
                  x2="80"
                  y2="2"
                  stroke="url(#aiLineGrad)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="ai-flow-line"
                />
                <defs>
                  <linearGradient id="aiLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.45 0.15 260)" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="oklch(0.55 0.15 240)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="oklch(0.55 0.18 150)" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Step 1 */}
            <RevealSection delay={0}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20">
                  <Phone className="h-12 w-12" />
                  {/* Ringing pulse */}
                  <div className="absolute inset-0 animate-ping rounded-3xl bg-blue-400/20" style={{ animationDuration: "2s" }} />
                </div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Step 1
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Customer calls your number
                </h3>
                <p className="mt-2 max-w-[240px] text-sm text-muted-foreground">
                  Your existing business number. No changes needed — AI picks up instantly.
                </p>
              </div>
            </RevealSection>

            {/* Step 2 */}
            <RevealSection delay={200}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/20">
                  <Bot className="h-12 w-12" />
                  {/* Conversation bubbles */}
                  <div className="absolute -right-3 -top-2 rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-foreground shadow-lg">
                    <MessageSquare className="inline h-3 w-3 text-primary" /> Booked!
                  </div>
                  <div className="absolute -left-3 -bottom-2 rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-foreground shadow-lg">
                    <CheckCircle2 className="inline h-3 w-3 text-success" /> Qualified
                  </div>
                </div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                  Step 2
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  AI answers, qualifies, and books
                </h3>
                <p className="mt-2 max-w-[240px] text-sm text-muted-foreground">
                  Natural conversation. Understands your services, pricing, and availability.
                </p>
              </div>
            </RevealSection>

            {/* Step 3 */}
            <RevealSection delay={400}>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
                  <Bell className="h-12 w-12" />
                  {/* Notification card */}
                  <div className="absolute -right-4 -top-3 rounded-lg bg-white p-2 shadow-lg">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[9px] font-medium text-foreground">New booking</span>
                    </div>
                    <div className="mt-0.5 text-[8px] text-muted-foreground">HVAC Install - $850</div>
                  </div>
                </div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  Step 3
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  You get notified with a summary
                </h3>
                <p className="mt-2 max-w-[240px] text-sm text-muted-foreground">
                  Full call transcript, customer details, and appointment on your calendar.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Solution / Features Section                                        */
/* ------------------------------------------------------------------ */
function FeaturesSection() {
  const features = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: "AI Phone Agent",
      description:
        "Never miss a call again. AI answers 24/7, qualifies leads, books appointments.",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: <Inbox className="h-6 w-6" />,
      title: "Unified Inbox",
      description:
        "SMS, email, calls, social — all in one place. No more tab chaos.",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Smart Pipeline",
      description:
        "See every deal, every stage, at a glance. Know exactly where your money is.",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "Automated Follow-Up",
      description:
        "AI follows up so you don't have to. Never let a warm lead go cold.",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: <CalendarCheck className="h-6 w-6" />,
      title: "Online Booking",
      description:
        "Customers book themselves. You just show up and do great work.",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Get Paid Faster",
      description:
        "Send invoices, collect payments by text. No chasing checks.",
      gradient: "from-rose-500 to-pink-600",
    },
  ];

  return (
    <section id="features" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-4 py-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              The solution
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One system. AI-powered.{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                Built for you.
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to run your business, in one place. No more
              duct-taping tools together.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <RevealSection key={f.title} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-7 transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-sm`}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Vertical / Industry Showcase                                       */
/* ------------------------------------------------------------------ */
function IndustryShowcase() {
  const industries = [
    {
      icon: <Trash2 className="h-7 w-7" />,
      name: "Rubbish Removals",
      slug: "rubbish-removal",
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-50",
    },
    {
      icon: <Truck className="h-7 w-7" />,
      name: "Moving Companies",
      slug: "moving",
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
    },
    {
      icon: <Wrench className="h-7 w-7" />,
      name: "Plumbing",
      slug: "plumbing",
      gradient: "from-cyan-500 to-blue-600",
      bg: "bg-cyan-50",
    },
    {
      icon: <Flame className="h-7 w-7" />,
      name: "HVAC",
      slug: "hvac",
      gradient: "from-orange-500 to-red-600",
      bg: "bg-orange-50",
    },
    {
      icon: <Zap className="h-7 w-7" />,
      name: "Electrical",
      slug: "electrical",
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50",
    },
    {
      icon: <SprayCan className="h-7 w-7" />,
      name: "Cleaning",
      slug: "cleaning",
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                YOUR
              </span>{" "}
              industry
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pre-configured AI scripts, booking flows, and automations tailored
              to how your specific trade works.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {industries.map((ind, i) => (
            <RevealSection key={ind.slug} delay={i * 80}>
              <Link
                href={`/book/demo-${ind.slug}`}
                className={`group flex flex-col items-center rounded-2xl border border-border/60 ${ind.bg} p-5 text-center transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg`}
              >
                <div
                  className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-sm transition-transform group-hover:scale-110`}
                >
                  {ind.icon}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {ind.name}
                </span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
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
/*  ROI Calculator                                                     */
/* ------------------------------------------------------------------ */
function ROICalculator() {
  const [missedCalls, setMissedCalls] = useState(5);
  const [avgJobValue, setAvgJobValue] = useState(500);

  const missedRevenue = missedCalls * avgJobValue * 4;
  const capturedRevenue = Math.round(missedRevenue * 0.7);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section className="bg-gradient-to-b from-background to-accent/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/5 px-4 py-1.5 text-sm font-medium text-warning">
              <TrendingUp className="h-3.5 w-3.5" />
              ROI Calculator
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How much revenue are you leaving on the table?
            </h2>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-lg">
              <div className="p-6 sm:p-8">
                {/* Missed calls slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      How many calls do you miss per week?
                    </label>
                    <span className="rounded-lg bg-primary/10 px-3 py-1 text-lg font-bold text-primary">
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
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Job value slider */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Average job value?
                    </label>
                    <span className="rounded-lg bg-primary/10 px-3 py-1 text-lg font-bold text-primary">
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
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>$100</span>
                    <span>$2,500</span>
                    <span>$5,000</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="border-t border-border/40 bg-accent/20 p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <div className="text-sm font-medium text-destructive">
                      You&apos;re leaving on the table
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-destructive">
                      {formatCurrency(missedRevenue)}
                      <span className="text-base font-medium">/mo</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <div className="text-sm font-medium text-success">
                      MyBizOS would capture
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-success">
                      {formatCurrency(capturedRevenue)}
                      <span className="text-base font-medium">/mo</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl"
                >
                  Start capturing that revenue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "MyBizOS paid for itself in the first week. The AI booked 12 appointments while I was on a job.",
      name: "Jim H.",
      role: "Plumber, Chicago",
      stars: 5,
    },
    {
      quote:
        "I went from missing 30% of calls to missing zero. My revenue jumped 40%.",
      name: "Sarah M.",
      role: "HVAC, Dallas",
      stars: 5,
    },
    {
      quote:
        "The AI is like having a full-time receptionist for $99/month. Game changer.",
      name: "Dave T.",
      role: "Electrician, Miami",
      stars: 5,
    },
  ];

  return (
    <section
      id="testimonials"
      className="scroll-mt-16 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by local pros
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Real results from real service businesses.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <RevealSection key={t.name} delay={i * 120}>
              <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-foreground italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-sm font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {t.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
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
/*  Comparison Table                                                   */
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
        <div className={`flex items-center justify-center ${isMyBizOS ? "text-success" : "text-muted-foreground"}`}>
          <CheckCircle2 className={`h-5 w-5 ${isMyBizOS ? "fill-success/10 text-success" : ""}`} />
        </div>
      );
    }
    if (value === "no") {
      return (
        <div className="flex items-center justify-center text-muted-foreground/40">
          <XCircle className="h-5 w-5" />
        </div>
      );
    }
    if (value === "partial") {
      return (
        <div className="flex items-center justify-center text-amber-400">
          <MinusCircle className="h-5 w-5" />
        </div>
      );
    }
    return (
      <span className={`text-sm font-medium ${isMyBizOS ? "text-success font-bold" : "text-muted-foreground"}`}>
        {value}
      </span>
    );
  }

  return (
    <section className="bg-gradient-to-b from-accent/30 to-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              See how we compare
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              MyBizOS gives you more for less — and it actually works out of the
              box.
            </p>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-12 max-w-4xl overflow-x-auto">
            <div className="min-w-[600px]">
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border/60 bg-white text-sm shadow-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border/40 bg-accent/30 px-5 py-4 text-left text-sm font-medium text-muted-foreground">
                      Feature
                    </th>
                    <th className="border-b border-primary/20 bg-primary/5 px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-bold text-primary">MyBizOS</span>
                      </div>
                    </th>
                    <th className="border-b border-border/40 bg-accent/30 px-4 py-4 text-center text-sm font-medium text-muted-foreground">
                      GoHighLevel
                    </th>
                    <th className="border-b border-border/40 bg-accent/30 px-4 py-4 text-center text-sm font-medium text-muted-foreground">
                      Jobber
                    </th>
                    <th className="border-b border-border/40 bg-accent/30 px-4 py-4 text-center text-sm font-medium text-muted-foreground">
                      ServiceTitan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "" : "bg-accent/10"}>
                      <td className="border-b border-border/20 px-5 py-3.5 font-medium text-foreground">
                        {row.feature}
                      </td>
                      <td className="border-b border-primary/10 bg-primary/[0.02] px-4 py-3.5 text-center">
                        {renderCell(row.mybizos, true)}
                      </td>
                      <td className="border-b border-border/20 px-4 py-3.5 text-center">
                        {renderCell(row.ghl, false)}
                      </td>
                      <td className="border-b border-border/20 px-4 py-3.5 text-center">
                        {renderCell(row.jobber, false)}
                      </td>
                      <td className="border-b border-border/20 px-4 py-3.5 text-center">
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
/*  Pricing                                                            */
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
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No hidden fees. No per-user charges. Cancel anytime.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <RevealSection key={plan.name} delay={i * 150}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 transition-all hover:shadow-lg ${
                  plan.popular
                    ? "border-primary/40 bg-gradient-to-b from-primary/[0.03] to-transparent shadow-md shadow-primary/5"
                    : "border-border/60 bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-lg text-muted-foreground">/mo</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-sm text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
                      : "border border-border bg-white text-foreground shadow-sm hover:bg-accent hover:shadow-md"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Both plans include a free 14-day trial. No credit card required.
          </p>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Section                                                        */
/* ------------------------------------------------------------------ */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-primary"
      >
        <span className="text-[15px] font-medium text-foreground">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Do I need technical skills?",
      answer:
        "Not at all. MyBizOS is designed for busy tradespeople, not tech experts. Answer a few questions about your business, and our AI configures everything for you. If you can use a smartphone, you can use MyBizOS.",
    },
    {
      question: "How does the AI phone agent work?",
      answer:
        "When a customer calls your business number, our AI answers with a natural-sounding voice. It greets them by your business name, asks what service they need, provides a price range, checks your availability, and books the appointment. You get an instant notification with the full call summary and recording.",
    },
    {
      question: "What does it cost?",
      answer:
        "Our Starter plan is $49/month and our Pro plan (with AI Phone Agent) is $99/month. Both include a free 14-day trial with no credit card required. There are no setup fees, no per-user charges, and you can cancel anytime.",
    },
    {
      question: "Can I keep my existing phone number?",
      answer:
        "Yes. We set up call forwarding from your existing number to your MyBizOS AI agent. Your customers keep calling the same number they always have. No changes needed on your end.",
    },
    {
      question: "How long does setup take?",
      answer:
        "About 5 minutes. Tell us your business name, services you offer, your hours, and general pricing. The AI does the rest — configuring your phone agent scripts, booking page, pipeline stages, and follow-up automations.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes. Every plan includes a full 14-day free trial with no credit card required. You get access to all features so you can see real results before you pay a cent.",
    },
    {
      question: "What happens to my data if I cancel?",
      answer:
        "Your data is yours. If you cancel, we give you 30 days to export everything — contacts, call recordings, messages, invoices. After that, we securely delete everything from our servers. No lock-in, ever.",
    },
  ];

  return (
    <section id="faq" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-muted-foreground/20 bg-accent px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Got questions?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to know before getting started.
            </p>
          </div>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border/60 bg-white px-6 shadow-sm sm:px-8">
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
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-info/80 px-8 py-16 text-center shadow-xl sm:px-16 sm:py-20">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to stop missing calls
                <br />
                and start growing?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
                Join hundreds of local businesses that have transformed their
                operations with AI.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/95 hover:shadow-xl"
                >
                  Start Free Trial — No Credit Card
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
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
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="border-t border-border bg-accent/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">
                MyBizOS
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              The AI-powered operating system for local service businesses.
            </p>

            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              {[
                { label: "Twitter", path: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" },
                { label: "LinkedIn", path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
                { label: "Facebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={social.label}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Product</h4>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", href: "/dashboard" },
                { label: "AI Phone Agent", href: "#how-ai-works" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Company</h4>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "About", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Partners", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Support</h4>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "Help Center", href: "#" },
                { label: "Contact", href: "mailto:support@mybizos.com" },
                { label: "Status", href: "#" },
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-white p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-foreground">
                Get growth tips for service businesses
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly insights on AI, marketing, and running a better business.
                No spam.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full gap-2 sm:w-auto"
            >
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Built for local businesses by people who understand local
              businesses.
            </p>
            <p className="text-xs text-muted-foreground/60">
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
