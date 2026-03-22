"use client";

import { useEffect, useRef } from "react";
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
  Shield,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Users,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

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

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-xl">
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
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#testimonials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonials
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
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
              href="#pricing"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Testimonials
            </a>
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              How It Works
            </a>
            <hr className="border-border" />
            <Link
              href="/auth/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
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

      <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
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

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/50 px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
            >
              See It In Action
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-16 max-w-3xl">
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
      stat: "$500–1,000",
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
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "MyBizOS paid for itself in the first week. The AI booked 12 appointments while I was on a job.",
      name: "Jim H.",
      role: "Plumber",
      stars: 5,
    },
    {
      quote:
        "I went from missing 30% of calls to missing zero. My revenue jumped 40%.",
      name: "Sarah M.",
      role: "HVAC",
      stars: 5,
    },
    {
      quote:
        "The AI is like having a full-time receptionist for $99/month.",
      name: "Dave T.",
      role: "Electrician",
      stars: 5,
    },
  ];

  return (
    <section
      id="testimonials"
      className="scroll-mt-16 bg-gradient-to-b from-accent/30 to-background py-20 sm:py-28"
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
                  href="/auth/register"
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
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */
function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Tell us about your business",
      description:
        "Answer a few quick questions about your services, hours, and pricing. Takes about 2 minutes.",
      icon: <Users className="h-5 w-5" />,
    },
    {
      number: "2",
      title: "AI configures everything",
      description:
        "Your phone agent, booking page, pipeline, and automations are set up automatically.",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      number: "3",
      title: "Start getting leads",
      description:
        "Your AI starts answering calls and booking appointments immediately. You focus on the work.",
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 bg-gradient-to-b from-background to-accent/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No setup fees. No consultants. No training needed.
            </p>
          </div>
        </RevealSection>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="relative space-y-8">
            {/* Connecting line */}
            <div className="absolute top-8 bottom-8 left-7 hidden w-px bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40 sm:block" />

            {steps.map((step, i) => (
              <RevealSection key={step.number} delay={i * 150}>
                <div className="relative flex gap-6">
                  {/* Step number */}
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {step.icon}
                  </div>

                  <div className="pt-2">
                    <div className="mb-1 text-xs font-semibold tracking-wider text-primary uppercase">
                      Step {step.number}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
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
              <div className="mt-10">
                <Link
                  href="/auth/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/95 hover:shadow-xl"
                >
                  Start Free Trial — No Credit Card Required
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
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-border bg-accent/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-foreground">MyBizOS</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </div>
        </div>

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
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <HowItWorksSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
