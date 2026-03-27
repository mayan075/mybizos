"use client";

import { useApiQuery } from "./use-api";

interface KpiMetric {
  value: number;
  previous?: number;
  change?: number;
}

interface AnalyticsData {
  period: string;
  kpis: {
    leads: KpiMetric;
    revenue: KpiMetric;
    dealsWon: KpiMetric;
    appointments: KpiMetric;
    formSubmissions: KpiMetric;
    calls: KpiMetric;
  };
  leadSources: Array<{ source: string; count: number }>;
  recentActivities: Array<Record<string, unknown>>;
}

const emptyAnalytics: AnalyticsData = {
  period: "30d",
  kpis: {
    leads: { value: 0 },
    revenue: { value: 0 },
    dealsWon: { value: 0 },
    appointments: { value: 0 },
    formSubmissions: { value: 0 },
    calls: { value: 0 },
  },
  leadSources: [],
  recentActivities: [],
};

function useAnalytics(period: string = "30d") {
  return useApiQuery<AnalyticsData>(
    "/orgs/:orgId/analytics",
    emptyAnalytics,
    { period },
  );
}

export { useAnalytics };
export type { AnalyticsData, KpiMetric };
