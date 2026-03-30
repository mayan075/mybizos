"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSparkline } from "./admin-sparkline";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sparklineData?: number[];
  trend?: { value: number; label: string };
  borderColor?: string;
  sparklineColor?: string;
  loading?: boolean;
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  sparklineData,
  trend,
  borderColor = "border-t-blue-500",
  sparklineColor = "#3b82f6",
  loading,
}: AdminStatCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border border-t-2 bg-white p-5 dark:bg-zinc-900", borderColor)}>
        <Skeleton className="mb-3 h-4 w-20" />
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-t-2 bg-white p-5 transition-shadow hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800",
        borderColor,
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="mt-1 flex items-center gap-1">
              {trend.value >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <AdminSparkline
            data={sparklineData}
            color={sparklineColor}
            width={100}
            height={32}
          />
        )}
      </div>
    </div>
  );
}
