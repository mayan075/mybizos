"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  FileInput,
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useForms, type Form } from "@/lib/hooks/use-forms";

// ── Helpers ──

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "active"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active" ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

// ── Page ──

export default function FormsPage() {
  usePageTitle("Forms");
  const [search, setSearch] = useState("");
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const { data: formsData, isLoading } = useForms({ search });

  const forms = useMemo(() => {
    if (!Array.isArray(formsData)) return [];
    return formsData;
  }, [formsData]);

  const totalSubmissions = forms.reduce(
    (sum, f) => sum + (f.submissionCount ?? 0),
    0,
  );
  const activeForms = forms.filter((f) => f.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build lead capture forms and track submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/forms/submissions"
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4",
              "border border-border bg-background text-sm font-medium text-foreground",
              "hover:bg-muted transition-colors",
            )}
          >
            <Eye className="h-4 w-4" />
            All Submissions
          </Link>
          <Link
            href="/dashboard/forms/new"
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4",
              "bg-primary text-primary-foreground text-sm font-medium",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            <Plus className="h-4 w-4" />
            Create Form
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total Forms
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {forms.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Active Forms
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {activeForms}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total Submissions
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {totalSubmissions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Form cards */}
      <div className="grid gap-4">
        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-muted-foreground animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading forms...</p>
          </div>
        )}

        {!isLoading && forms.map((form) => {
          const isExpanded = expandedForm === form.id;
          const fields = Array.isArray(form.fields) ? form.fields : [];
          return (
            <div
              key={form.id}
              className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm"
            >
              {/* Card main content */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Link
                        href={`/dashboard/forms/${form.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {form.name}
                      </Link>
                      <StatusBadge status={form.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <FileInput className="h-3 w-3" />
                        {fields.length} fields
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(form.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 ml-6 shrink-0">
                    <Link
                      href={`/dashboard/forms/submissions?formId=${form.id}`}
                      className="text-center group"
                    >
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Eye className="h-3 w-3" />
                        Submissions
                      </div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {(form.submissionCount ?? 0).toLocaleString()}
                      </p>
                    </Link>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/forms/${form.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Edit form"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && forms.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <FileInput className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No forms found
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search
                ? `No results matching "${search}"`
                : "No forms yet. Create a lead capture form for your website."}
            </p>
            <Link
              href="/dashboard/forms/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Form
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
