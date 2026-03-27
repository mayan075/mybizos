"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Zap,
  Phone,
  Bot,
  Users,
  Building2,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const tiers = [
  {
    name: "Starter",
    slug: "starter",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "Everything you need to capture and convert leads.",
    highlight: false,
    badge: null,
    features: [
      "2,000 contacts",
      "1 user",
      "Unified inbox (SMS + email)",
      "1 deal pipeline",
      "Online booking & scheduling",
      "1,000 emails/mo",
      "50 SMS/mo",
      "5 lead capture forms",
    ],
    icon: Zap,
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: 99,
    annualPrice: 79,
    description: "AI-powered automation that works while you sleep.",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "AI Phone Agent (500 min/mo)",
      "AI SMS follow-ups (500/mo)",
      "10,000 contacts",
      "5 users",
      "5 pipelines",
      "Unlimited sequences",
      "Review management with AI responses",
      "Analytics dashboard",
    ],
    icon: Bot,
  },
  {
    name: "Agency",
    slug: "agency",
    monthlyPrice: 249,
    annualPrice: 199,
    description: "Scale across clients with white-label everything.",
    highlight: false,
    badge: null,
    features: [
      "Everything in Pro",
      "Unlimited sub-accounts",
      "White-label customer portal",
      "Unlimited contacts & users",
      "2,000 AI min/mo",
      "5,000 SMS/mo",
      "API access",
      "Priority support",
    ],
    icon: Building2,
  },
] as const;

type FeatureRow = {
  label: string;
  starter: boolean | string;
  pro: boolean | string;
  agency: boolean | string;
};

const comparisonFeatures: FeatureRow[] = [
  { label: "Contacts", starter: "2,000", pro: "10,000", agency: "Unlimited" },
  { label: "Users", starter: "1", pro: "5", agency: "Unlimited" },
  { label: "Unified inbox (SMS + email)", starter: true, pro: true, agency: true },
  { label: "Deal pipelines", starter: "1", pro: "5", agency: "5+" },
  { label: "Online booking & scheduling", starter: true, pro: true, agency: true },
  { label: "Lead capture forms", starter: "5", pro: "Unlimited", agency: "Unlimited" },
  { label: "Email sends/mo", starter: "1,000", pro: "10,000", agency: "50,000" },
  { label: "SMS/mo", starter: "50", pro: "500", agency: "5,000" },
  { label: "AI Phone Agent", starter: false, pro: "500 min/mo", agency: "2,000 min/mo" },
  { label: "AI SMS follow-ups", starter: false, pro: "500/mo", agency: "5,000/mo" },
  { label: "Unlimited sequences", starter: false, pro: true, agency: true },
  { label: "Review management (AI)", starter: false, pro: true, agency: true },
  { label: "Analytics dashboard", starter: false, pro: true, agency: true },
  { label: "Sub-accounts", starter: false, pro: false, agency: "Unlimited" },
  { label: "White-label portal", starter: false, pro: false, agency: true },
  { label: "API access", starter: false, pro: false, agency: true },
  { label: "Priority support", starter: false, pro: false, agency: true },
];

const faqs = [
  {
    q: "Is there a contract?",
    a: "No, all plans are month-to-month. Cancel anytime with one click from your dashboard — no calls, no hoops.",
  },
  {
    q: "What happens after my 14-day trial?",
    a: "Your trial auto-converts to a paid subscription so there\u2019s no interruption. You can cancel any time before the trial ends and you won\u2019t be charged.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes, upgrade or downgrade any time. Changes are prorated so you only pay for what you use.",
  },
  {
    q: "Do you offer refunds?",
    a: "Absolutely. We offer a 30-day money-back guarantee on all plans, no questions asked.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit cards (Visa, Mastercard, Amex, Discover) processed securely via Stripe.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="mx-auto h-5 w-5 text-success" />;
  if (value === false)
    return <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
  return (
    <span className="text-sm font-medium text-foreground">{value}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PricingContent() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-background text-foreground">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden pb-8 pt-28 sm:pt-36">
        {/* subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/8 blur-[120px]"
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          {/* badge */}
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-semibold text-success">
            <Zap className="h-3.5 w-3.5" />
            Save 60% vs GoHighLevel
          </span>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            One platform. One price.
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient-blue">No surprises.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            AI phone agent, CRM, unified inbox, automations, and review
            management — all in one place. Start your 14-day free trial, no
            credit card required.
          </p>

          {/* ---- Toggle ---- */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${
                !annual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                annual ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  annual ? "translate-x-[28px]" : "translate-x-1"
                }`}
              />
            </button>

            <span
              className={`text-sm font-medium ${
                annual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Annual{" "}
              <span className="ml-1 rounded-md bg-success/15 px-1.5 py-0.5 text-xs font-semibold text-success">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ---- Pricing Cards ---- */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const price = annual ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.slug}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-shadow ${
                  tier.highlight
                    ? "border-2 border-primary shadow-xl pricing-glow"
                    : "border-border shadow-sm hover:shadow-md"
                }`}
              >
                {/* badge */}
                {tier.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    {tier.badge}
                  </span>
                )}

                {/* header */}
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      tier.highlight
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-card-foreground">
                    {tier.name}
                  </h3>
                </div>

                {/* price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tabular-nums text-card-foreground">
                    ${price}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                {annual && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    <span className="line-through">${tier.monthlyPrice}/mo</span>{" "}
                    billed annually
                  </p>
                )}
                {!annual && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    billed monthly
                  </p>
                )}

                <p className="mb-6 text-sm text-muted-foreground">
                  {tier.description}
                </p>

                {/* CTA */}
                <Link
                  href={`/register?plan=${tier.slug}`}
                  className={`mb-8 flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
                      : "border border-border bg-card text-card-foreground hover:bg-accent"
                  }`}
                >
                  Start 14-Day Free Trial
                </Link>

                {/* feature list */}
                <ul className="mt-auto space-y-3">
                  {tier.features.map((feat) => {
                    const isAiFeature =
                      feat.startsWith("AI Phone") ||
                      feat.startsWith("AI SMS");
                    return (
                      <li
                        key={feat}
                        className="flex items-start gap-2.5 text-sm text-card-foreground"
                      >
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            isAiFeature ? "text-primary" : "text-success"
                          }`}
                        />
                        <span>
                          {feat}
                          {isAiFeature && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                              <Bot className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Feature Comparison Grid ---- */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">
            Compare plans
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Every plan includes core CRM, inbox, and booking. Here's how they
            stack up.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-card-foreground">
                    Starter
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-primary">
                    Pro
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-card-foreground">
                    Agency
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }
                  >
                    <td className="px-6 py-3.5 text-sm text-card-foreground">
                      {row.label}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={row.starter} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={row.pro} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={row.agency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Can't find what you're looking for?{" "}
            <Link href="/contact" className="text-primary underline underline-offset-4 hover:text-primary/80">
              Reach out to our team
            </Link>
            .
          </p>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold text-card-foreground hover:bg-accent/50 transition-colors rounded-xl"
                    aria-expanded={isOpen}
                  >
                    {faq.q}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Bottom CTA ---- */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to ditch the overpriced tools?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start your 14-day free trial today. No credit card required, no
            contracts, no surprises.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register?plan=pro"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Zap className="h-4 w-4" />
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Talk to Sales
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            30-day money-back guarantee &middot; Cancel anytime &middot; No
            credit card for trial
          </p>
        </div>
      </section>
    </div>
  );
}
