"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Ban,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAdminUserDetail } from "@/lib/hooks/use-admin-api";
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const toast = useToast();

  const { data, loading, refetch } = useAdminUserDetail(userId);

  usePageTitle(data?.user.name ? `Admin — ${data.user.name}` : "Admin — User");

  const handleDisable = useCallback(async () => {
    const reason = prompt("Reason for disabling this user:");
    if (!reason) return;
    try {
      await apiClient.patch(`/admin/users/${userId}/disable`, { reason });
      toast.success("User disabled");
      refetch();
    } catch {
      toast.error("Failed to disable user");
    }
  }, [userId, toast, refetch]);

  const handleEnable = useCallback(async () => {
    try {
      await apiClient.patch(`/admin/users/${userId}/enable`, {});
      toast.success("User enabled");
      refetch();
    } catch {
      toast.error("Failed to enable user");
    }
  }, [userId, toast, refetch]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </Link>

      {/* User header */}
      <div className="flex items-start justify-between rounded-xl border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {user.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Mail className="h-3 w-3" /> {user.email}
                {user.emailVerified && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Joined {formatDate(new Date(user.createdAt))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last login{" "}
              {user.lastLoginAt ? formatRelativeTime(new Date(user.lastLoginAt)) : "Never"}
            </span>
            {!user.isActive && user.disabledReason && (
              <span className="text-red-500">
                Disabled: {user.disabledReason}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.isActive ? (
            <>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Active
              </span>
              <button
                onClick={handleDisable}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Ban className="h-3.5 w-3.5" /> Disable
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Disabled
              </span>
              <button
                onClick={handleEnable}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Enable
              </button>
            </>
          )}
        </div>
      </div>

      {/* Organization memberships */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Organization Memberships
        </h2>
        {data.memberships.length === 0 ? (
          <p className="rounded-xl border p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Not a member of any organization
          </p>
        ) : (
          <div className="space-y-2">
            {data.memberships.map((m) => (
              <Link
                key={m.orgId}
                href={`/dashboard/admin/organizations/${m.orgId}`}
                className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {m.orgName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                    {m.orgIndustry} &middot; Joined {formatDate(new Date(m.joinedAt))}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    m.role === "owner"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
                      : m.role === "admin"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                  )}
                >
                  {m.role}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Activity
        </h2>
        <AdminActivityFeed
          activity={data.recentActivity.map((a) => ({
            ...a,
            resourceId: null,
            userEmail: user.email,
            userName: user.name,
            orgId: "",
          }))}
        />
      </div>
    </div>
  );
}
