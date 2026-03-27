"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { RevealSection } from "./reveal-section";

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

export function FAQSection() {
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
