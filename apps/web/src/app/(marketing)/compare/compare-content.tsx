"use client";

import Link from "next/link";
import {
  Check,
  X,
  Phone,
  Bot,
  Zap,
  MessageSquare,
  Users,
  ArrowRight,
  Upload,
  Settings,
} from "lucide-react";
import { RevealSection } from "../components/reveal-section";

/* ------------------------------------------------------------------ */
/*  Comparison Data                                                    */
/* ------------------------------------------------------------------ */

const comparisonRows: {
  feature: string;
  hararai: string | boolean;
  ghl: string | boolean;
}[] = [
  { feature: "AI Phone Agent (24/7)", hararai: true, ghl: false },
  { feature: "AI SMS Follow-ups", hararai: true, ghl: false },
  { feature: "AI Lead Scoring", hararai: true, ghl: "Manual only" },
  { feature: "CRM + Pipeline", hararai: true, ghl: true },
  { feature: "Email Marketing", hararai: true, ghl: true },
  { feature: "SMS Marketing", hararai: true, ghl: true },
  { feature: "Booking / Calendar", hararai: true, ghl: true },
  { feature: "Review Management", hararai: true, ghl: true },
  { feature: "Form Builder", hararai: true, ghl: true },
  { feature: "Workflow Automation", hararai: true, ghl: true },
];

const differentiators = [
  {
    icon: Phone,
    title: "AI Phone Agent",
    description:
      "Your AI receptionist answers every call, qualifies leads, and books appointments 24/7. No missed calls, no voicemail black holes.",
  },
  {
    icon: MessageSquare,
    title: "AI SMS Agent",
    description:
      "Automated intelligent follow-ups that sound human, not like a bot. Responds in seconds, nurtures leads around the clock.",
  },
  {
    icon: Zap,
    title: "AI Lead Scoring",
    description:
      "Every contact scored automatically so you focus on hot leads. Stop wasting time on tire-kickers.",
  },
];

const migrationSteps = [
  {
    step: 1,
    icon: Upload,
    title: "Import your contacts",
    description: "CSV upload — drag, drop, done.",
  },
  {
    step: 2,
    icon: Phone,
    title: "Connect your phone number",
    description: "Bring your existing Twilio number or get a new one.",
  },
  {
    step: 3,
    icon: Settings,
    title: "Configure your AI agent",
    description: "Tell it your business hours, services, and pricing ranges.",
  },
];

/* ------------------------------------------------------------------ */
/*  Cell Renderer                                                      */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-success/15">
        <Check className="w-4 h-4 text-success" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-destructive/15">
        <X className="w-4 h-4 text-destructive" />
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground italic">{value}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.55 0.19 265 / 0.4), transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <RevealSection>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-semibold text-success">
            <Zap className="w-4 h-4" />
            Save $2,376/year
          </div>
        </RevealSection>

        {/* Heading */}
        <RevealSection delay={100}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            The GoHighLevel Alternative{" "}
            <span className="text-gradient-blue">
              Built for Businesses That Actually Do the Work
            </span>
          </h1>
        </RevealSection>

        {/* Subheadline */}
        <RevealSection delay={200}>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Not another overpriced marketing platform. HararAI is an AI-powered
            business OS designed for home services.
          </p>
        </RevealSection>

        {/* CTA row */}
        <RevealSection delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?from=ghl"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 hover:shadow-xl glow-sm"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-accent"
            >
              See Pricing
            </Link>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Table                                                   */
/* ------------------------------------------------------------------ */

function ComparisonTableSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <RevealSection>
          <div className="text-center mb-12">
            <p className="section-label mb-3">Feature-by-Feature</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              HararAI vs GoHighLevel
            </h2>
          </div>
        </RevealSection>

        <RevealSection delay={150}>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 px-5 text-sm font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-4 px-5 text-center">
                    <div className="text-sm font-bold text-primary">
                      HararAI Pro
                    </div>
                    <div className="text-xs text-muted-foreground">$99/mo</div>
                  </th>
                  <th className="py-4 px-5 text-center">
                    <div className="text-sm font-bold text-foreground">
                      GHL Unlimited
                    </div>
                    <div className="text-xs text-muted-foreground">$297/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-muted/30"
                    }
                  >
                    <td className="py-3.5 px-5 text-sm font-medium text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <CellValue value={row.hararai} />
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <CellValue value={row.ghl} />
                    </td>
                  </tr>
                ))}
                {/* Price row */}
                <tr className="border-t border-border bg-muted/40">
                  <td className="py-4 px-5 text-sm font-bold text-foreground">
                    Monthly Price
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="text-2xl font-bold text-primary">$99</span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="text-2xl font-bold text-muted-foreground">
                      $297
                    </span>
                  </td>
                </tr>
                {/* Savings row */}
                <tr className="bg-success/5">
                  <td className="py-4 px-5 text-sm font-bold text-foreground">
                    Annual Savings vs GHL
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="text-lg font-bold text-success">
                      $2,376
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center text-sm text-muted-foreground">
                    &mdash;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Differentiators                                                    */
/* ------------------------------------------------------------------ */

function DifferentiatorsSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-5xl px-6">
        <RevealSection>
          <div className="text-center mb-14">
            <p className="section-label mb-3">Exclusive to HararAI</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              What HararAI Does That GHL Can&apos;t
            </h2>
          </div>
        </RevealSection>

        <div className="grid gap-6 sm:grid-cols-3">
          {differentiators.map((item, i) => (
            <RevealSection key={item.title} delay={i * 120}>
              <div className="card-elevated p-7 h-full flex flex-col card-hover">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
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
/*  Migration                                                          */
/* ------------------------------------------------------------------ */

function MigrationSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <RevealSection>
          <div className="text-center mb-14">
            <p className="section-label mb-3">Easy Migration</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Switch in Under 30 Minutes
            </h2>
          </div>
        </RevealSection>

        <div className="grid gap-8 sm:grid-cols-3">
          {migrationSteps.map((step, i) => (
            <RevealSection key={step.step} delay={i * 120}>
              <div className="relative text-center">
                {/* Step number */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step.step}
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection delay={400}>
          <p className="mt-12 text-center text-lg font-semibold text-foreground">
            That&apos;s it. Your AI is answering calls by lunch.
          </p>
        </RevealSection>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom CTA                                                         */
/* ------------------------------------------------------------------ */

function BottomCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <RevealSection>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 sm:px-14 text-center">
            {/* Subtle radial glow */}
            <div
              className="pointer-events-none absolute inset-0 -z-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 60%)",
              }}
            />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight leading-tight">
                Start Your Free Trial &mdash;{" "}
                <span className="whitespace-nowrap">
                  Save $2,376/year
                </span>{" "}
                vs GoHighLevel
              </h2>
              <p className="mt-4 text-primary-foreground/80 text-lg">
                14-day free trial. No credit card required. Cancel anytime.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register?from=ghl"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:brightness-95 hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/20 px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-white/10"
                >
                  See Pricing
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
/*  Main Export                                                        */
/* ------------------------------------------------------------------ */

export function CompareContent() {
  return (
    <>
      <HeroSection />
      <ComparisonTableSection />
      <DifferentiatorsSection />
      <MigrationSection />
      <BottomCTA />
    </>
  );
}
