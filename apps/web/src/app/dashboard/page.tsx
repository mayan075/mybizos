"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CalendarCheck,
  Phone,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  MessageSquare,
  AlertTriangle,
  Kanban,
  Receipt,
  CalendarDays,
  History,
  ArrowRight,
  Bot,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats, useRecentActivity, emptyStats } from "@/lib/hooks/use-dashboard";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { WelcomeBanner, GettingStartedChecklist } from "@/components/onboarding/getting-started";
import { Tooltip } from "@/components/ui/tooltip";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/recently-viewed";
import { getOnboardingData } from "@/lib/onboarding";
import { getUser } from "@/lib/auth";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Users,
  CalendarCheck,
  Phone,
  DollarSign,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
};

const statTooltips: Record<string, string> = {
  "Leads Today":
    "New potential customers who contacted you today via phone, web, or SMS.",
  "Appointments Booked":
    "Appointments scheduled by you or your AI agent. Includes confirmed and pending.",
  "AI Calls Answered":
    "Calls your AI phone agent answered automatically, so you never miss a lead.",
  "Revenue This Month":
    "Total value of deals marked as Won in your pipeline this month.",
};

/* Clean white cards with colored top border -- Stripe-style */
const statBorderColors = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-violet-500",
  "border-t-amber-500",
];

/* Timeline dot colors keyed by activity type */
const timelineDotColors: Record<string, string> = {
  call: "border-violet-400 bg-violet-50 dark:bg-violet-950/40",
  appointment: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  message: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  lead: "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
};

const recentTypeIcons: Record<string, LucideIcon> = {
  Contact: Users,
  Deal: Kanban,
  Invoice: Receipt,
  Appointment: CalendarDays,
  Page: Clock,
};

const recentTypeBg: Record<string, string> = {
  Contact: "bg-blue-500/10 text-blue-600",
  Deal: "bg-emerald-500/10 text-emerald-600",
  Invoice: "bg-amber-500/10 text-amber-600",
  Appointment: "bg-violet-500/10 text-violet-600",
  Page: "bg-muted text-muted-foreground",
};

// ── Getting Started action cards for new users ──────────────────────────

interface SetupAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const setupActions: SetupAction[] = [
  {
    id: "phone",
    title: "Set up your phone",
    description: "Connect a phone number so customers can call and text you.",
    href: "/dashboard/settings/phone",
    icon: Phone,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
  },
  {
    id: "contact",
    title: "Add your first contact",
    description: "Import existing customers or add them manually.",
    href: "/dashboard/contacts?action=new",
    icon: Users,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
  {
    id: "booking",
    title: "Create your booking page",
    description: "Let customers book appointments online, 24/7.",
    href: "/dashboard/scheduling",
    icon: CalendarDays,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    id: "ai",
    title: "Configure AI agent",
    description: "Set up your AI phone agent to answer calls automatically.",
    href: "/dashboard/settings?tab=ai",
    icon: Bot,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
];

// ── Helper: detect if user has meaningful data ──────────────────────────

function useIsNewUser(stats: typeof emptyStats): boolean {
  // Consider a user "new" if all stat values are "0" or "$0"
  return stats.every((s) => s.value === "0" || s.value === "$0");
}

// ── New User Dashboard ──────────────────────────────────────────────────

function NewUserDashboard() {
  const router = useRouter();
  const onboarding = typeof window !== "undefined" ? getOnboardingData() : null;
  const user = typeof window !== "undefined" ? getUser() : null;
  const businessName = onboarding?.businessName ?? user?.orgName ?? "your business";

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">
      {/* Big welcome */}
      <div className="text-center pt-4">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Welcome to MyBizOS, {businessName}!
        </h1>
        <p className="text-base text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
          Let&apos;s get your business set up. Complete these steps to start receiving leads and booking appointments.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span>Account created</span>
        <span className="text-border">|</span>
        <span>4 steps remaining</span>
      </div>

      {/* Setup action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {setupActions.map((action) => (
          <button
            key={action.id}
            onClick={() => router.push(action.href)}
            className="group relative flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 text-left shadow-sm hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-[1.05]",
              action.iconBg,
            )}>
              <action.icon className={cn("h-5 w-5", action.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {action.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {action.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      {/* Quick skip link */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Already know what you&apos;re doing?{" "}
          <button
            onClick={() => router.push("/dashboard/contacts")}
            className="text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Jump to Contacts
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ─────────────────────────────────────────────────

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const router = useRouter();
  const { data: dashboardData, isLoading: statsLoading, isLive: statsLive } = useDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();

  // Recently viewed items from localStorage
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  useEffect(() => {
    setRecentlyViewed(getRecentlyViewed().slice(0, 5));
  }, []);

  // When the API is live and returns data, use it. When loading, show zeros.
  const stats = statsLoading
    ? emptyStats
    : statsLive
      ? dashboardData.stats
      : dashboardData.stats;

  const upcomingAppointments = statsLoading
    ? []
    : dashboardData.upcomingAppointments;

  const activityItems = activityLoading ? [] : recentActivity;

  const isNewUser = useIsNewUser(stats);

  // Show the new user experience if they have no data yet (and not loading)
  if (!statsLoading && isNewUser) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <WelcomeBanner />
        <NewUserDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Welcome banner -- dismissable, shown only for first-time users */}
      <WelcomeBanner />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Welcome back. Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Getting Started Checklist -- the main onboarding widget */}
      <GettingStartedChecklist />

      {/* Stat cards -- white cards with colored top border (Stripe-style) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = iconMap[stat.iconName] ?? Users;
          const tooltip = statTooltips[stat.label];
          const borderColor = statBorderColors[idx % statBorderColors.length];
          return (
            <button
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className={cn(
                "relative p-6 text-left cursor-pointer group",
                "rounded-xl bg-card border border-border/60 border-t-2",
                borderColor,
                "shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-[1.05]",
                  stat.bg,
                )}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="flex items-center gap-2">
                  {tooltip && (
                    <Tooltip content={tooltip} position="bottom">
                      <span onClick={(e) => e.stopPropagation()} className="cursor-help" />
                    </Tooltip>
                  )}
                  {stat.change !== "--" && (
                    <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {stat.change}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                  {statsLoading ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-muted" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recently Viewed -- only shown if there are items */}
      {recentlyViewed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Recently Viewed
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentlyViewed.map((item) => {
              const TypeIcon = recentTypeIcons[item.type] ?? Clock;
              const typeBg = recentTypeBg[item.type] ?? "bg-muted text-muted-foreground";
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left hover:shadow-sm hover:border-border transition-all duration-200 shrink-0 min-w-[200px] max-w-[280px] group"
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", typeBg)}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.type}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity -- takes 2 cols */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Recent Activity
            </h2>
            <button
              onClick={() => router.push("/dashboard/inbox")}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          </div>

          <div className="rounded-xl bg-card border border-border/60 shadow-sm p-1">
            {activityLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <div className="h-9 w-9 rounded-xl animate-pulse bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded-md animate-pulse bg-muted" />
                      <div className="h-3 w-1/2 rounded-md animate-pulse bg-muted" />
                    </div>
                    <div className="h-3 w-12 rounded-md animate-pulse bg-muted shrink-0" />
                  </div>
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  No activity yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  When customers call, text, or book appointments, their
                  activity will show up here.
                </p>
              </div>
            ) : (
              <div className="relative">
                {activityItems.map((item, idx) => {
                  const ItemIcon = iconMap[item.iconName] ?? Phone;
                  const dotColor = timelineDotColors[item.type] ?? "border-muted-foreground/30 bg-muted";
                  const isLast = idx === activityItems.length - 1;
                  return (
                    <div
                      key={item.id}
                      className="group flex items-start gap-4 px-5 py-4 hover:bg-muted/20 rounded-xl transition-all duration-200 cursor-pointer relative"
                      onClick={() => {
                        if (item.type === "call") router.push("/dashboard/inbox");
                        else if (item.type === "appointment") router.push("/dashboard/scheduling");
                        else if (item.type === "message") router.push("/dashboard/inbox");
                        else if (item.type === "lead") router.push("/dashboard/contacts");
                        else router.push("/dashboard/inbox");
                      }}
                    >
                      {/* Timeline connector line */}
                      {!isLast && (
                        <div className="absolute left-[35px] top-[52px] bottom-0 w-px bg-border/40" />
                      )}

                      {/* Timeline dot with colored ring */}
                      <div className={cn(
                        "relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-transform duration-200 group-hover:scale-[1.08]",
                        dotColor,
                      )}>
                        <ItemIcon className={cn("h-4 w-4", item.color)} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 shrink-0 pt-0.5">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming appointments -- 1 col */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Upcoming Appointments
            </h2>
            <button
              onClick={() => router.push("/dashboard/scheduling")}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          </div>

          <div className="rounded-xl bg-card border border-border/60 shadow-sm p-1">
            {statsLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-32 rounded-md animate-pulse bg-muted" />
                      <div className="h-5 w-16 rounded-full animate-pulse bg-muted" />
                    </div>
                    <div className="h-3 w-24 rounded-md animate-pulse bg-muted" />
                    <div className="h-3 w-36 rounded-md animate-pulse bg-muted" />
                  </div>
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 mb-3">
                  <CalendarCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  No upcoming appointments
                </p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Set up your booking page so customers can schedule with you.
                </p>
                <button
                  onClick={() => router.push("/dashboard/scheduling")}
                  className="mt-4 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Go to Scheduling
                </button>
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="group px-5 py-4 hover:bg-muted/20 rounded-xl transition-all duration-200 cursor-pointer"
                  onClick={() => router.push("/dashboard/scheduling")}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {apt.customer}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        apt.status === "confirmed"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {apt.service}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {apt.date} at {apt.time}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center justify-center gap-5 py-3 text-[11px] text-muted-foreground/50">
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded-md bg-muted/50 px-1.5 text-[10px] font-medium border border-border/40">
            Ctrl+K
          </kbd>
          Command palette
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded-md bg-muted/50 px-1.5 text-[10px] font-medium border border-border/40">
            Ctrl+N
          </kbd>
          New contact
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded-md bg-muted/50 px-1.5 text-[10px] font-medium border border-border/40">
            Ctrl+Shift+N
          </kbd>
          New deal
        </span>
      </div>
    </div>
  );
}
