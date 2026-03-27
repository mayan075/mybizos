"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Zap,
  Play,
  Pause,
  MessageSquare,
  Mail,
  Clock,
  UserPlus,
  CalendarX,
  Star,
  Cake,
  AlertTriangle,
  ChevronRight,
  Activity,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useSequences, type Sequence } from "@/lib/hooks/use-sequences";

// ── Types ──

/** Shape used by the UI cards — derived from Sequence API data */
interface AutomationView {
  id: string;
  name: string;
  description: string;
  triggerDescription: string;
  stepCount: number;
  active: boolean;
  runCount: number;
  lastRun: string | null;
  category: "lead" | "follow-up" | "review" | "outreach" | "alert";
  icon: React.ElementType;
  steps: string[];
}

// ── Helpers ──

type TabFilter = "all" | "active" | "inactive";

const categoryColors: Record<AutomationView["category"], string> = {
  lead: "bg-emerald-500/10 text-emerald-600",
  "follow-up": "bg-purple-500/10 text-purple-600",
  review: "bg-amber-500/10 text-amber-600",
  outreach: "bg-pink-500/10 text-pink-600",
  alert: "bg-red-500/10 text-red-600",
};

const triggerTypeLabels: Record<string, string> = {
  manual: "Triggered manually",
  tag_added: "When a tag is added",
  deal_stage_changed: "When deal stage changes",
  form_submitted: "When a form is submitted",
  appointment_completed: "When an appointment completes",
  contact_created: "When a new contact is created",
};

const stepTypeLabels: Record<string, string> = {
  send_email: "Send Email",
  send_sms: "Send SMS",
  wait: "Wait",
  add_tag: "Add Tag",
  remove_tag: "Remove Tag",
  ai_decision: "AI Decision",
};

/** Infer a UI category from the sequence trigger type */
function inferCategory(seq: Sequence): AutomationView["category"] {
  if (seq.triggerType === "contact_created" || seq.triggerType === "form_submitted") return "lead";
  if (seq.triggerType === "deal_stage_changed") return "follow-up";
  if (seq.triggerType === "appointment_completed") return "review";
  if (seq.triggerType === "tag_added") return "outreach";
  return "lead";
}

/** Infer an icon from the category */
function inferIcon(category: AutomationView["category"]): React.ElementType {
  switch (category) {
    case "lead": return UserPlus;
    case "follow-up": return Mail;
    case "review": return Star;
    case "outreach": return MessageSquare;
    case "alert": return AlertTriangle;
  }
}

/** Convert a Sequence from the API into our UI view model */
function toAutomationView(seq: Sequence): AutomationView {
  const category = inferCategory(seq);
  return {
    id: seq.id,
    name: seq.name,
    description: seq.description ?? "",
    triggerDescription: triggerTypeLabels[seq.triggerType] ?? seq.triggerType,
    stepCount: seq.steps.length,
    active: seq.isActive,
    runCount: seq.enrolledCount,
    lastRun: seq.updatedAt,
    category,
    icon: inferIcon(category),
    steps: seq.steps.map((s) => stepTypeLabels[s.type] ?? s.type),
  };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Page ──

export default function AutomationsPage() {
  usePageTitle("Automations");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const { data: sequencesData, isLoading } = useSequences();
  const sequences = Array.isArray(sequencesData) ? sequencesData : [];

  const automations = useMemo(
    () => sequences.map(toAutomationView),
    [sequences],
  );

  // Local toggle state for optimistic UI (real toggle would call activate/deactivate mutation)
  const [toggleOverrides, setToggleOverrides] = useState<Record<string, boolean>>({});

  const automationsWithOverrides = useMemo(
    () =>
      automations.map((a) =>
        toggleOverrides[a.id] !== undefined
          ? { ...a, active: toggleOverrides[a.id] }
          : a,
      ),
    [automations, toggleOverrides],
  );

  const filtered = useMemo(() => {
    let result = automationsWithOverrides;

    if (activeTab === "active") {
      result = result.filter((a) => a.active);
    } else if (activeTab === "inactive") {
      result = result.filter((a) => !a.active);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.triggerDescription.toLowerCase().includes(q),
      );
    }

    return result;
  }, [search, activeTab, automationsWithOverrides]);

  const tabCounts = useMemo(() => {
    return {
      all: automationsWithOverrides.length,
      active: automationsWithOverrides.filter((a) => a.active).length,
      inactive: automationsWithOverrides.filter((a) => !a.active).length,
    };
  }, [automationsWithOverrides]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "active", label: "Active", count: tabCounts.active },
    { key: "inactive", label: "Inactive", count: tabCounts.inactive },
  ];

  function handleToggle(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setToggleOverrides((prev) => {
      const current = prev[id] ?? automations.find((a) => a.id === id)?.active ?? false;
      return { ...prev, [id]: !current };
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build workflows that run your business on autopilot
          </p>
        </div>
        <Link
          href="/dashboard/automations/new"
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Create Automation
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Enrolled</p>
              <p className="text-lg font-bold text-foreground">
                {automationsWithOverrides
                  .reduce((sum, a) => sum + a.runCount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Active Automations
              </p>
              <p className="text-lg font-bold text-foreground">
                {tabCounts.active}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Triggered</p>
              <p className="text-lg font-bold text-foreground">
                {automationsWithOverrides.some((a) => a.lastRun)
                  ? formatRelativeDate(
                      automationsWithOverrides
                        .filter((a) => a.lastRun)
                        .sort(
                          (a, b) =>
                            new Date(b.lastRun!).getTime() -
                            new Date(a.lastRun!).getTime(),
                        )[0]!.lastRun!,
                    )
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search automations..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Automation cards */}
      <div className="grid gap-4">
        {filtered.map((automation) => {
          const Icon = automation.icon;
          return (
            <Link
              key={automation.id}
              href={`/dashboard/automations/${automation.id}`}
              className="group block rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-stretch">
                {/* Left accent bar */}
                <div
                  className={cn(
                    "w-1 shrink-0 rounded-l-xl transition-colors",
                    automation.active ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )}
                />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            categoryColors[automation.category],
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {automation.name}
                            </h3>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                automation.active
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {automation.active ? (
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                              ) : null}
                              {automation.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {automation.triggerDescription}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 line-clamp-1">
                        {automation.description}
                      </p>

                      {/* Steps preview */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {automation.steps.slice(0, 4).map((step, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                              {i + 1}
                            </span>
                            <span className="truncate max-w-[120px]">
                              {step.replace(/^(Trigger|Action|Wait|Send|If|AI Decision): ?/, "")}
                            </span>
                          </span>
                        ))}
                        {automation.steps.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{automation.steps.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: stats + toggle */}
                    <div className="flex items-center gap-5 ml-6 shrink-0">
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Steps</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {automation.stepCount}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Enrolled</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {automation.runCount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-muted-foreground">
                            Last run
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {automation.lastRun
                              ? formatRelativeDate(automation.lastRun)
                              : "Never"}
                          </p>
                        </div>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={(e) => handleToggle(automation.id, e)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                          automation.active ? "bg-emerald-500" : "bg-muted",
                        )}
                        role="switch"
                        aria-checked={automation.active}
                        title={
                          automation.active
                            ? "Deactivate automation"
                            : "Activate automation"
                        }
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                            automation.active
                              ? "translate-x-5"
                              : "translate-x-0",
                          )}
                        />
                      </button>

                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Zap className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No automations found
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search
                ? `No results matching "${search}"`
                : "No automations yet. Create workflows to automate your business."}
            </p>
            <Link
              href="/dashboard/automations/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Automation
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
