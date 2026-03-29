import type { Metadata } from "next";
import { CompareContent } from "./compare-content";

export const metadata: Metadata = {
  title: "GoHighLevel Alternative — HararAI | Save 67%",
  description:
    "Switch from GoHighLevel to HararAI and save $2,376/year. Get AI phone agents, CRM, inbox, and automations — all for $99/mo.",
  openGraph: {
    title: "GoHighLevel Alternative — HararAI | Save 67%",
    description:
      "Switch from GoHighLevel to HararAI and save $2,376/year. Get AI phone agents, CRM, inbox, and automations — all for $99/mo.",
    type: "website",
  },
};

export default function ComparePage() {
  return <CompareContent />;
}
