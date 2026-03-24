"use client";

import { useApiQuery } from "./use-api";
import {
  mockStats,
  mockActivity,
  mockUpcomingAppointments,
  type MockStat,
  type MockActivityItem,
  type MockUpcomingAppointment,
} from "@/lib/mock-data";

// --------------------------------------------------------
// Empty-state defaults (shown for new accounts with no data)
// --------------------------------------------------------

const emptyStats: MockStat[] = [
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
  stats: MockStat[];
  upcomingAppointments: MockUpcomingAppointment[];
}

function useDashboardStats() {
  const fallback: DashboardStats = {
    stats: mockStats,
    upcomingAppointments: mockUpcomingAppointments,
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
  return useApiQuery<MockActivityItem[]>(
    "/orgs/:orgId/dashboard/activity",
    mockActivity,
  );
}

export { useDashboardStats, useRecentActivity, emptyStats };
