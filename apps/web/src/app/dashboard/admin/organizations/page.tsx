"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
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
import { useAdminOrgs } from "@/lib/hooks/use-admin-api";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

function OrgHealthDot({ lastLogin }: { lastLogin: string | null }) {
  if (!lastLogin) {
    return <span className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" title="No logins" />;
  }

  const daysSinceLogin = Math.floor(
    (Date.now() - new Date(lastLogin).getTime()) / 86400000,
  );

  if (daysSinceLogin < 7) {
    return (
      <span className="relative flex h-2 w-2" title={`Active ${daysSinceLogin}d ago`}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    );
  }

  if (daysSinceLogin < 30) {
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" title={`Last login ${daysSinceLogin}d ago`} />;
  }

  return <span className="inline-block h-2 w-2 rounded-full bg-red-500" title={`Inactive ${daysSinceLogin}d`} />;
}

export default function AdminOrganizationsPage() {
  usePageTitle("Admin — Organizations");
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, loading, error, refetch } = useAdminOrgs({
    search,
    limit: pageSize,
    offset: page * pageSize,
  });

  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const handleSuspend = useCallback(
    async (orgId: string) => {
      const reason = prompt("Reason for suspending this organization:");
      if (!reason) return;

      try {
        await apiClient.patch(`/admin/organizations/${orgId}/suspend`, { reason });
        toast.success("Organization suspended");
        refetch();
      } catch {
        toast.error("Failed to suspend");
      }
      setActionMenu(null);
    },
    [toast, refetch],
  );

  const handleActivate = useCallback(
    async (orgId: string) => {
      try {
        await apiClient.patch(`/admin/organizations/${orgId}/activate`, {});
        toast.success("Organization activated");
        refetch();
      } catch {
        toast.error("Failed to activate");
      }
      setActionMenu(null);
    },
    [toast, refetch],
  );

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Organizations
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.total} total organizations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search organizations..."
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
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3 text-center">Members</th>
              <th className="px-4 py-3 text-center">Contacts</th>
              <th className="px-4 py-3 text-center">Deals</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <OrgHealthDot lastLogin={org.lastMemberLogin} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/organizations/${org.id}`}
                        className="font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-400">
                      {org.industry}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-zinc-600 dark:text-zinc-400">
                      {org.memberCount}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-zinc-600 dark:text-zinc-400">
                      {org.contactCount}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-zinc-600 dark:text-zinc-400">
                      {org.dealCount}
                    </td>
                    <td className="px-4 py-3">
                      {org.suspendedAt ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(new Date(org.createdAt))}
                    </td>
                    <td className="relative px-4 py-3">
                      <button
                        onClick={() => setActionMenu(actionMenu === org.id ? null : org.id)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {actionMenu === org.id && (
                        <div className="absolute right-4 top-10 z-20 w-40 rounded-lg border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                          <Link
                            href={`/dashboard/admin/organizations/${org.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> View details
                          </Link>
                          {org.suspendedAt ? (
                            <button
                              onClick={() => handleActivate(org.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-zinc-50 dark:text-emerald-400 dark:hover:bg-zinc-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(org.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-700"
                            >
                              <Ban className="h-3.5 w-3.5" /> Suspend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Failed to load organizations
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && data.organizations.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No organizations found
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
