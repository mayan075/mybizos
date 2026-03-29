import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing — HararAI | AI Business OS from $49/mo",
  description:
    "Replace GoHighLevel for 60% less. AI phone agent, CRM, inbox, automations — all included. Start your 14-day free trial.",
  openGraph: {
    title: "HararAI Pricing — AI Business OS from $49/mo",
    description:
      "Replace GoHighLevel ($297-497/mo) with HararAI. AI phone agent, CRM, inbox, automations — from $49/mo.",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
