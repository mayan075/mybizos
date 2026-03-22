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

// ── Team Members ──

const TEAM = {
  jim: { name: "Jim Smith", initials: "JS", type: "human" as ActorType, color: "bg-blue-500" },
  maria: { name: "Maria Garcia", initials: "MG", type: "human" as ActorType, color: "bg-pink-500" },
  dave: { name: "Dave Wilson", initials: "DW", type: "human" as ActorType, color: "bg-emerald-500" },
  tyler: { name: "Tyler Brown", initials: "TB", type: "human" as ActorType, color: "bg-orange-500" },
  ai: { name: "AI Agent", initials: "AI", type: "ai" as ActorType, color: "bg-purple-500" },
};

// ── Filter Config ──

const USER_FILTERS = [
  { key: "all", label: "All Users" },
  { key: "jim", label: "Jim Smith" },
  { key: "maria", label: "Maria Garcia" },
  { key: "dave", label: "Dave Wilson" },
  { key: "tyler", label: "Tyler Brown" },
  { key: "ai", label: "AI Agent" },
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

// ── Mock Activity Feed ──

const MOCK_ACTIVITIES: ActivityEntry[] = [
  // Today
  {
    id: "a1",
    type: "call",
    actor: TEAM.ai,
    icon: Phone,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "answered call from (704) 555-1234",
    detail: "Qualified lead for water heater replacement. Booked appointment for Thursday.",
    time: "2 min ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a2",
    type: "deal",
    actor: TEAM.jim,
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "created deal: Water Heater Install for $3,200",
    detail: "Customer: Mike Thompson. Stage: Proposal Sent.",
    time: "8 min ago",
    timeGroup: "Today",
    href: "/dashboard/pipeline",
  },
  {
    id: "a3",
    type: "sms",
    actor: TEAM.ai,
    icon: MessageSquare,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "sent appointment confirmation to Tom Anderson",
    detail: "AC Tune-Up, Tomorrow 10:00 AM. Customer replied: \"See you then!\"",
    time: "15 min ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a4",
    type: "lead",
    actor: TEAM.ai,
    icon: UserPlus,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "captured new lead: Sarah Johnson",
    detail: "Source: Website form. Service: Drain cleaning. AI score: 72/100.",
    time: "22 min ago",
    timeGroup: "Today",
    href: "/dashboard/contacts/c1",
  },
  {
    id: "a5",
    type: "call",
    actor: TEAM.ai,
    icon: Phone,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "answered call from (704) 555-8821",
    detail: "Caller asked about pricing for AC installation. AI provided range of $3,500-$6,000.",
    time: "35 min ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a6",
    type: "appointment",
    actor: TEAM.dave,
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "completed appointment: Furnace Repair",
    detail: "Customer: Lisa Martinez. 123 Elm Street. Duration: 2 hours.",
    time: "45 min ago",
    timeGroup: "Today",
    href: "/dashboard/scheduling",
  },
  {
    id: "a7",
    type: "review",
    actor: TEAM.ai,
    icon: Star,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    action: "drafted response to Tom Anderson's 2-star review",
    detail: "Apologetic tone, offers to make it right. Awaiting Jim's approval.",
    time: "1 hr ago",
    timeGroup: "Today",
    href: "/dashboard/reviews",
  },
  {
    id: "a8",
    type: "invoice",
    actor: TEAM.maria,
    icon: Receipt,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "sent invoice INV-006 to Lisa Martinez",
    detail: "Amount: $425 for furnace repair. Payment link included.",
    time: "1.5 hr ago",
    timeGroup: "Today",
    href: "/dashboard/invoices",
  },
  {
    id: "a9",
    type: "call",
    actor: TEAM.ai,
    icon: Phone,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "answered call from (704) 555-3456",
    detail: "Emergency plumbing request. Dispatched Tyler to 789 Maple Dr.",
    time: "2 hr ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a10",
    type: "appointment",
    actor: TEAM.tyler,
    icon: Wrench,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    action: "completed appointment: Emergency Plumbing",
    detail: "Customer: Kevin Park. 456 Pine Ave. Burst pipe repair. Job took 1.5 hours.",
    time: "2.5 hr ago",
    timeGroup: "Today",
    href: "/dashboard/scheduling",
  },
  {
    id: "a11",
    type: "email",
    actor: TEAM.maria,
    icon: Mail,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "sent follow-up email to Jennifer Brown",
    detail: "Re: Drain cleaning estimate. Attached PDF quote for $350.",
    time: "3 hr ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a12",
    type: "sms",
    actor: TEAM.ai,
    icon: MessageSquare,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "sent no-show follow-up to Robert Lee",
    detail: "Missed 9:00 AM appointment. Offered to reschedule for this week.",
    time: "3 hr ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  {
    id: "a13",
    type: "deal",
    actor: TEAM.jim,
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "moved deal to Won: AC Replacement for Chen family",
    detail: "Deal value: $5,800. Signed contract uploaded.",
    time: "4 hr ago",
    timeGroup: "Today",
    href: "/dashboard/pipeline",
  },
  {
    id: "a14",
    type: "appointment",
    actor: TEAM.ai,
    icon: CalendarCheck,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "rescheduled Amy Chen to Friday 11:00 AM",
    detail: "Customer requested via SMS. Plumbing inspection moved from Wednesday.",
    time: "4 hr ago",
    timeGroup: "Today",
    href: "/dashboard/scheduling",
  },
  {
    id: "a15",
    type: "call",
    actor: TEAM.ai,
    icon: Phone,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "answered call from (704) 555-7890",
    detail: "Routine AC maintenance inquiry. Booked for next Monday at 9 AM.",
    time: "5 hr ago",
    timeGroup: "Today",
    href: "/dashboard/inbox",
  },
  // Yesterday
  {
    id: "a16",
    type: "invoice",
    actor: TEAM.maria,
    icon: CreditCard,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "received payment of $3,200 from Mike Thompson",
    detail: "Invoice INV-007 for water heater replacement. Paid via Stripe.",
    time: "Yesterday, 4:30 PM",
    timeGroup: "Yesterday",
    href: "/dashboard/invoices",
  },
  {
    id: "a17",
    type: "email",
    actor: TEAM.jim,
    icon: Send,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "sent Spring AC Special campaign",
    detail: "Sent to 234 contacts via SMS + email. Estimated reach: 89% open rate.",
    time: "Yesterday, 2:00 PM",
    timeGroup: "Yesterday",
    href: "/dashboard/campaigns",
  },
  {
    id: "a18",
    type: "call",
    actor: TEAM.ai,
    icon: Phone,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "handled 52 calls throughout the day",
    detail: "35 qualified leads, 17 booked appointments, 0 escalations needed.",
    time: "Yesterday, 6:00 PM",
    timeGroup: "Yesterday",
    href: "/dashboard/analytics",
  },
  {
    id: "a19",
    type: "deal",
    actor: TEAM.dave,
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "created deal: Furnace Installation for $4,500",
    detail: "Customer: Rachel Kim. Stage: Qualified.",
    time: "Yesterday, 11:30 AM",
    timeGroup: "Yesterday",
    href: "/dashboard/pipeline",
  },
  {
    id: "a20",
    type: "appointment",
    actor: TEAM.tyler,
    icon: Wrench,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    action: "completed 4 appointments",
    detail: "2 HVAC tune-ups, 1 plumbing repair, 1 drain cleaning. All jobs completed on time.",
    time: "Yesterday, 5:00 PM",
    timeGroup: "Yesterday",
    href: "/dashboard/scheduling",
  },
  {
    id: "a21",
    type: "review",
    actor: TEAM.jim,
    icon: Star,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    action: "replied to Sarah Johnson's 5-star Google review",
    detail: "Thanked her for the kind words and mentioned Dave by name.",
    time: "Yesterday, 10:15 AM",
    timeGroup: "Yesterday",
    href: "/dashboard/reviews",
  },
  {
    id: "a22",
    type: "sms",
    actor: TEAM.ai,
    icon: MessageSquare,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "sent 18 appointment reminders",
    detail: "24-hour reminders for tomorrow's appointments. 16 confirmed, 2 pending.",
    time: "Yesterday, 9:00 AM",
    timeGroup: "Yesterday",
    href: "/dashboard/inbox",
  },
  {
    id: "a23",
    type: "lead",
    actor: TEAM.ai,
    icon: UserPlus,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "captured 8 new leads from website",
    detail: "3 from contact form, 2 from chat widget, 3 from phone calls.",
    time: "Yesterday, 8:00 AM",
    timeGroup: "Yesterday",
  },
  // This Week
  {
    id: "a24",
    type: "deal",
    actor: TEAM.jim,
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "closed 3 deals worth $12,400",
    detail: "AC replacement ($5,800), water heater ($3,200), plumbing rework ($3,400).",
    time: "This week",
    timeGroup: "This Week",
    href: "/dashboard/pipeline",
  },
  {
    id: "a25",
    type: "invoice",
    actor: TEAM.maria,
    icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    action: "flagged overdue invoice INV-003",
    detail: "Robert Lee, $1,850 for AC Installation. 12 days overdue. Auto-reminder sent.",
    time: "2 days ago",
    timeGroup: "This Week",
    href: "/dashboard/invoices",
  },
  {
    id: "a26",
    type: "call",
    actor: TEAM.ai,
    icon: TrendingUp,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    action: "AI booking rate improved 12% this week",
    detail: "Call-to-appointment conversion: 42% to 54%. Handled 213 total calls.",
    time: "Weekly insight",
    timeGroup: "This Week",
    href: "/dashboard/analytics",
  },
  {
    id: "a27",
    type: "email",
    actor: TEAM.maria,
    icon: Mail,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "sent 45 review request emails",
    detail: "Post-appointment review requests. 12 reviews received so far (26% rate).",
    time: "3 days ago",
    timeGroup: "This Week",
  },
  {
    id: "a28",
    type: "appointment",
    actor: TEAM.dave,
    icon: Wrench,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    action: "completed 12 service appointments this week",
    detail: "6 HVAC, 4 plumbing, 2 emergency calls. Average job time: 1.8 hours.",
    time: "This week",
    timeGroup: "This Week",
    href: "/dashboard/scheduling",
  },
  {
    id: "a29",
    type: "lead",
    actor: TEAM.ai,
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    action: "saved team 28.5 hours this week",
    detail: "Handled 213 calls, 312 SMS conversations, booked 89 appointments.",
    time: "Weekly summary",
    timeGroup: "This Week",
    href: "/dashboard/analytics",
  },
  {
    id: "a30",
    type: "sms",
    actor: TEAM.tyler,
    icon: MessageSquare,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    action: "sent job completion photos to Kevin Park",
    detail: "3 photos of burst pipe repair. Customer confirmed satisfaction.",
    time: "2 days ago",
    timeGroup: "This Week",
    href: "/dashboard/inbox",
  },
  {
    id: "a31",
    type: "deal",
    actor: TEAM.jim,
    icon: XCircle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    action: "lost deal: HVAC Upgrade for Nguyen residence",
    detail: "Reason: Went with competitor. Value: $4,200. Added to win-back sequence.",
    time: "3 days ago",
    timeGroup: "This Week",
    href: "/dashboard/pipeline",
  },
  {
    id: "a32",
    type: "invoice",
    actor: TEAM.maria,
    icon: Receipt,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    action: "created 6 invoices totaling $14,850",
    detail: "5 paid, 1 overdue. Collection rate: 83%.",
    time: "This week",
    timeGroup: "This Week",
    href: "/dashboard/invoices",
  },
];

// ── Component ──

export default function ActivityPage() {
  usePageTitle("Activity");
  const [userFilter, setUserFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const filteredActivities = useMemo(() => {
    return MOCK_ACTIVITIES.filter((a) => {
      const matchesUser =
        userFilter === "all" ||
        (userFilter === "ai" && a.actor.type === "ai") ||
        a.actor.name.toLowerCase().includes(userFilter);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesUser && matchesType;
    });
  }, [userFilter, typeFilter]);

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
                    {f.key !== "all" && f.key !== "ai" && (
                      <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white",
                        TEAM[f.key as keyof typeof TEAM]?.color ?? "bg-gray-500"
                      )}>
                        {TEAM[f.key as keyof typeof TEAM]?.initials ?? "?"}
                      </div>
                    )}
                    {f.key === "ai" && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
                        AI
                      </div>
                    )}
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No activity found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters to see more results.
            </p>
          </div>
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

                  {group.items.map((entry, i) => (
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
