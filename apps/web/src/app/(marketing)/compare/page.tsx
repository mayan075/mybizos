import type { Metadata } from "next";
import { CompareContent } from "./compare-content";

export const metadata: Metadata = {
  title: "GoHighLevel Alternative — MyBizOS | Save 67%",
  description:
    "Switch from GoHighLevel to MyBizOS and save $2,376/year. Get AI phone agents, CRM, inbox, and automations — all for $99/mo.",
  openGraph: {
    title: "GoHighLevel Alternative — MyBizOS | Save 67%",
    description:
      "Switch from GoHighLevel to MyBizOS and save $2,376/year. Get AI phone agents, CRM, inbox, and automations — all for $99/mo.",
    type: "website",
  },
};

export default function ComparePage() {
  return <CompareContent />;
}
