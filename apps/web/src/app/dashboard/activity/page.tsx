"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  CalendarCheck,
  Receipt,
  Bot,
  UserPlus,
  FileText,
  Star,
  Send,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Filter,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";

// ── Types ──

type ActivityType = "call" | "email" | "sms" | "deal" | "appointment" | "invoice" | "review" | "lead" | "system";
type ActorType = "human" | "ai";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  actor: {
    name: string;
    initials: string;
    type: ActorType;
    color: string;
  };
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  action: string;
  detail: string;
  time: string;
  timeGroup: string;
  href?: string;
}

// ── Filter Config ──

const USER_FILTERS = [
  { key: "all", label: "All Users" },
];

const TYPE_FILTERS = [
  { key: "all", label: "All Types" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
  { key: "sms", label: "SMS" },
  { key: "deal", label: "Deals" },
  { key: "appointment", label: "Appointments" },
  { key: "invoice", label: "Invoices" },
  { key: "review", label: "Reviews" },
  { key: "lead", label: "Leads" },
];

// ── Component ──

export default function ActivityPage() {
  usePageTitle("Activity");
  const [userFilter, setUserFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Real activity data will come from the API; start with empty array
  const activities: ActivityEntry[] = [];

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const matchesUser =
        userFilter === "all" ||
        (userFilter === "ai" && a.actor.type === "ai") ||
        a.actor.name.toLowerCase().includes(userFilter);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesUser && matchesType;
    });
  }, [userFilter, typeFilter, activities]);

  // Group by time
  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityEntry[] }[] = [];
    let currentGroup = "";
    for (const item of filteredActivities) {
      if (item.timeGroup !== currentGroup) {
        currentGroup = item.timeGroup;
        groups.push({ label: currentGroup, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [filteredActivities]);

  const selectedUserLabel = USER_FILTERS.find((f) => f.key === userFilter)?.label ?? "All Users";
  const selectedTypeLabel = TYPE_FILTERS.find((f) => f.key === typeFilter)?.label ?? "All Types";

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Activity Feed</h1>
            <p className="text-sm text-muted-foreground">
              {filteredActivities.length} activities
              {userFilter !== "all" || typeFilter !== "all" ? " (filtered)" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/notifications"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            Notifications
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-6 py-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filter by:</span>

        {/* User filter */}
        <div className="relative">
          <button
            onClick={() => { setShowUserDropdown(!showUserDropdown); setShowTypeDropdown(false); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
              userFilter !== "all" && "border-primary/50 bg-primary/5 text-primary"
            )}
          >
            {selectedUserLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showUserDropdown && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover shadow-xl z-50">
              <div className="p-1">
                {USER_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setUserFilter(f.key); setShowUserDropdown(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      userFilter === f.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Type filter */}
        <div className="relative">
          <button
            onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowUserDropdown(false); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
              typeFilter !== "all" && "border-primary/50 bg-primary/5 text-primary"
            )}
          >
            {selectedTypeLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showTypeDropdown && (
            <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border border-border bg-popover shadow-xl z-50">
              <div className="p-1">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setTypeFilter(f.key); setShowTypeDropdown(false); }}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                      typeFilter === f.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(userFilter !== "all" || typeFilter !== "all") && (
          <button
            onClick={() => { setUserFilter("all"); setTypeFilter("all"); }}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Your team's actions will appear here as you use the platform."
            className="py-20"
          />
        ) : (
          <div className="px-6 py-4">
            {grouped.map((group) => (
              <div key={group.label} className="mb-8 last:mb-0">
                {/* Time group header */}
                <div className="sticky top-0 z-10 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative ml-5">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                  {group.items.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      {/* Avatar */}
                      <div className="relative z-10">
                        {entry.actor.type === "ai" ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-[11px] font-bold text-white ring-4 ring-background">
                            <Bot className="h-5 w-5" />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-white ring-4 ring-background",
                              entry.actor.color
                            )}
                          >
                            {entry.actor.initials}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground leading-snug">
                              <span className="font-semibold">{entry.actor.name}</span>
                              {" "}
                              <span className="text-muted-foreground">{entry.action}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                              {entry.detail}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                            {entry.time}
                          </span>
                        </div>
                        {entry.href && (
                          <Link
                            href={entry.href}
                            className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            View details
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
