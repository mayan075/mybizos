"use client";

import { useApiQuery } from "./use-api";
import type { DashboardStat, ActivityItem, UpcomingAppointment } from "@/lib/types";

// --------------------------------------------------------
// Empty-state defaults (shown for new accounts with no data)
// --------------------------------------------------------

const emptyStats: DashboardStat[] = [
  {
    label: "Leads Today",
    value: "0",
    change: "--",
    trend: "up",
    iconName: "Users",
    color: "text-info",
    bg: "bg-info/10",
    href: "/dashboard/contacts",
  },
  {
    label: "Appointments Booked",
    value: "0",
    change: "--",
    trend: "up",
    iconName: "CalendarCheck",
    color: "text-success",
    bg: "bg-success/10",
    href: "/dashboard/scheduling",
  },
  {
    label: "AI Calls Answered",
    value: "0",
    change: "--",
    trend: "up",
    iconName: "Phone",
    color: "text-primary",
    bg: "bg-primary/10",
    href: "/dashboard/calls",
  },
  {
    label: "Revenue This Month",
    value: "$0",
    change: "--",
    trend: "up",
    iconName: "DollarSign",
    color: "text-warning",
    bg: "bg-warning/10",
    href: "/dashboard/pipeline",
  },
];

// --------------------------------------------------------
// useDashboardStats
// --------------------------------------------------------

interface DashboardStats {
  stats: DashboardStat[];
  upcomingAppointments: UpcomingAppointment[];
}

function useDashboardStats() {
  const fallback: DashboardStats = {
    stats: emptyStats,
    upcomingAppointments: [],
  };

  return useApiQuery<DashboardStats>(
    "/orgs/:orgId/dashboard/stats",
    fallback,
  );
}

// --------------------------------------------------------
// useRecentActivity
// --------------------------------------------------------

function useRecentActivity() {
  return useApiQuery<ActivityItem[]>(
    "/orgs/:orgId/dashboard/activity",
    [],
  );
}

export { useDashboardStats, useRecentActivity, emptyStats };
