"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityItem } from "@/lib/hooks/use-admin-api";

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  login: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  logout: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  send: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  import: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  export: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  invite: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  role_change: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        actionColors[action] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      )}
    >
      {action}
    </span>
  );
}

interface AdminActivityFeedProps {
  activity: ActivityItem[];
  loading?: boolean;
}

export function AdminActivityFeed({ activity, loading }: AdminActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3 dark:border-zinc-800">
            <Skeleton className="h-5 w-14 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No recent activity
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activity.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
        >
          <ActionBadge action={item.action} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {item.description}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              {item.userName && <span>{item.userName}</span>}
              {item.userName && item.orgName && <span>&middot;</span>}
              {item.orgName && (
                <span className="truncate">{item.orgName}</span>
              )}
              <span>&middot;</span>
              <span className="whitespace-nowrap">
                {formatRelativeTime(new Date(item.createdAt))}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
