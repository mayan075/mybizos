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
  Loader2,
  BarChart3,
  Target,
  Megaphone,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAnalytics } from "@/lib/hooks/use-analytics";

type DateRange = "today" | "week" | "month" | "quarter" | "custom";

const dateRangeLabels: Record<DateRange, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  custom: "Custom",
};

/** Map our UI date range to the API period param */
const dateRangeToPeriod: Record<DateRange, string> = {
  today: "1d",
  week: "7d",
  month: "30d",
  quarter: "90d",
  custom: "30d",
};

function formatCurrencyVal(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatChangePercent(change: number | undefined): string {
  if (change === undefined || change === null) return "--";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// ── Empty state component for sections without API data ──

function ComingSoonCard({ title, description, icon: Icon }: { title: string; description: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">{description}</p>
      <span className="mt-3 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
        Coming Soon
      </span>
    </div>
  );
}

// --- Component ---

export default function AnalyticsPage() {
  usePageTitle("Analytics");
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const period = dateRangeToPeriod[dateRange];
  const { data: analytics, isLoading } = useAnalytics(period);

  // Build KPI cards from live analytics data
  const kpis = analytics?.kpis;

  const kpiCards = [
    {
      label: "Total Revenue",
      value: kpis ? formatCurrencyVal(kpis.revenue.value) : "$0",
      change: kpis?.revenue.change,
      changeDirection: (kpis?.revenue.change ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      subtitle: "vs last period",
      icon: DollarSign,
      bg: "bg-emerald-500/10",
      color: "text-emerald-500",
      ringColor: "ring-emerald-500/20",
    },
    {
      label: "New Leads",
      value: kpis ? kpis.leads.value.toLocaleString() : "0",
      change: kpis?.leads.change,
      changeDirection: (kpis?.leads.change ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      subtitle: "vs last period",
      icon: Users,
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      ringColor: "ring-blue-500/20",
    },
    {
      label: "Deals Won",
      value: kpis ? kpis.dealsWon.value.toLocaleString() : "0",
      change: kpis?.dealsWon.change,
      changeDirection: (kpis?.dealsWon.change ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      subtitle: "vs last period",
      icon: TrendingUp,
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      ringColor: "ring-purple-500/20",
    },
    {
      label: "Avg Response Time",
      value: "--",
      change: undefined,
      changeDirection: "up" as const,
      subtitle: "AI-powered",
      icon: Zap,
      bg: "bg-orange-500/10",
      color: "text-orange-500",
      ringColor: "ring-orange-500/20",
    },
  ];

  // Build AI stats from live data
  const aiStats = [
    { label: "Calls Answered", value: kpis ? kpis.calls.value.toLocaleString() : "0", icon: Phone },
    { label: "Appointments Booked", value: kpis ? kpis.appointments.value.toLocaleString() : "0", icon: CalendarCheck },
    { label: "Revenue from AI-Booked Jobs", value: "$0", icon: DollarSign },
    { label: "Leads Qualified", value: kpis ? kpis.leads.value.toLocaleString() : "0", icon: UserCheck },
    { label: "Reviews Collected", value: "0", icon: Star },
    { label: "Form Submissions", value: kpis ? kpis.formSubmissions.value.toLocaleString() : "0", icon: Clock },
  ];

  // Build lead sources from live data
  const leadSources = analytics?.leadSources ?? [];
  const totalLeadCount = leadSources.reduce((s, ls) => s + ls.count, 0);
  const revenueSources = leadSources.length > 0
    ? leadSources.map((ls, i) => {
        const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-rose-500"];
        return {
          source: ls.source,
          pct: totalLeadCount > 0 ? Math.round((ls.count / totalLeadCount) * 100) : 0,
          color: colors[i % colors.length],
        };
      })
    : [];

  // Build conversion funnel from live KPI data
  // Uses: leads -> appointments -> deals won (best we can derive from analytics API)
  const funnelLeads = kpis?.leads.value ?? 0;
  const funnelAppointments = kpis?.appointments.value ?? 0;
  const funnelDealsWon = kpis?.dealsWon.value ?? 0;
  const funnelMax = Math.max(funnelLeads, 1); // avoid division by zero

  const funnelStages = [
    { stage: "New Leads", count: funnelLeads, color: "bg-blue-500", widthPct: (funnelLeads / funnelMax) * 100 },
    { stage: "Appointments", count: funnelAppointments, color: "bg-orange-500", widthPct: (funnelAppointments / funnelMax) * 100 },
    { stage: "Deals Won", count: funnelDealsWon, color: "bg-emerald-500", widthPct: (funnelDealsWon / funnelMax) * 100 },
  ];
  const hasFunnelData = funnelLeads > 0 || funnelAppointments > 0 || funnelDealsWon > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              {card.change !== undefined ? (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-semibold",
                    card.changeDirection === "up" ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {card.changeDirection === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatChangePercent(card.change)}
                </div>
              ) : (
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                  Analytics will populate as you use the platform
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

        {/* AI vs Human Comparison — Coming Soon */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">AI vs Human Performance</h2>
          </div>
          <ComingSoonCard
            icon={Bot}
            title="No data yet"
            description="AI vs Human performance comparison will appear here once your AI agent starts handling calls alongside your team."
          />
        </div>
      </div>

      {/* Revenue Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart — Coming Soon (no monthly breakdown API) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Monthly Revenue</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          {kpis && kpis.revenue.value > 0 ? (
            <div className="p-5">
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-3xl font-bold text-foreground">{formatCurrencyVal(kpis.revenue.value)}</p>
                <p className="text-sm text-muted-foreground mt-1">Total revenue this period</p>
                {kpis.revenue.change !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm font-semibold",
                    kpis.revenue.change >= 0 ? "text-emerald-500" : "text-red-500",
                  )}>
                    {kpis.revenue.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {formatChangePercent(kpis.revenue.change)} vs previous period
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">Monthly bar chart will appear once historical revenue data is available.</p>
              </div>
            </div>
          ) : (
            <ComingSoonCard
              icon={BarChart3}
              title="No revenue data yet"
              description="Monthly revenue trends will appear here as you close deals in your pipeline."
            />
          )}
        </div>

        {/* Lead Sources (live from API) */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Lead Sources</h2>
          </div>
          {revenueSources.length > 0 ? (
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
          ) : (
            <ComingSoonCard
              icon={Target}
              title="No lead sources yet"
              description="Lead source breakdown will appear as contacts are added with source information."
            />
          )}
        </div>
      </div>

      {/* Pipeline Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversion Funnel (derived from live KPI data) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
            <span className="text-xs text-muted-foreground">Lead to Close</span>
          </div>
          {hasFunnelData ? (
            <div className="p-5 space-y-3">
              {funnelStages.map((stage, idx) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <span className="w-24 text-xs font-medium text-foreground shrink-0">{stage.stage}</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 relative">
                      <div
                        className={cn("h-8 rounded-lg transition-all duration-500 flex items-center", stage.color)}
                        style={{ width: `${Math.max(stage.widthPct, 4)}%` }}
                      >
                        <span className="absolute left-3 text-xs font-bold text-white">{stage.count}</span>
                      </div>
                    </div>
                    {idx > 0 && (
                      <span className="text-[10px] text-muted-foreground shrink-0 w-10 text-right">
                        {funnelStages[idx - 1].count > 0 ? Math.round((stage.count / funnelStages[idx - 1].count) * 100) : 0}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ComingSoonCard
              icon={TrendingUp}
              title="No funnel data yet"
              description="Conversion funnel will populate as leads move through your pipeline stages."
            />
          )}
        </div>

        {/* Pipeline Stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Avg Deal Velocity</p>
            <p className="mt-1 text-2xl font-bold text-foreground">--</p>
            <p className="text-xs text-muted-foreground mt-1">From lead to close</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Will calculate once you have closed deals
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Stale Deals Alert</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-muted-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">
              Deals stuck for 7+ days without activity
            </p>
            <a href="/dashboard/pipeline" className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              View pipeline &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Marketing Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaign Performance — Coming Soon */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Campaign Performance</h2>
          </div>
          <ComingSoonCard
            icon={Megaphone}
            title="No campaigns yet"
            description="Campaign metrics (sent, opened, clicked, converted) will appear here once you launch email or SMS campaigns."
          />
        </div>

        {/* Cost Per Lead — Coming Soon */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Cost Per Lead</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">By acquisition channel</p>
          </div>
          <ComingSoonCard
            icon={DollarSign}
            title="No cost data yet"
            description="Cost per lead by channel will appear once ad spend tracking is connected."
          />
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Customers — Coming Soon */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Top Customers by Revenue</h2>
          </div>
          <ComingSoonCard
            icon={Users}
            title="No customer revenue data yet"
            description="Top customers ranked by lifetime spend will appear as deals are closed."
          />
        </div>

        {/* Customer Stats + At-Risk */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Lifetime Value</p>
                <p className="mt-1 text-xl font-bold text-foreground">$0</p>
                <p className="text-[10px] text-muted-foreground">avg per customer</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retention Rate</p>
                <p className="mt-1 text-xl font-bold text-foreground">--</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-muted" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">At-Risk Customers</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-muted-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">
              Customers who haven&apos;t visited in 90+ days
            </p>
            <a href="/dashboard/contacts" className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              View contacts &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Team Performance — Coming Soon */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Team Leaderboard</h2>
          <span className="text-xs text-muted-foreground">{dateRangeLabels[dateRange]}</span>
        </div>
        <ComingSoonCard
          icon={Trophy}
          title="No team data yet"
          description="Team leaderboard will show deals closed, revenue, and response times once team members start using the platform."
        />
      </div>
    </div>
  );
}
