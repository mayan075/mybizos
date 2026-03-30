"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CaretDown, Question } from "@phosphor-icons/react";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-primary"
      >
        <span className="text-[15px] font-medium text-foreground">{question}</span>
        <motion.div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isOpen ? "border-sky-500 bg-sky-500" : "border-border/40 bg-transparent"
          }`}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <CaretDown className={`h-3.5 w-3.5 ${isOpen ? "text-white" : "text-muted-foreground"}`} weight="bold" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const faqs = [
    {
      question: "Do I need technical skills?",
      answer: "Not at all. HararAI is designed for busy tradespeople, not tech experts. Answer a few questions about your business, and our AI configures everything for you. If you can use a smartphone, you can use HararAI.",
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
      answer: "Yes. We set up call forwarding from your existing number to your HararAI AI agent. Your customers keep calling the same number they always have. No changes needed on your end.",
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
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-muted-foreground/10 bg-accent px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Question className="h-3.5 w-3.5" weight="fill" />
            FAQ
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Got questions?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-14 max-w-2xl rounded-3xl border border-border/30 bg-card px-6 shadow-lg sm:px-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.15 }}
        >
          {faqs.map((faq) => (
            <FAQItem key={faq.question} {...faq} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
