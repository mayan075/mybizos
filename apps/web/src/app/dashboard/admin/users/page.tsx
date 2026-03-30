"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Ban,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAdminUsers } from "@/lib/hooks/use-admin-api";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  usePageTitle("Admin — Users");
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, loading, refetch } = useAdminUsers({
    search,
    limit: pageSize,
    offset: page * pageSize,
  });

  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const handleDisable = useCallback(
    async (userId: string) => {
      const reason = prompt("Reason for disabling this user:");
      if (!reason) return;

      try {
        await apiClient.patch(`/admin/users/${userId}/disable`, { reason });
        toast.success("User disabled");
        refetch();
      } catch {
        toast.error("Failed to disable user");
      }
      setActionMenu(null);
    },
    [toast, refetch],
  );

  const handleEnable = useCallback(
    async (userId: string) => {
      try {
        await apiClient.patch(`/admin/users/${userId}/enable`, {});
        toast.success("User enabled");
        refetch();
      } catch {
        toast.error("Failed to enable user");
      }
      setActionMenu(null);
    },
    [toast, refetch],
  );

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Users
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {data.total} total users across all organizations
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Organizations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/users/${user.id}`}
                        className="font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.organizations.map((org) => (
                          <Link
                            key={org.orgId}
                            href={`/dashboard/admin/organizations/${org.orgId}`}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            {org.orgName}
                            <span className="ml-1 text-blue-400 dark:text-blue-500">
                              ({org.role})
                            </span>
                          </Link>
                        ))}
                        {user.organizations.length === 0 && (
                          <span className="text-xs text-zinc-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {user.lastLoginAt
                        ? formatRelativeTime(new Date(user.lastLoginAt))
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(new Date(user.createdAt))}
                    </td>
                    <td className="relative px-4 py-3">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {actionMenu === user.id && (
                        <div className="absolute right-4 top-10 z-20 w-40 rounded-lg border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                          <Link
                            href={`/dashboard/admin/users/${user.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> View details
                          </Link>
                          {user.isActive ? (
                            <button
                              onClick={() => handleDisable(user.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-700"
                            >
                              <Ban className="h-3.5 w-3.5" /> Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnable(user.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-zinc-50 dark:text-emerald-400 dark:hover:bg-zinc-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Enable
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && data.users.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No users found
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {page * pageSize + 1}-
            {Math.min((page + 1) * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-zinc-600 dark:text-zinc-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
