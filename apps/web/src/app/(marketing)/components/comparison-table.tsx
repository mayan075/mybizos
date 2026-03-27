"use client";

import {
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { RevealSection } from "./reveal-section";

export function ComparisonTable() {
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
