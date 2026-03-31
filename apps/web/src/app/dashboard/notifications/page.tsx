"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CalendarCheck,
  Star,
  Settings,
  UserPlus,
  Check,
  ChevronRight,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useNotifications,
  useMarkAllRead,
  type Notification as ApiNotification,
} from "@/lib/hooks/use-notifications";
import { apiClient } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";

// ── Types ──

type NotificationType = "lead" | "appointment" | "review" | "system" | "ai";

interface Notification {
  id: string;
  type: NotificationType;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  href: string;
  actions?: { label: string; variant: "primary" | "secondary"; href?: string }[];
}

// ── Helpers ──

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_MAP: Record<string, NotificationType> = {
  lead: "lead",
  appointment: "appointment",
  review: "review",
  system: "system",
  ai: "ai",
};

function iconForType(type: NotificationType): {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
} {
  switch (type) {
    case "lead":
      return { icon: UserPlus, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" };
    case "appointment":
      return { icon: CalendarCheck, iconBg: "bg-green-500/10", iconColor: "text-green-500" };
    case "review":
      return { icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" };
    case "ai":
      return { icon: Settings, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" };
    case "system":
    default:
      return { icon: Bell, iconBg: "bg-gray-500/10", iconColor: "text-gray-500" };
  }
}

function mapApiNotification(n: ApiNotification): Notification {
  const type: NotificationType = TYPE_MAP[n.type] ?? "system";
  const { icon, iconBg, iconColor } = iconForType(type);
  const actions: Notification["actions"] = [];
  if (n.actionUrl) {
    actions.push({ label: "View", variant: "primary", href: n.actionUrl });
  }
  return {
    id: n.id,
    type,
    icon,
    iconBg,
    iconColor,
    title: n.title,
    description: n.description ?? "",
    time: relativeTime(n.createdAt),
    read: n.read,
    href: n.actionUrl ?? "/dashboard/notifications",
    actions: actions.length > 0 ? actions : undefined,
  };
}

// ── Tab Config ──

type TabKey = "all" | "unread" | "leads" | "appointments" | "reviews" | "system";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Bell },
  { key: "unread", label: "Unread", icon: BellOff },
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "appointments", label: "Appointments", icon: CalendarCheck },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "system", label: "System", icon: Settings },
];

// ── Component ──

export default function NotificationsPage() {
  usePageTitle("Notifications");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  // Fetch notifications from the real API
  const { data: apiNotifications, isLoading, refetch } = useNotifications();
  const { mutate: markAllReadMutate } = useMarkAllRead();

  // Map API data to UI shape
  const notifications = useMemo(
    () => (apiNotifications ?? []).map(mapApiNotification),
    [apiNotifications],
  );

  const filteredNotifications = useMemo(() => {
    let items = notifications;
    if (activeTab === "unread") {
      items = items.filter((n) => !n.read);
    } else if (activeTab === "leads") {
      items = items.filter((n) => n.type === "lead");
    } else if (activeTab === "appointments") {
      items = items.filter((n) => n.type === "appointment");
    } else if (activeTab === "reviews") {
      items = items.filter((n) => n.type === "review");
    } else if (activeTab === "system") {
      items = items.filter((n) => n.type === "system" || n.type === "ai");
    }
    return items;
  }, [activeTab, notifications]);

  const totalUnread = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const path = buildPath(`/orgs/:orgId/notifications/${id}/read`);
        if (!path) return;
        await apiClient.patch(path, {});
        refetch();
      } catch {
        // silently ignore — optimistic UI not needed here
      }
    },
    [refetch],
  );

  const markAllRead = useCallback(async () => {
    await markAllReadMutate(undefined as void);
    refetch();
  }, [markAllReadMutate, refetch]);

  const toggleRead = useCallback(
    async (id: string) => {
      const notif = notifications.find((n) => n.id === id);
      if (!notif) return;
      if (!notif.read) {
        await markAsRead(id);
      }
      // API only supports marking as read; toggling back to unread
      // is not supported by the backend, so we only mark-read.
    },
    [notifications, markAsRead],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {totalUnread > 0
                ? `${totalUnread} unread notification${totalUnread !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
          <Link
            href="/dashboard/activity"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Activity Feed
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? notifications.length
                : tab.key === "unread"
                  ? totalUnread
                  : notifications.filter((n) =>
                      tab.key === "system"
                        ? n.type === "system" || n.type === "ai"
                        : tab.key === "leads"
                          ? n.type === "lead"
                          : tab.key === "appointments"
                            ? n.type === "appointment"
                            : n.type === "review"
                    ).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="You'll see alerts for new leads, calls, and reviews here."
            className="py-20"
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "group relative flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30",
                  !notif.read && "bg-primary/[0.02]"
                )}
              >
                {/* Unread indicator */}
                {!notif.read && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    notif.iconBg
                  )}
                >
                  <notif.icon className={cn("h-5 w-5", notif.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={notif.href}
                        onClick={() => markAsRead(notif.id)}
                        className="group/link"
                      >
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            notif.read
                              ? "text-muted-foreground"
                              : "text-foreground font-medium"
                          )}
                        >
                          {notif.title}
                        </p>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                        {notif.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 mt-2">
                    {notif.actions?.map((action, i) => (
                      <Link
                        key={i}
                        href={action.href ?? notif.href}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          action.variant === "primary"
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        )}
                      >
                        {action.label}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    ))}
                    {/* Mark read/unread on hover */}
                    <button
                      onClick={() => toggleRead(notif.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      {notif.read ? (
                        <>
                          <BellOff className="h-3 w-3" />
                          Mark unread
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          Mark read
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
