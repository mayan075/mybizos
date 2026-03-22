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

export { useDashboardStats, useRecentActivity };
