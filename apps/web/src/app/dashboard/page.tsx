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

const stats = [
  {
    label: "Leads Today",
    value: "12",
    change: "+18%",
    trend: "up" as const,
    icon: Users,
    color: "text-info",
    bg: "bg-info/10",
    href: "/dashboard/contacts",
  },
  {
    label: "Appointments Booked",
    value: "8",
    change: "+25%",
    trend: "up" as const,
    icon: CalendarCheck,
    color: "text-success",
    bg: "bg-success/10",
    href: "/dashboard/scheduling",
  },
  {
    label: "AI Calls Answered",
    value: "47",
    change: "+34%",
    trend: "up" as const,
    icon: Phone,
    color: "text-primary",
    bg: "bg-primary/10",
    href: "/dashboard/inbox",
  },
  {
    label: "Revenue This Month",
    value: "$12,400",
    change: "+12%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-warning",
    bg: "bg-warning/10",
    href: "/dashboard/pipeline",
  },
];

const recentActivity = [
  {
    id: "1",
    type: "call",
    icon: Phone,
    title: "AI answered call from (555) 123-4567",
    description: "Qualified lead — HVAC maintenance inquiry",
    time: "2 min ago",
    color: "text-primary",
  },
  {
    id: "2",
    type: "appointment",
    icon: CalendarCheck,
    title: "Appointment booked — Sarah Johnson",
    description: "AC Tune-Up — Tomorrow at 10:00 AM",
    time: "15 min ago",
    color: "text-success",
  },
  {
    id: "3",
    type: "message",
    icon: MessageSquare,
    title: "SMS from Mike Chen",
    description: "Confirming service appointment for Friday",
    time: "1 hr ago",
    color: "text-info",
  },
  {
    id: "4",
    type: "lead",
    icon: TrendingUp,
    title: "New lead scored: 85/100",
    description: "David Park — Furnace replacement inquiry",
    time: "2 hr ago",
    color: "text-warning",
  },
  {
    id: "5",
    type: "call",
    icon: Phone,
    title: "AI answered call from (555) 987-6543",
    description: "Plumbing emergency — routed to on-call tech",
    time: "3 hr ago",
    color: "text-primary",
  },
  {
    id: "6",
    type: "alert",
    icon: AlertTriangle,
    title: "Emergency keyword detected — Gas leak",
    description: "AI escalated to owner. Customer: Emily Davis",
    time: "4 hr ago",
    color: "text-destructive",
  },
];

const upcomingAppointments = [
  {
    id: "1",
    customer: "Sarah Johnson",
    service: "AC Tune-Up",
    time: "10:00 AM",
    date: "Tomorrow",
    status: "confirmed" as const,
  },
  {
    id: "2",
    customer: "Mike Chen",
    service: "Plumbing Inspection",
    time: "2:00 PM",
    date: "Friday",
    status: "scheduled" as const,
  },
  {
    id: "3",
    customer: "Lisa Wang",
    service: "Furnace Repair",
    time: "9:00 AM",
    date: "Monday",
    status: "scheduled" as const,
  },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md text-left cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-success">
                <ArrowUpRight className="h-3 w-3" />
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity — takes 2 cols */}
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
            {recentActivity.map((item) => (
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
                  <item.icon className="h-4 w-4" />
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
            ))}
          </div>
        </div>

        {/* Upcoming appointments — 1 col */}
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
            {upcomingAppointments.map((apt) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
