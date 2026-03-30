"use client";

import { motion } from "motion/react";
import { Lightning, CheckCircle, XCircle, MinusCircle } from "@phosphor-icons/react";

export function ComparisonTable() {
  type CellValue = "yes" | "no" | "partial" | string;
  const rows: { feature: string; hararai: CellValue; ghl: CellValue; jobber: CellValue; servicetitan: CellValue }[] = [
    { feature: "Monthly Price", hararai: "$99/mo", ghl: "$297/mo", jobber: "$199/mo", servicetitan: "$500+/mo" },
    { feature: "Setup Time", hararai: "5 minutes", ghl: "2-4 weeks", jobber: "1-2 weeks", servicetitan: "4-8 weeks" },
    { feature: "AI Phone Agent", hararai: "yes", ghl: "no", jobber: "no", servicetitan: "no" },
    { feature: "AI SMS Follow-up", hararai: "yes", ghl: "partial", jobber: "no", servicetitan: "no" },
    { feature: "CRM + Pipeline", hararai: "yes", ghl: "yes", jobber: "yes", servicetitan: "yes" },
    { feature: "Online Booking", hararai: "yes", ghl: "yes", jobber: "yes", servicetitan: "yes" },
    { feature: "Invoicing", hararai: "yes", ghl: "partial", jobber: "yes", servicetitan: "yes" },
    { feature: "Built for Trades", hararai: "yes", ghl: "no", jobber: "yes", servicetitan: "yes" },
    { feature: "No Training Needed", hararai: "yes", ghl: "no", jobber: "partial", servicetitan: "no" },
  ];

  function renderCell(value: CellValue, isHararAI: boolean) {
    if (value === "yes") {
      return (
        <div className={`flex items-center justify-center ${isHararAI ? "text-emerald-500" : "text-muted-foreground/40"}`}>
          <CheckCircle className="h-5 w-5" weight="fill" />
        </div>
      );
    }
    if (value === "no") {
      return (
        <div className="flex items-center justify-center text-muted-foreground/15">
          <XCircle className="h-5 w-5" weight="fill" />
        </div>
      );
    }
    if (value === "partial") {
      return (
        <div className="flex items-center justify-center text-amber-400/50">
          <MinusCircle className="h-5 w-5" weight="fill" />
        </div>
      );
    }
    return (
      <span className={`text-sm font-medium ${isHararAI ? "font-bold text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {value}
      </span>
    );
  }

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/20 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            See how we compare
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            HararAI gives you more for less — and it actually works out of the box.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-14 max-w-4xl overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.15 }}
        >
          <div className="min-w-[600px]">
            <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl bg-card text-sm shadow-lg">
              <thead>
                <tr>
                  <th className="border-b border-border/20 bg-accent/15 px-5 py-4 text-left text-sm font-medium text-muted-foreground">Feature</th>
                  <th className="border-b border-sky-500/15 bg-sky-500/5 px-4 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20">
                        <Lightning className="h-3.5 w-3.5" weight="fill" />
                      </div>
                      <span className="text-sm font-bold text-sky-600 dark:text-sky-400">HararAI</span>
                    </div>
                  </th>
                  <th className="border-b border-border/20 bg-accent/15 px-4 py-4 text-center text-sm font-medium text-muted-foreground">GoHighLevel</th>
                  <th className="border-b border-border/20 bg-accent/15 px-4 py-4 text-center text-sm font-medium text-muted-foreground">Jobber</th>
                  <th className="border-b border-border/20 bg-accent/15 px-4 py-4 text-center text-sm font-medium text-muted-foreground">ServiceTitan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.feature}>
                    <td className={`border-b border-border/8 px-5 py-3.5 font-medium text-foreground ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                      {row.feature}
                    </td>
                    <td className="border-b border-sky-500/8 bg-sky-500/[0.03] px-4 py-3.5 text-center">
                      {renderCell(row.hararai, true)}
                    </td>
                    <td className={`border-b border-border/8 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                      {renderCell(row.ghl, false)}
                    </td>
                    <td className={`border-b border-border/8 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                      {renderCell(row.jobber, false)}
                    </td>
                    <td className={`border-b border-border/8 px-4 py-3.5 text-center ${i % 2 !== 0 ? "bg-accent/5" : ""}`}>
                      {renderCell(row.servicetitan, false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
