"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthService } from "@/lib/hooks/use-admin-api";

const statusConfig = {
  healthy: {
    dot: "bg-emerald-500",
    pulse: true,
    label: "Healthy",
    labelClass: "text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    dot: "bg-amber-500",
    pulse: false,
    label: "Degraded",
    labelClass: "text-amber-600 dark:text-amber-400",
  },
  down: {
    dot: "bg-red-500",
    pulse: false,
    label: "Down",
    labelClass: "text-red-600 dark:text-red-400",
  },
} as const;

interface HealthStatusCardProps {
  name: string;
  service?: HealthService;
  loading?: boolean;
}

export function HealthStatusCard({ name, service, loading }: HealthStatusCardProps) {
  if (loading || !service) {
    return (
      <div className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const config = statusConfig[service.status];

  return (
    <div className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {config.pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
                  config.dot,
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                config.dot,
              )}
            />
          </span>
          <span className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
            {name}
          </span>
        </div>
        <span className={cn("text-xs font-medium", config.labelClass)}>
          {config.label}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="truncate">{service.message}</span>
        {service.latencyMs > 0 && (
          <span className="ml-2 whitespace-nowrap tabular-nums">
            {service.latencyMs}ms
          </span>
        )}
      </div>
    </div>
  );
}

// Compact inline version for the overview health strip
export function HealthDot({
  name,
  status,
}: {
  name: string;
  status: "healthy" | "degraded" | "down";
}) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5" title={`${name}: ${config.label}`}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
              config.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
        {name}
      </span>
    </div>
  );
}
