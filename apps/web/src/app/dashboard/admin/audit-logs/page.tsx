"use client";

import { useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAdminAuditLogs, type AuditLogEntry } from "@/lib/hooks/use-admin-api";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { getAuthHeaders } from "@/lib/auth";

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

const ACTION_OPTIONS = [
  "",
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "send",
  "import",
  "export",
  "invite",
  "role_change",
];

function LogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata =
    log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <>
      <tr
        className={cn(
          "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
          hasMetadata && "cursor-pointer",
        )}
        onClick={() => hasMetadata && setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              actionColors[log.action] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
            )}
          >
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
          {log.description}
        </td>
        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
          {log.resource}
        </td>
        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
          {log.userName ?? "System"}
        </td>
        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs truncate max-w-[120px]">
          {log.orgName ?? "-"}
        </td>
        <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {formatRelativeTime(new Date(log.createdAt))}
        </td>
        <td className="px-4 py-3">
          {hasMetadata && (
            expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            )
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr>
          <td colSpan={7} className="bg-zinc-50 px-6 py-3 dark:bg-zinc-800/50">
            <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
            {log.ipAddress && (
              <p className="mt-2 text-xs text-zinc-400">
                IP: {log.ipAddress}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAuditLogsPage() {
  usePageTitle("Admin — Audit Logs");

  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const { data, loading } = useAdminAuditLogs({
    action: action || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const totalPages = Math.ceil(data.total / pageSize);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    const url = `${env.NEXT_PUBLIC_API_URL}/admin/audit-logs/export${params.toString() ? `?${params}` : ""}`;

    // Download via fetch with auth headers
    fetch(url, { headers: getAuthHeaders() })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "audit-logs.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }, [action]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Audit Logs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.total} total events across all organizations
          </p>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.logs.map((log) => <LogRow key={log.id} log={log} />)}
          </tbody>
        </table>

        {!loading && data.logs.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No audit logs found
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
