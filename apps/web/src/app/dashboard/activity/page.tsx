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
  Star,
  Wrench,
  Filter,
  ChevronDown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiQuery } from "@/lib/hooks/use-api";

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

// ── API response type ──

interface ApiActivity {
  id: string;
  orgId: string;
  contactId: string | null;
  type: string;
  title: string;
  description: string | null;
  performedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  contactName: string | null;
}

// ── Mapping helpers ──

const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  call: "call",
  email: "email",
  sms: "sms",
  deal: "deal",
  appointment: "appointment",
  invoice: "invoice",
  review: "review",
  lead: "lead",
  system: "system",
};

const ICON_MAP: Record<ActivityType, { icon: React.ElementType; bg: string; color: string }> = {
  call: { icon: Phone, bg: "bg-blue-500/10", color: "text-blue-600" },
  email: { icon: Mail, bg: "bg-indigo-500/10", color: "text-indigo-600" },
  sms: { icon: MessageSquare, bg: "bg-green-500/10", color: "text-green-600" },
  deal: { icon: DollarSign, bg: "bg-amber-500/10", color: "text-amber-600" },
  appointment: { icon: CalendarCheck, bg: "bg-purple-500/10", color: "text-purple-600" },
  invoice: { icon: Receipt, bg: "bg-emerald-500/10", color: "text-emerald-600" },
  review: { icon: Star, bg: "bg-yellow-500/10", color: "text-yellow-600" },
  lead: { icon: UserPlus, bg: "bg-pink-500/10", color: "text-pink-600" },
  system: { icon: Wrench, bg: "bg-gray-500/10", color: "text-gray-600" },
};

const ACTOR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getActorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ACTOR_COLORS[Math.abs(hash) % ACTOR_COLORS.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getTimeGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (activityDate.getTime() === today.getTime()) return "Today";
  if (activityDate.getTime() === yesterday.getTime()) return "Yesterday";
  const diffDays = Math.floor((today.getTime() - activityDate.getTime()) / 86400000);
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Older";
}

function mapApiActivity(api: ApiActivity): ActivityEntry {
  const type = ACTIVITY_TYPE_MAP[api.type] ?? "system";
  const iconConfig = ICON_MAP[type];
  const isAI = api.performedBy?.toLowerCase().includes("ai") ?? false;
  const actorName = api.performedBy ?? "System";

  return {
    id: api.id,
    type,
    actor: {
      name: actorName,
      initials: isAI ? "AI" : getInitials(actorName),
      type: isAI ? "ai" : "human",
      color: isAI ? "bg-purple-500" : getActorColor(actorName),
    },
    icon: iconConfig.icon,
    iconBg: iconConfig.bg,
    iconColor: iconConfig.color,
    action: api.title,
    detail: api.description ?? (api.contactName ? `Contact: ${api.contactName}` : ""),
    time: formatTime(api.createdAt),
    timeGroup: getTimeGroup(api.createdAt),
    href: api.contactId ? `/dashboard/contacts/${api.contactId}` : undefined,
  };
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

  // Fetch activities from the API
  const { data: activitiesData, isLoading } = useApiQuery<ApiActivity[]>("/orgs/:orgId/activities", []);

  // Map API data to the UI format
  const activities: ActivityEntry[] = useMemo(() => {
    const raw = Array.isArray(activitiesData) ? activitiesData : [];
    return raw.map(mapApiActivity);
  }, [activitiesData]);

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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActivities.length === 0 ? (
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
