"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAdminHealth } from "@/lib/hooks/use-admin-api";
import { HealthStatusCard } from "@/components/admin/health-status-card";

const SERVICE_LABELS: Record<string, string> = {
  database: "PostgreSQL Database",
  redis: "Redis Cache / Queue",
  twilio: "Twilio (SMS & Voice)",
  resend: "Resend (Email)",
  anthropic: "Anthropic (Claude AI)",
  stripe: "Stripe (Payments)",
};

export default function AdminHealthPage() {
  usePageTitle("Admin — System Health");

  const { data, loading, refetch } = useAdminHealth();
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetch();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setCountdown(30);
    setRefreshing(false);
  }, [refetch]);

  const statusConfig = {
    healthy: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      label: "All Systems Operational",
    },
    degraded: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      label: "Some Services Degraded",
    },
    down: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      label: "System Issues Detected",
    },
  } as const;

  const overall = statusConfig[data.status];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            System Health
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time service status monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 tabular-nums">
            Next check in {countdown}s
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Check All
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          overall.bg,
          overall.border,
        )}
      >
        <Shield className={cn("h-5 w-5", overall.text)} />
        <div>
          <p className={cn("text-sm font-semibold", overall.text)}>
            {overall.label}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last checked: {new Date(data.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(data.services).map(([key, service]) => (
          <HealthStatusCard
            key={key}
            name={SERVICE_LABELS[key] ?? key}
            service={service}
            loading={loading}
          />
        ))}
      </div>

      {/* Infrastructure section */}
      <div className="rounded-xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Infrastructure
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>API Server</span>
            <span className="text-emerald-600 dark:text-emerald-400">Running</span>
          </div>
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>Frontend (Vercel)</span>
            <span className="text-emerald-600 dark:text-emerald-400">Deployed</span>
          </div>
          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>Backend (Railway)</span>
            <span className="text-emerald-600 dark:text-emerald-400">Deployed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
