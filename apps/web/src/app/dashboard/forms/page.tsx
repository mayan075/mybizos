"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  FileInput,
  MoreHorizontal,
  Globe,
  ExternalLink,
  MousePointerClick,
  Mail,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

// ── Types ──

interface MockSubmission {
  id: string;
  data: Record<string, string>;
  submittedAt: string;
  source: string;
}

interface MockForm {
  id: string;
  name: string;
  fieldCount: number;
  submissionCount: number;
  status: "active" | "inactive";
  embedType: "website" | "landing_page" | "popup" | "email_campaign";
  createdAt: string;
  lastSubmission: string | null;
  recentSubmissions: MockSubmission[];
}

const embedTypeConfig: Record<
  MockForm["embedType"],
  { label: string; icon: React.ElementType; className: string }
> = {
  website: {
    label: "Website Embed",
    icon: Globe,
    className: "bg-primary/10 text-primary",
  },
  landing_page: {
    label: "Landing Page",
    icon: ExternalLink,
    className: "bg-info/10 text-info",
  },
  popup: {
    label: "Popup",
    icon: MousePointerClick,
    className: "bg-warning/10 text-warning",
  },
  email_campaign: {
    label: "Email Campaign",
    icon: Mail,
    className: "bg-success/10 text-success",
  },
};

// Real forms will come from the API; start with empty array
const mockForms: MockForm[] = [];

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

function EmbedTypeBadge({ type }: { type: MockForm["embedType"] }) {
  const cfg = embedTypeConfig[type];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Page ──

export default function FormsPage() {
  usePageTitle("Forms");
  const [search, setSearch] = useState("");
  const [expandedForm, setExpandedForm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return mockForms;
    const q = search.toLowerCase();
    return mockForms.filter((f) => f.name.toLowerCase().includes(q));
  }, [search]);

  const totalSubmissions = mockForms.reduce(
    (sum, f) => sum + f.submissionCount,
    0,
  );
  const activeForms = mockForms.filter((f) => f.status === "active").length;

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
            {mockForms.length}
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
        {filtered.map((form) => {
          const isExpanded = expandedForm === form.id;
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
                      <EmbedTypeBadge type={form.embedType} />
                      <StatusBadge status={form.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <FileInput className="h-3 w-3" />
                        {form.fieldCount} fields
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(form.createdAt)}
                      </span>
                      {form.lastSubmission && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last submission{" "}
                          {formatRelativeTime(form.lastSubmission)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 ml-6 shrink-0">
                    <button
                      onClick={() =>
                        setExpandedForm(isExpanded ? null : form.id)
                      }
                      className="text-center group cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Eye className="h-3 w-3" />
                        Submissions
                      </div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {form.submissionCount.toLocaleString()}
                      </p>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setExpandedForm(isExpanded ? null : form.id)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title={
                          isExpanded
                            ? "Hide submissions"
                            : "Show recent submissions"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
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

              {/* Expandable submissions panel */}
              {isExpanded && form.recentSubmissions.length > 0 && (
                <div className="border-t border-border bg-muted/30">
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Submissions
                      </p>
                      <Link
                        href="/dashboard/forms/submissions"
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {form.recentSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {sub.data["Name"] || "Anonymous"}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {sub.data["Email"] && (
                                  <span className="truncate">
                                    {sub.data["Email"]}
                                  </span>
                                )}
                                {sub.data["Phone"] && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {sub.data["Phone"]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(sub.submittedAt)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              via {sub.source}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
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
