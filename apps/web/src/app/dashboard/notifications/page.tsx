"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Phone,
  CalendarCheck,
  Star,
  AlertTriangle,
  Bot,
  UserPlus,
  DollarSign,
  Mail,
  MessageSquare,
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  CreditCard,
  TrendingUp,
  Check,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ── Mock Notifications ──

const MOCK_NOTIFICATIONS: Notification[] = [
  // Leads
  {
    id: "n1",
    type: "lead",
    icon: UserPlus,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "New lead: Sarah Johnson",
    description: "Submitted a quote request for drain cleaning via website form",
    time: "5 min ago",
    read: false,
    href: "/dashboard/contacts/c1",
    actions: [{ label: "View Contact", variant: "primary", href: "/dashboard/contacts/c1" }],
  },
  {
    id: "n2",
    type: "lead",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "AI qualified lead: Mike Thompson",
    description: "Needs water heater replacement, budget $3,000. Scored 87/100 by AI.",
    time: "23 min ago",
    read: false,
    href: "/dashboard/contacts/c2",
    actions: [
      { label: "View Lead", variant: "primary", href: "/dashboard/contacts/c2" },
      { label: "Assign Tech", variant: "secondary" },
    ],
  },
  {
    id: "n3",
    type: "lead",
    icon: Flame,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    title: "Hot lead alert: David Wilson",
    description: "Visited pricing page 3 times in the last hour. High intent detected.",
    time: "1 hour ago",
    read: false,
    href: "/dashboard/contacts/c3",
    actions: [{ label: "Call Now", variant: "primary" }],
  },
  {
    id: "n4",
    type: "lead",
    icon: Zap,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Speed to lead: AI responded to Jennifer Brown",
    description: "AI answered quote request in 4 seconds. Industry avg is 47 minutes.",
    time: "2 hours ago",
    read: false,
    href: "/dashboard/contacts/c4",
  },
  {
    id: "n5",
    type: "lead",
    icon: Phone,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Missed call from (704) 555-8821",
    description: "Caller left voicemail about kitchen faucet leak. AI transcribed.",
    time: "2.5 hours ago",
    read: true,
    href: "/dashboard/inbox",
    actions: [{ label: "Listen", variant: "primary" }, { label: "Call Back", variant: "secondary" }],
  },
  {
    id: "n6",
    type: "lead",
    icon: MessageSquare,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "New SMS from Chris Rodriguez",
    description: '"Hey, can someone come look at my furnace today? It\'s making a weird noise."',
    time: "3 hours ago",
    read: true,
    href: "/dashboard/inbox",
  },
  // Appointments
  {
    id: "n7",
    type: "appointment",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "AI booked: Tom Anderson",
    description: "AC Tune-Up scheduled for Tomorrow at 10:00 AM. Confirmed via SMS.",
    time: "15 min ago",
    read: false,
    href: "/dashboard/scheduling",
    actions: [{ label: "View Appointment", variant: "primary", href: "/dashboard/scheduling" }],
  },
  {
    id: "n8",
    type: "appointment",
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    title: "Reminder: Lisa Martinez",
    description: "Furnace Repair appointment today at 2:00 PM. 123 Elm Street.",
    time: "30 min ago",
    read: false,
    href: "/dashboard/scheduling",
    actions: [{ label: "Get Directions", variant: "secondary" }],
  },
  {
    id: "n9",
    type: "appointment",
    icon: XCircle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    title: "No-show: Robert Lee",
    description: "Missed 9:00 AM appointment for AC Installation. Auto-follow-up SMS sent.",
    time: "3 hours ago",
    read: false,
    href: "/dashboard/contacts/c5",
    actions: [{ label: "Reschedule", variant: "primary" }, { label: "Call", variant: "secondary" }],
  },
  {
    id: "n10",
    type: "appointment",
    icon: CalendarCheck,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Rescheduled: Amy Chen",
    description: "Moved plumbing inspection from Wednesday to Friday 11:00 AM.",
    time: "4 hours ago",
    read: true,
    href: "/dashboard/scheduling",
  },
  {
    id: "n11",
    type: "appointment",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Appointment completed: Kevin Park",
    description: "Tyler finished emergency plumbing repair at 456 Pine Ave. Job took 1.5 hours.",
    time: "5 hours ago",
    read: true,
    href: "/dashboard/contacts/c6",
  },
  // Reviews
  {
    id: "n12",
    type: "review",
    icon: Star,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    title: "New 5-star Google review!",
    description: 'Sarah Johnson: "Absolutely outstanding service! Dave came out within 2 hours..."',
    time: "1 hour ago",
    read: false,
    href: "/dashboard/reviews",
    actions: [{ label: "View Review", variant: "primary", href: "/dashboard/reviews" }],
  },
  {
    id: "n13",
    type: "review",
    icon: AlertTriangle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    title: "New 2-star review needs response",
    description: 'Tom Anderson on Google: "Technician was late and didn\'t explain the charges..."',
    time: "2 hours ago",
    read: false,
    href: "/dashboard/reviews",
    actions: [
      { label: "View Review", variant: "primary", href: "/dashboard/reviews" },
      { label: "Approve AI Response", variant: "secondary" },
    ],
  },
  {
    id: "n14",
    type: "review",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "AI drafted a review response",
    description: "Response to Tom Anderson's 2-star review is ready for your approval.",
    time: "2 hours ago",
    read: false,
    href: "/dashboard/reviews",
    actions: [{ label: "Approve Response", variant: "primary" }],
  },
  {
    id: "n15",
    type: "review",
    icon: Star,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    title: "New 4-star Facebook review",
    description: 'Maria Gonzalez: "Good service, professional team. A bit pricey though."',
    time: "6 hours ago",
    read: true,
    href: "/dashboard/reviews",
  },
  // System
  {
    id: "n16",
    type: "system",
    icon: Phone,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    title: "AI Phone Agent: Daily Summary",
    description: "Answered 47 calls today. 32 qualified leads, 15 booked appointments, 0 escalations.",
    time: "Today, 6:00 PM",
    read: false,
    href: "/dashboard/analytics",
  },
  {
    id: "n17",
    type: "system",
    icon: Send,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Campaign sent: Spring AC Special",
    description: "Sent to 234 contacts via SMS. Open rate: 78%. 12 appointments booked so far.",
    time: "6 hours ago",
    read: true,
    href: "/dashboard/campaigns",
  },
  {
    id: "n18",
    type: "system",
    icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    title: "Invoice INV-003 is 12 days overdue",
    description: "Auto-reminder sent to Robert Lee. Amount: $1,850 for AC Installation.",
    time: "8 hours ago",
    read: true,
    href: "/dashboard/invoices",
    actions: [{ label: "View Invoice", variant: "primary", href: "/dashboard/invoices" }, { label: "Send Reminder", variant: "secondary" }],
  },
  {
    id: "n19",
    type: "system",
    icon: CreditCard,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Payment received: $3,200",
    description: "Stripe payment from Mike Thompson for water heater replacement (INV-007).",
    time: "1 day ago",
    read: true,
    href: "/dashboard/invoices",
  },
  {
    id: "n20",
    type: "system",
    icon: Mail,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "Email delivery report",
    description: "42 of 45 emails delivered. 3 bounced (invalid addresses flagged).",
    time: "1 day ago",
    read: true,
    href: "/dashboard/campaigns",
  },
  // AI Performance
  {
    id: "n21",
    type: "ai",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "Your AI saved you 4.2 hours today",
    description: "Handled 23 phone calls, 45 SMS conversations, and booked 15 appointments automatically.",
    time: "Today, 7:00 PM",
    read: false,
    href: "/dashboard/analytics",
  },
  {
    id: "n22",
    type: "ai",
    icon: TrendingUp,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "AI booking rate improved 12% this week",
    description: "Conversion from call to booked appointment went from 42% to 54%. New record!",
    time: "Weekly insight",
    read: false,
    href: "/dashboard/analytics",
  },
  {
    id: "n23",
    type: "ai",
    icon: Zap,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    title: "Speed to lead benchmark: Top 1%",
    description: "Your average response time of 6 seconds puts you in the top 1% nationally.",
    time: "Weekly insight",
    read: true,
    href: "/dashboard/analytics",
  },
  {
    id: "n24",
    type: "system",
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Revenue milestone: $50K this month",
    description: "You've crossed $50,000 in revenue this month. 18% ahead of last month!",
    time: "2 days ago",
    read: true,
    href: "/dashboard/analytics",
  },
];

// ── Component ──

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(MOCK_NOTIFICATIONS.filter((n) => n.read).map((n) => n.id))
  );

  const filteredNotifications = useMemo(() => {
    let items = MOCK_NOTIFICATIONS.map((n) => ({
      ...n,
      read: readIds.has(n.id),
    }));
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
  }, [activeTab, readIds]);

  const totalUnread = MOCK_NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  function markAsRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadIds(new Set(MOCK_NOTIFICATIONS.map((n) => n.id)));
  }

  function toggleRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
                ? MOCK_NOTIFICATIONS.length
                : tab.key === "unread"
                  ? totalUnread
                  : MOCK_NOTIFICATIONS.filter((n) =>
                      tab.key === "system"
                        ? n.type === "system" || n.type === "ai"
                        : n.type === tab.key
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
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "unread"
                ? "You're all caught up! No unread notifications."
                : "No notifications in this category yet."}
            </p>
          </div>
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
