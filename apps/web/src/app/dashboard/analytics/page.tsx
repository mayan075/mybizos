"use client";

import { useState } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Phone,
  CalendarCheck,
  Star,
  Clock,
  Bot,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

type DateRange = "today" | "week" | "month" | "quarter" | "custom";

const dateRangeLabels: Record<DateRange, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  custom: "Custom",
};

// --- Mock Data ---

const kpiCards = [
  {
    label: "Total Revenue",
    value: "$47,850",
    change: "+12%",
    changeDirection: "up" as const,
    subtitle: "vs last month",
    icon: DollarSign,
    bg: "bg-emerald-500/10",
    color: "text-emerald-500",
    ringColor: "ring-emerald-500/20",
  },
  {
    label: "New Leads",
    value: "127",
    change: "+23%",
    changeDirection: "up" as const,
    subtitle: "vs last month",
    icon: Users,
    bg: "bg-blue-500/10",
    color: "text-blue-500",
    ringColor: "ring-blue-500/20",
  },
  {
    label: "Conversion Rate",
    value: "34%",
    change: "+5%",
    changeDirection: "up" as const,
    subtitle: "vs last month",
    icon: TrendingUp,
    bg: "bg-purple-500/10",
    color: "text-purple-500",
    ringColor: "ring-purple-500/20",
  },
  {
    label: "Avg Response Time",
    value: "8s",
    change: "47 min industry avg",
    changeDirection: "up" as const,
    subtitle: "AI-powered",
    icon: Zap,
    bg: "bg-orange-500/10",
    color: "text-orange-500",
    ringColor: "ring-orange-500/20",
  },
];

const aiStats = [
  { label: "Calls Answered", value: "342", icon: Phone },
  { label: "Appointments Booked by AI", value: "47", icon: CalendarCheck },
  { label: "Revenue from AI-Booked Jobs", value: "$12,400", icon: DollarSign },
  { label: "Leads Qualified", value: "89", icon: UserCheck },
  { label: "Reviews Collected", value: "23", icon: Star },
  { label: "Hours Saved", value: "86 hrs", icon: Clock },
];

const aiVsHuman = [
  { label: "Calls Handled", ai: 85, human: 15 },
  { label: "Response Time", ai: 95, human: 12 },
  { label: "Booking Rate", ai: 72, human: 45 },
];

const revenueMonths = [
  { month: "Jan", value: 32000, display: "$32K" },
  { month: "Feb", value: 28000, display: "$28K" },
  { month: "Mar", value: 41000, display: "$41K" },
  { month: "Apr", value: 38000, display: "$38K" },
  { month: "May", value: 45000, display: "$45K" },
  { month: "Jun", value: 48000, display: "$48K" },
];

const revenueSources = [
  { source: "Google Ads", pct: 35, color: "bg-blue-500" },
  { source: "Referrals", pct: 28, color: "bg-emerald-500" },
  { source: "Website", pct: 20, color: "bg-purple-500" },
  { source: "Phone", pct: 12, color: "bg-orange-500" },
  { source: "Yelp", pct: 5, color: "bg-rose-500" },
];

const funnelStages = [
  { stage: "New Lead", count: 127, color: "bg-blue-500", width: "100%" },
  { stage: "Contacted", count: 98, color: "bg-cyan-500", width: "77%" },
  { stage: "Quoted", count: 67, color: "bg-purple-500", width: "53%" },
  { stage: "Scheduled", count: 45, color: "bg-orange-500", width: "35%" },
  { stage: "Won", count: 43, color: "bg-emerald-500", width: "34%" },
];

const campaigns = [
  { name: "Spring AC Tune-Up", sent: 2450, opened: 1102, clicked: 340, converted: 47, revenue: "$9,400" },
  { name: "Emergency Repair Promo", sent: 1800, opened: 936, clicked: 280, converted: 32, revenue: "$6,720" },
  { name: "New Customer Welcome", sent: 320, opened: 256, clicked: 128, converted: 18, revenue: "$3,240" },
  { name: "Referral Program", sent: 890, opened: 534, clicked: 178, converted: 12, revenue: "$2,880" },
];

const channelCPL = [
  { channel: "Google Ads", cpl: "$42", color: "bg-blue-500", width: "100%" },
  { channel: "Facebook", cpl: "$38", color: "bg-indigo-500", width: "90%" },
  { channel: "Direct", cpl: "$0", color: "bg-emerald-500", width: "0%" },
  { channel: "Referral", cpl: "$0", color: "bg-teal-500", width: "0%" },
];

const topCustomers = [
  { name: "Mike Reynolds", spent: "$4,200", visits: 12, lastVisit: "2 days ago" },
  { name: "Sarah Chen", spent: "$3,850", visits: 8, lastVisit: "1 week ago" },
  { name: "Dave & Lisa Martinez", spent: "$3,400", visits: 15, lastVisit: "3 days ago" },
  { name: "Apex Property Mgmt", spent: "$2,900", visits: 6, lastVisit: "5 days ago" },
  { name: "Tom Nguyen", spent: "$2,650", visits: 9, lastVisit: "2 weeks ago" },
];

const teamLeaderboard = [
  { name: "Marcus J.", deals: 18, revenue: "$14,200", responseTime: "12 min" },
  { name: "Sarah K.", deals: 15, revenue: "$12,800", responseTime: "8 min" },
  { name: "AI Agent", deals: 47, revenue: "$12,400", responseTime: "8 sec" },
  { name: "Derek L.", deals: 11, revenue: "$9,600", responseTime: "22 min" },
];

// --- Component ---

export default function AnalyticsPage() {
  usePageTitle("Analytics");
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const maxRevenue = Math.max(...revenueMonths.map((m) => m.value));

  return (
    <div className="space-y-6">
      {/* Header + Date Range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateRangeLabels[dateRange]} performance overview
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-card p-1">
          {(Object.keys(dateRangeLabels) as DateRange[]).map((key) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                dateRange === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {dateRangeLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-xl border border-border bg-card p-5 ring-1 transition-shadow hover:shadow-md",
              card.ringColor,
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              {card.label !== "Avg Response Time" ? (
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" />
                  {card.change}
                </div>
              ) : (
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                  {card.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Performance Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI ROI Card */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">AI ROI This Month</h2>
              <p className="text-[10px] text-muted-foreground">Your AI agent&apos;s impact</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border">
            {aiStats.map((stat) => (
              <div key={stat.label} className="bg-card px-5 py-4">
                <div className="flex items-center gap-2">
                  <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className="mt-1 text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI vs Human Comparison */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">AI vs Human Performance</h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span>AI Agent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span>Human</span>
              </div>
            </div>
            {aiVsHuman.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">
                    AI: {item.ai}% | Human: {item.human}%
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-3 rounded-full bg-primary transition-all duration-500" style={{ width: `${item.ai}%` }} />
                  <div className="h-3 rounded-full bg-muted-foreground/20 transition-all duration-500" style={{ width: `${item.human}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Monthly Revenue</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between gap-3" style={{ height: "220px" }}>
              {revenueMonths.map((month) => {
                const heightPct = (month.value / maxRevenue) * 100;
                return (
                  <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{month.display}</span>
                    <div className="w-full flex items-end" style={{ height: "180px" }}>
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all duration-500",
                          month.month === "Jun"
                            ? "bg-primary"
                            : "bg-primary/30 hover:bg-primary/50",
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{month.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Revenue by Source</h2>
          </div>
          <div className="p-5 space-y-4">
            {revenueSources.map((source) => (
              <div key={source.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{source.source}</span>
                  <span className="font-semibold text-foreground">{source.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full transition-all duration-500", source.color)}
                    style={{ width: `${source.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversion Funnel */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
            <span className="text-xs text-muted-foreground">Lead to Close</span>
          </div>
          <div className="p-5 space-y-3">
            {funnelStages.map((stage, idx) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="w-24 text-xs font-medium text-foreground shrink-0">{stage.stage}</span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <div
                      className={cn("h-8 rounded-lg transition-all duration-500 flex items-center", stage.color)}
                      style={{ width: stage.width }}
                    >
                      <span className="absolute left-3 text-xs font-bold text-white">{stage.count}</span>
                    </div>
                  </div>
                  {idx > 0 && (
                    <span className="text-[10px] text-muted-foreground shrink-0 w-10 text-right">
                      {Math.round((stage.count / funnelStages[idx - 1].count) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Avg Deal Velocity</p>
            <p className="mt-1 text-2xl font-bold text-foreground">4.2 days</p>
            <p className="text-xs text-muted-foreground mt-1">From lead to close</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-500">
              <ArrowDownRight className="h-3 w-3" />
              1.3 days faster than last month
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Stale Deals Alert</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-500">8</p>
            <p className="text-xs text-muted-foreground mt-1">
              Deals stuck for 7+ days without activity
            </p>
            <button className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View stale deals &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Marketing Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaign Performance Table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Campaign Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Campaign</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Sent</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Opened</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Clicked</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Converted</th>
                  <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c, idx) => (
                  <tr key={c.name} className={cn("hover:bg-muted/30 transition-colors", idx === 0 && "bg-emerald-500/5")}>
                    <td className="px-5 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {idx === 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                            TOP
                          </span>
                        )}
                        {c.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{c.sent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{c.opened.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{c.clicked}</td>
                    <td className="px-3 py-3 text-right font-medium text-foreground">{c.converted}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-500">{c.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Per Lead by Channel */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Cost Per Lead</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">By acquisition channel</p>
          </div>
          <div className="p-5 space-y-4">
            {channelCPL.map((ch) => (
              <div key={ch.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{ch.channel}</span>
                  <span className={cn("font-bold", ch.cpl === "$0" ? "text-emerald-500" : "text-foreground")}>
                    {ch.cpl}
                  </span>
                </div>
                {ch.cpl !== "$0" && (
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full transition-all duration-500", ch.color)}
                      style={{ width: ch.width }}
                    />
                  </div>
                )}
                {ch.cpl === "$0" && (
                  <p className="text-[10px] text-emerald-500 font-medium">Free channel</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Customers */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Top Customers by Revenue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Total Spent</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Visits</th>
                  <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCustomers.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-500">{c.spent}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{c.visits}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{c.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Stats + At-Risk */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Lifetime Value</p>
                <p className="mt-1 text-xl font-bold text-foreground">$1,240</p>
                <p className="text-[10px] text-muted-foreground">avg per customer</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retention Rate</p>
                <p className="mt-1 text-xl font-bold text-foreground">78%</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: "78%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <p className="text-sm font-semibold text-foreground">At-Risk Customers</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-500">5</p>
            <p className="text-xs text-muted-foreground mt-1">
              Customers who haven&apos;t visited in 90+ days
            </p>
            <button className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View at-risk list &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Team Leaderboard</h2>
          <span className="text-xs text-muted-foreground">{dateRangeLabels[dateRange]}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left font-semibold text-muted-foreground w-8">#</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Team Member</th>
                <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Deals Closed</th>
                <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Revenue</th>
                <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamLeaderboard
                .sort((a, b) => b.deals - a.deals)
                .map((member, idx) => (
                  <tr
                    key={member.name}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      member.name === "AI Agent" && "bg-primary/5",
                    )}
                  >
                    <td className="px-5 py-3 font-bold text-muted-foreground">
                      {idx === 0 && <span className="text-amber-500">1</span>}
                      {idx === 1 && <span className="text-gray-400">2</span>}
                      {idx === 2 && <span className="text-amber-700">3</span>}
                      {idx > 2 && <span>{idx + 1}</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {member.name === "AI Agent" && (
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        )}
                        {member.name}
                        {idx === 0 && (
                          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                            MVP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-foreground">{member.deals}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-500">{member.revenue}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={cn(
                          "font-medium",
                          member.name === "AI Agent" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {member.responseTime}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
