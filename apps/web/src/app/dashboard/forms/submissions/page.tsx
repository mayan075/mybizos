"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileInput,
  ChevronDownIcon,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface MockSubmission {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, string>;
  submittedAt: string;
  source: string;
  contactCreated: boolean;
}

// Real submissions come from the API; start empty
const mockSubmissions: MockSubmission[] = [];

// ── Helpers ──

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const allFormNames = [...new Set(mockSubmissions.map((s) => s.formName))];

// ── Page ──

export default function SubmissionsPage() {
  const [search, setSearch] = useState("");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] =
    useState<MockSubmission | null>(null);

  const filtered = useMemo(() => {
    let result = mockSubmissions;

    if (formFilter !== "all") {
      result = result.filter((s) => s.formName === formFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        Object.values(s.data).some((v) => v.toLowerCase().includes(q)),
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [search, formFilter]);

  // Get all unique field names across filtered submissions for table columns
  const allFieldNames = useMemo(() => {
    const names = new Set<string>();
    filtered.forEach((s) => {
      Object.keys(s.data).forEach((key) => names.add(key));
    });
    // Prioritize common fields first
    const priority = ["Name", "Email", "Phone"];
    const sorted = [...names].sort((a, b) => {
      const aIdx = priority.indexOf(a);
      const bIdx = priority.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
    return sorted;
  }, [filtered]);

  // Show max 4 columns in the table, rest in detail view
  const visibleColumns = allFieldNames.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/forms"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Form Submissions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mockSubmissions.length} total submissions across all forms
            </p>
          </div>
        </div>
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "border border-border bg-background text-sm font-medium text-foreground",
            "hover:bg-muted transition-colors",
          )}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search submissions..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            <option value="all">All Forms</option>
            {allFormNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Form
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => setSelectedSubmission(sub)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <FileInput className="h-3 w-3" />
                      {sub.formName}
                    </span>
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-sm text-foreground max-w-[180px] truncate"
                    >
                      {sub.data[col] || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(sub.submittedAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubmission(sub);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <FileInput className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No submissions found
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? `No results matching "${search}"`
                : "No submissions have been received yet"}
            </p>
          </div>
        )}
      </div>

      {/* Submission detail slide-over */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setSelectedSubmission(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-card border-l border-border shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Submission Details
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedSubmission.formName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Meta info */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Submitted
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {formatDate(selectedSubmission.submittedAt)} at{" "}
                    {formatTime(selectedSubmission.submittedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Source</span>
                  <span className="text-xs font-medium text-foreground">
                    {selectedSubmission.source}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Contact Created
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      selectedSubmission.contactCreated
                        ? "text-success"
                        : "text-muted-foreground",
                    )}
                  >
                    {selectedSubmission.contactCreated ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* Field data */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Form Data
                </p>
                {Object.entries(selectedSubmission.data).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">
                        {key}
                      </p>
                      <p className="text-sm text-foreground">{value}</p>
                    </div>
                  ),
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  className={cn(
                    "flex w-full h-9 items-center justify-center gap-2 rounded-lg",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                  )}
                >
                  <User className="h-4 w-4" />
                  View Contact
                </button>
                <button
                  className={cn(
                    "flex w-full h-9 items-center justify-center gap-2 rounded-lg",
                    "border border-border bg-background text-sm font-medium text-foreground",
                    "hover:bg-muted transition-colors",
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
