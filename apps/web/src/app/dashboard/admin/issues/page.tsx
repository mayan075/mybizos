"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  Bug,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface LoggedIssue {
  id: string;
  timestamp: string;
  page: string;
  description: string;
  status: "open" | "resolved";
  userAgent: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "mybizos_issues";

/* -------------------------------------------------------------------------- */
/*  Mock issues for demo purposes                                             */
/* -------------------------------------------------------------------------- */

// Real issues come from localStorage; no mock data
const MOCK_ISSUES: LoggedIssue[] = [];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* -------------------------------------------------------------------------- */
/*  Admin Issues Page                                                         */
/* -------------------------------------------------------------------------- */

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<LoggedIssue[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  /* ---------------------------------------- */
  /*  Load issues                              */
  /* ---------------------------------------- */
  const loadIssues = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const userIssues: LoggedIssue[] = stored ? JSON.parse(stored) : [];
      // Combine user-reported issues with mock issues (removing mock dupes)
      const mockIds = new Set(MOCK_ISSUES.map((i) => i.id));
      const combined = [
        ...userIssues.filter((i) => !mockIds.has(i.id)),
        ...MOCK_ISSUES,
      ];
      setIssues(combined);
    } catch {
      setIssues(MOCK_ISSUES);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  /* ---------------------------------------- */
  /*  Toggle issue status                      */
  /* ---------------------------------------- */
  const toggleStatus = useCallback(
    (issueId: string) => {
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status: issue.status === "open" ? "resolved" : "open",
              }
            : issue,
        ),
      );

      // Persist to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const userIssues: LoggedIssue[] = stored ? JSON.parse(stored) : [];
        const updated = userIssues.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status:
                  issue.status === "open"
                    ? ("resolved" as const)
                    : ("open" as const),
              }
            : issue,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Non-critical
      }
    },
    [],
  );

  /* ---------------------------------------- */
  /*  Delete issue                             */
  /* ---------------------------------------- */
  const deleteIssue = useCallback((issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const userIssues: LoggedIssue[] = stored ? JSON.parse(stored) : [];
      const updated = userIssues.filter((i) => i.id !== issueId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Non-critical
    }

    setSelectedIssue(null);
  }, []);

  /* ---------------------------------------- */
  /*  Filter & sort                            */
  /* ---------------------------------------- */
  const filteredIssues = issues
    .filter((issue) => {
      if (filter === "open" && issue.status !== "open") return false;
      if (filter === "resolved" && issue.status !== "resolved") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          issue.description.toLowerCase().includes(q) ||
          issue.page.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const openCount = issues.filter((i) => i.status === "open").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  /* ---------------------------------------- */
  /*  Render                                   */
  /* ---------------------------------------- */
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bug className="h-6 w-6 text-violet-600" />
            Reported Issues
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Issues reported by users through the AI Assistant. Review, resolve,
            and track platform problems.
          </p>
        </div>
        <button
          type="button"
          onClick={loadIssues}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bug className="h-4 w-4" />
            <span className="text-sm font-medium">Total Issues</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {issues.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Open</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {openCount}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {resolvedCount}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          {(["all", "open", "resolved"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize",
                filter === status
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {status}
              {status === "open" && openCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-700 dark:text-amber-400 px-1">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues by description or page..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition"
          />
        </div>

        {/* Sort toggle */}
        <button
          type="button"
          onClick={() =>
            setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
          }
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Bug className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No issues found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter !== "all"
              ? `No ${filter} issues to display.`
              : searchQuery
                ? "Try adjusting your search."
                : "No issues have been reported yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "group rounded-xl border bg-card transition-all",
                issue.status === "open"
                  ? "border-amber-200/60 dark:border-amber-800/40"
                  : "border-border",
                selectedIssue === issue.id && "ring-2 ring-violet-500/30",
              )}
            >
              {/* Issue row */}
              <button
                type="button"
                onClick={() =>
                  setSelectedIssue(
                    selectedIssue === issue.id ? null : issue.id,
                  )
                }
                className="flex items-start gap-3 w-full text-left px-4 py-3"
              >
                {/* Status icon */}
                <div className="shrink-0 mt-0.5">
                  {issue.status === "open" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">
                    {issue.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(issue.timestamp)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      {issue.page}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        issue.status === "open"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {issue.status}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {selectedIssue === issue.id && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Reported At
                      </p>
                      <p className="text-foreground">
                        {formatFullDate(issue.timestamp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Page
                      </p>
                      <p className="text-foreground font-mono text-xs">
                        {issue.page}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Full Description
                      </p>
                      <p className="text-foreground">{issue.description}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        User Agent
                      </p>
                      <p className="text-foreground font-mono text-xs truncate">
                        {issue.userAgent}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => toggleStatus(issue.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        issue.status === "open"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                          : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50",
                      )}
                    >
                      {issue.status === "open" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Resolved
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Reopen
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteIssue(issue.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
