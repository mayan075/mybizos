"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats, useRecentActivity } from "@/lib/hooks/use-dashboard";
import { WelcomeBanner, GettingStartedChecklist } from "@/components/onboarding/getting-started";
import { Tooltip } from "@/components/ui/tooltip";
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: dashboardData } = useDashboardStats();
  const { data: recentActivity } = useRecentActivity();

  const stats = dashboardData.stats;
  const upcomingAppointments = dashboardData.upcomingAppointments;

  return (
    <div className="space-y-6">
      {/* Welcome banner for first-time users */}
      <WelcomeBanner />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Getting Started Checklist */}
      <GettingStartedChecklist />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = iconMap[stat.iconName] ?? Users;
          const tooltip = statTooltips[stat.label];
          return (
            <button
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="flex items-center gap-2">
                  {tooltip && (
                    <Tooltip content={tooltip} position="bottom">
                      <span onClick={(e) => e.stopPropagation()} className="cursor-help" />
                    </Tooltip>
                  )}
                  <div className="flex items-center gap-1 text-xs font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity -- takes 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h2>
            <button
              onClick={() => router.push("/dashboard/inbox")}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No activity yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  When customers call, text, or book appointments, their
                  activity will show up here.
                </p>
              </div>
            ) : (
              recentActivity.map((item) => {
                const ItemIcon = iconMap[item.iconName] ?? Phone;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      if (item.type === "call") router.push("/dashboard/inbox");
                      else if (item.type === "appointment") router.push("/dashboard/scheduling");
                      else if (item.type === "message") router.push("/dashboard/inbox");
                      else if (item.type === "lead") router.push("/dashboard/contacts");
                      else router.push("/dashboard/inbox");
                    }}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted", item.color)}>
                      <ItemIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming appointments -- 1 col */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Upcoming Appointments
            </h2>
            <button
              onClick={() => router.push("/dashboard/scheduling")}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <CalendarCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No upcoming appointments
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Set up your booking page so customers can schedule with you.
                </p>
                <button
                  onClick={() => router.push("/dashboard/scheduling")}
                  className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Go to Scheduling
                </button>
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push("/dashboard/scheduling")}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {apt.customer}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        apt.status === "confirmed"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {apt.service}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {apt.date} at {apt.time}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px]">
            Ctrl+K
          </kbd>
          Command palette
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px]">
            Ctrl+N
          </kbd>
          New contact
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px]">
            Ctrl+Shift+N
          </kbd>
          New deal
        </span>
      </div>
    </div>
  );
}
