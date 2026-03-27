"use client";

import { useState, useEffect, useRef, use } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  CalendarCheck,
  Star,
  Clock,
  TrendingUp,
  User,
  MapPin,
  Building2,
  Edit,
  Bot,
  StickyNote,
  Send,
  Check,
  CheckCheck,
  DollarSign,
  Briefcase,
  Plus,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useContact } from "@/lib/hooks/use-contacts";
import { useApiQuery, useApiMutation } from "@/lib/hooks/use-api";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { trackPageVisit } from "@/lib/recently-viewed";
import type { LucideIcon } from "lucide-react";
import type { MockTimelineEntry, MockChatMessage } from "@/lib/mock-data";

// ============================================================
// Icon map for timeline
// ============================================================

const iconMap: Record<string, LucideIcon> = {
  Phone,
  Mail,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  Bot,
  StickyNote,
};

interface TimelineEntryWithIcon extends MockTimelineEntry {
  icon: LucideIcon;
}

function resolveIcon(entry: MockTimelineEntry): TimelineEntryWithIcon {
  return {
    ...entry,
    icon: iconMap[entry.iconName] ?? Phone,
  };
}

// ============================================================
// Tab type
// ============================================================

type TabKey = "timeline" | "conversations" | "deals" | "appointments";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "deals", label: "Deals", icon: DollarSign },
  { key: "appointments", label: "Appointments", icon: CalendarCheck },
];

// ============================================================
// Channel icons
// ============================================================

const channelIcons: Record<string, LucideIcon> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
};

// ============================================================
// Types for contact sub-data (from API)
// ============================================================

interface ContactConversation {
  id: string;
  channel: "sms" | "email" | "call";
  subject?: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  aiHandled: boolean;
}

interface ContactConversationMessage {
  id: string;
  sender: "contact" | "user" | "ai";
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
}

interface ContactDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  stageColor: string;
  daysInStage: number;
  createdAt: string;
}

interface ContactAppointment {
  id: string;
  service: string;
  date: string;
  time: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  technician: string;
}

// Stage color map for deals from API
const stageColorMap: Record<string, string> = {
  "New Lead": "bg-info text-white",
  "Contacted": "bg-primary/80 text-white",
  "Qualified": "bg-primary text-primary-foreground",
  "Quoted": "bg-warning text-white",
  "Proposal Sent": "bg-warning text-white",
  "Scheduled": "bg-primary text-primary-foreground",
  "Won": "bg-success text-white",
  "Lost": "bg-destructive text-white",
};

// ============================================================
// Appointment status badge helper
// ============================================================

function statusBadge(status: ContactAppointment["status"]) {
  switch (status) {
    case "confirmed":
      return "bg-success/10 text-success";
    case "scheduled":
      return "bg-info/10 text-info";
    case "completed":
      return "bg-muted text-muted-foreground";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
  }
}

// ============================================================
// Main page component
// ============================================================

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  usePageTitle("Contact Details");
  const { data: contactData } = useContact(id);
  const searchParams = useSearchParams();
  const router = useRouter();

  const contact = contactData?.contact;
  const initials = (contact?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("");

  // Fetch real conversations, deals, and activities for this contact
  const { data: apiConversations } = useApiQuery<ContactConversation[]>(
    `/orgs/:orgId/conversations`,
    [],
    { contactId: id },
  );
  const { data: apiDeals } = useApiQuery<ContactDeal[]>(
    `/orgs/:orgId/deals`,
    [],
    { contactId: id },
  );
  const { data: apiActivities } = useApiQuery<{ id: string; type: string; description: string; createdAt: string }[]>(
    `/orgs/:orgId/activities`,
    [],
    { contactId: id },
  );

  // Track this page visit for recently viewed
  useEffect(() => {
    if (contact?.name) {
      trackPageVisit({
        path: `/dashboard/contacts/${id}`,
        label: contact.name,
        type: "Contact",
      });
    }
  }, [id, contact?.name]);

  // Tab state from URL
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam ?? "timeline");

  // Sync tab with URL param changes
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    const newUrl = `/dashboard/contacts/${id}${tab !== "timeline" ? `?tab=${tab}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }

  // Timeline state
  const [localTimeline, setLocalTimeline] = useState<TimelineEntryWithIcon[]>([]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Conversations state — use API data
  const conversations: ContactConversation[] = Array.isArray(apiConversations) ? apiConversations : [];
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<Record<string, ContactConversationMessage[]>>({});

  // Auto-select first conversation when data loads
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);
  const [replyText, setReplyText] = useState("");
  const [replyChannel, setReplyChannel] = useState<"sms" | "email">("sms");
  const [composeMode, setComposeMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvId, convMessages]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Merged timeline
  const timeline: TimelineEntryWithIcon[] = [
    ...localTimeline,
    ...(contactData?.timeline ?? []).map(resolveIcon),
  ];

  // Add note handler
  function handleAddNote() {
    if (!noteText.trim()) return;
    const newEntry: TimelineEntryWithIcon = {
      id: `t-note-${Date.now()}`,
      type: "note",
      icon: StickyNote,
      iconName: "StickyNote",
      title: "Note added",
      description: noteText.trim(),
      time: "Just now",
      color: "text-foreground",
      bg: "bg-muted",
    };
    setLocalTimeline((prev) => [newEntry, ...prev]);
    setNoteText("");
    setShowNoteInput(false);
    showToast("Note added to timeline");
  }

  // Send reply in conversation
  function handleSendReply() {
    if (!replyText.trim()) return;

    const targetConvId = composeMode ? `new-${Date.now()}` : selectedConvId;
    if (!targetConvId) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const newMsg: ContactConversationMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: replyText.trim(),
      time: timeStr,
      status: "sent",
    };

    if (composeMode) {
      // Create a new conversation
      const newConv: ContactConversation = {
        id: targetConvId,
        channel: replyChannel,
        lastMessage: replyText.trim(),
        time: "Just now",
        unread: false,
        aiHandled: false,
      };
      // New conversation added locally (will be synced on next API refresh)
      setConvMessages((prev) => ({ ...prev, [targetConvId]: [newMsg] }));
      setSelectedConvId(targetConvId);
      setComposeMode(false);
    } else if (targetConvId) {
      setConvMessages((prev) => ({
        ...prev,
        [targetConvId]: [...(prev[targetConvId] ?? []), newMsg],
      }));
    }

    setReplyText("");
    showToast(`Message sent via ${replyChannel.toUpperCase()}`);

    // Simulate delivered status
    setTimeout(() => {
      setConvMessages((prev) => ({
        ...prev,
        [targetConvId]: (prev[targetConvId] ?? []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" as const } : m,
        ),
      }));
    }, 1000);
  }

  function handleReplyKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  // Call button handler - dispatch to floating dialer
  function handleCall() {
    // Dispatch a custom event that the floating dialer can listen for
    const event = new CustomEvent("mybizos:dial", {
      detail: { phone: contact?.phone, name: contact?.name },
    });
    window.dispatchEvent(event);
    showToast(`Calling ${contact?.name ?? "contact"}...`);
  }

  // SMS quick action - switch to conversations and compose
  function handleSmsAction() {
    switchTab("conversations");
    if (conversations.length === 0) {
      setComposeMode(true);
    } else {
      setSelectedConvId(conversations[0]?.id ?? null);
    }
    // Focus will happen naturally when the tab renders
    setTimeout(() => {
      const textarea = document.querySelector("[data-reply-input]") as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 100);
  }

  // Deals and appointments from API
  const rawDeals = Array.isArray(apiDeals) ? apiDeals : [];
  const deals: ContactDeal[] = rawDeals.map((d) => ({
    id: d.id,
    title: d.title || "Untitled Deal",
    value: d.value ?? 0,
    stage: d.stage || "New Lead",
    stageColor: stageColorMap[d.stage || ""] ?? "bg-muted text-foreground",
    daysInStage: d.daysInStage ?? 0,
    createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
  }));
  const appointments: ContactAppointment[] = [];

  // Split appointments into upcoming and past
  const upcomingAppointments = appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed");
  const pastAppointments = appointments.filter((a) => a.status === "completed" || a.status === "cancelled");

  // Current conversation messages
  const currentMessages = selectedConvId ? (convMessages[selectedConvId] ?? []) : [];
  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Guard: wait for contact data to resolve
  if (!contact) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading contact...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Breadcrumbs */}
      <Breadcrumbs currentLabel={contact.name} />

      {/* Contact header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg font-bold">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {contact.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                Score: {contact.score}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast("Edit mode coming soon")}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleCall}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left sidebar: Contact details + Quick actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Full name</p>
                  <p className="text-foreground">{contact.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="text-foreground">{contact.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Address</p>
                  <p className="text-foreground">{contact.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Star className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="text-foreground">{contact.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="text-foreground">{contact.createdAt}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCall}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                Call
              </button>
              <button
                onClick={handleSmsAction}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-info" />
                SMS
              </button>
              <button
                onClick={() => {
                  switchTab("conversations");
                  setReplyChannel("email");
                  setComposeMode(true);
                }}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 text-warning" />
                Email
              </button>
              <button
                onClick={() => {
                  switchTab("appointments");
                  showToast("Opening scheduler...");
                }}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
              >
                <CalendarCheck className="h-4 w-4 text-success" />
                Book Appt
              </button>
            </div>
          </div>
        </div>

        {/* Right: Main content area with tabs — 2 cols */}
        <div className="lg:col-span-2">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border mb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.key === "conversations" && conversations.length > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {conversations.length}
                    </span>
                  )}
                  {tab.key === "deals" && deals.length > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {deals.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="mt-0">
            {/* ===================== TIMELINE TAB ===================== */}
            {activeTab === "timeline" && (
              <div className="rounded-b-xl border border-t-0 border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Activity Timeline
                  </h2>
                  <button
                    onClick={() => setShowNoteInput(!showNoteInput)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    Add Note
                  </button>
                </div>

                {/* Add note input */}
                {showNoteInput && (
                  <div className="border-b border-border px-5 py-4 bg-muted/20">
                    <div className="flex gap-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write a note about this contact..."
                        rows={2}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={handleAddNote}
                          disabled={!noteText.trim()}
                          className={cn(
                            "flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors",
                            noteText.trim()
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-muted text-muted-foreground cursor-not-allowed",
                          )}
                        >
                          <Send className="h-3 w-3" />
                          Save
                        </button>
                        <button
                          onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                          className="flex h-8 items-center rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="relative space-y-6">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                    {timeline.map((event) => (
                      <div key={event.id} className="relative flex gap-4 pl-1">
                        <div
                          className={cn(
                            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            event.bg,
                          )}
                        >
                          <event.icon
                            className={cn("h-4 w-4", event.color)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {event.title}
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {event.time}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===================== CONVERSATIONS TAB ===================== */}
            {activeTab === "conversations" && (
              <div className="rounded-b-xl border border-t-0 border-border bg-card overflow-hidden">
                {conversations.length === 0 && !composeMode ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No conversations yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                      Send the first message to {contact.name}. Start a conversation via SMS or email.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setReplyChannel("sms");
                          setComposeMode(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Send SMS
                      </button>
                      <button
                        onClick={() => {
                          setReplyChannel("email");
                          setComposeMode(true);
                        }}
                        className="flex items-center gap-2 rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        Send Email
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Conversation split view */
                  <div className="flex h-[500px]">
                    {/* Left: Conversation thread list */}
                    <div className="w-72 shrink-0 border-r border-border flex flex-col">
                      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threads</span>
                        <button
                          onClick={() => {
                            setComposeMode(true);
                            setSelectedConvId(null);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                          title="New conversation"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {conversations.map((conv) => {
                          const ChannelIcon = channelIcons[conv.channel];
                          return (
                            <button
                              key={conv.id}
                              onClick={() => {
                                setSelectedConvId(conv.id);
                                setComposeMode(false);
                              }}
                              className={cn(
                                "flex w-full items-start gap-2.5 border-b border-border px-3 py-3 text-left transition-colors",
                                selectedConvId === conv.id && !composeMode
                                  ? "bg-accent"
                                  : "hover:bg-muted/30",
                              )}
                            >
                              <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                conv.channel === "sms" ? "bg-info/10" : conv.channel === "email" ? "bg-warning/10" : "bg-primary/10",
                              )}>
                                <ChannelIcon className={cn(
                                  "h-4 w-4",
                                  conv.channel === "sms" ? "text-info" : conv.channel === "email" ? "text-warning" : "text-primary",
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-foreground uppercase">
                                      {conv.channel}
                                    </span>
                                    {conv.aiHandled && (
                                      <Bot className="h-3 w-3 text-primary" />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {conv.time}
                                  </span>
                                </div>
                                {conv.subject && (
                                  <p className="text-xs font-medium text-foreground truncate mt-0.5">
                                    {conv.subject}
                                  </p>
                                )}
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {conv.lastMessage}
                                </p>
                              </div>
                              {conv.unread && (
                                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Message thread or compose */}
                    <div className="flex flex-1 flex-col min-w-0">
                      {composeMode ? (
                        /* Compose new message */
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                            <span className="text-sm font-semibold text-foreground">New Message</span>
                            <div className="flex gap-1 ml-auto">
                              <button
                                onClick={() => setReplyChannel("sms")}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  replyChannel === "sms"
                                    ? "bg-info/10 text-info"
                                    : "text-muted-foreground hover:bg-muted",
                                )}
                              >
                                SMS
                              </button>
                              <button
                                onClick={() => setReplyChannel("email")}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  replyChannel === "email"
                                    ? "bg-warning/10 text-warning"
                                    : "text-muted-foreground hover:bg-muted",
                                )}
                              >
                                Email
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center">
                              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-muted mb-3">
                                {replyChannel === "sms" ? (
                                  <MessageSquare className="h-6 w-6 text-info" />
                                ) : (
                                  <Mail className="h-6 w-6 text-warning" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Send a new {replyChannel === "sms" ? "SMS" : "email"} to {contact.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {replyChannel === "sms" ? contact.phone : contact.email}
                              </p>
                            </div>
                          </div>
                          {/* Compose input */}
                          <div className="border-t border-border p-3">
                            <div className="flex items-end gap-2">
                              <div className="flex-1 rounded-xl border border-input bg-background p-3">
                                <textarea
                                  data-reply-input
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={handleReplyKeyDown}
                                  placeholder={`Type your ${replyChannel === "sms" ? "SMS" : "email"}...`}
                                  rows={2}
                                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                  autoFocus
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <button
                                    onClick={() => {
                                      setComposeMode(false);
                                      setSelectedConvId(conversations[0]?.id ?? null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim()}
                                    className={cn(
                                      "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                                      replyText.trim()
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-muted text-muted-foreground cursor-not-allowed",
                                    )}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Send
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : selectedConv ? (
                        /* Existing thread */
                        <>
                          {/* Thread header */}
                          <div className="flex items-center justify-between border-b border-border px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {(() => {
                                const Icon = channelIcons[selectedConv.channel];
                                return (
                                  <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg",
                                    selectedConv.channel === "sms" ? "bg-info/10" : selectedConv.channel === "email" ? "bg-warning/10" : "bg-primary/10",
                                  )}>
                                    <Icon className={cn(
                                      "h-4 w-4",
                                      selectedConv.channel === "sms" ? "text-info" : selectedConv.channel === "email" ? "text-warning" : "text-primary",
                                    )} />
                                  </div>
                                );
                              })()}
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {selectedConv.subject ?? `${selectedConv.channel.toUpperCase()} Conversation`}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  {selectedConv.channel.toUpperCase()} with {contact.name}
                                  {selectedConv.aiHandled && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 text-primary">
                                      <Bot className="h-3 w-3" />
                                      AI handled
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {currentMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "flex",
                                  msg.sender === "contact"
                                    ? "justify-start"
                                    : "justify-end",
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                                    msg.sender === "contact"
                                      ? "bg-muted text-foreground rounded-bl-md"
                                      : msg.sender === "ai"
                                        ? "bg-primary/10 text-foreground rounded-br-md border border-primary/20"
                                        : "bg-primary text-primary-foreground rounded-br-md",
                                  )}
                                >
                                  {msg.sender === "ai" && (
                                    <div className="flex items-center gap-1 mb-1 text-xs font-medium text-primary">
                                      <Bot className="h-3 w-3" />
                                      AI Agent
                                    </div>
                                  )}
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                  <div
                                    className={cn(
                                      "flex items-center justify-end gap-1 mt-1 text-[10px]",
                                      msg.sender === "contact"
                                        ? "text-muted-foreground"
                                        : msg.sender === "ai"
                                          ? "text-muted-foreground"
                                          : "text-primary-foreground/70",
                                    )}
                                  >
                                    {msg.time}
                                    {msg.sender !== "contact" &&
                                      (msg.status === "read" ? (
                                        <CheckCheck className="h-3 w-3" />
                                      ) : msg.status === "delivered" ? (
                                        <CheckCheck className="h-3 w-3 opacity-50" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>

                          {/* Reply input */}
                          {selectedConv.channel !== "call" && (
                            <div className="border-t border-border p-3">
                              <div className="flex items-end gap-2">
                                <div className="flex-1 rounded-xl border border-input bg-background p-3">
                                  <textarea
                                    data-reply-input
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={handleReplyKeyDown}
                                    placeholder={`Reply via ${selectedConv.channel.toUpperCase()}...`}
                                    rows={1}
                                    className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                  />
                                  <div className="flex items-center justify-end mt-2">
                                    <button
                                      onClick={handleSendReply}
                                      disabled={!replyText.trim()}
                                      className={cn(
                                        "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                                        replyText.trim()
                                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                          : "bg-muted text-muted-foreground cursor-not-allowed",
                                      )}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Send
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                          Select a thread to view messages
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================== DEALS TAB ===================== */}
            {activeTab === "deals" && (
              <div className="rounded-b-xl border border-t-0 border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Deals ({deals.length})
                  </h2>
                  <button
                    onClick={() => showToast("Create deal coming soon")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Deal
                  </button>
                </div>

                {deals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No deals yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                      Create a deal to track revenue opportunities with {contact.name}.
                    </p>
                    <button
                      onClick={() => showToast("Create deal coming soon")}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create Deal
                    </button>
                  </div>
                ) : (
                  <div className="p-5 space-y-3">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{deal.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                deal.stageColor,
                              )}>
                                {deal.stage}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {deal.daysInStage === 0 ? "Today" : `${deal.daysInStage}d in stage`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Created {deal.createdAt}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            ${deal.value.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Deals summary */}
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 mt-2">
                      <span className="text-sm font-medium text-muted-foreground">Total pipeline value</span>
                      <span className="text-sm font-bold text-foreground">
                        ${deals.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===================== APPOINTMENTS TAB ===================== */}
            {activeTab === "appointments" && (
              <div className="rounded-b-xl border border-t-0 border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Appointments ({appointments.length})
                  </h2>
                  <button
                    onClick={() => showToast("Book appointment coming soon")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Book Appointment
                  </button>
                </div>

                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No appointments yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                      Schedule a service appointment for {contact.name}.
                    </p>
                    <button
                      onClick={() => showToast("Book appointment coming soon")}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Book Appointment
                    </button>
                  </div>
                ) : (
                  <div className="p-5 space-y-5">
                    {/* Upcoming */}
                    {upcomingAppointments.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Upcoming
                        </h3>
                        <div className="space-y-3">
                          {upcomingAppointments.map((appt) => (
                            <div
                              key={appt.id}
                              className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                                  <CalendarCheck className="h-5 w-5 text-success" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{appt.service}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-foreground font-medium">
                                      {appt.date}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {appt.time}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    statusBadge(appt.status),
                                  )}>
                                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    {appt.technician}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {pastAppointments.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Past
                        </h3>
                        <div className="space-y-3">
                          {pastAppointments.map((appt) => (
                            <div
                              key={appt.id}
                              className="flex items-center justify-between rounded-xl border border-border p-4 opacity-70"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{appt.service}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-foreground">
                                      {appt.date}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {appt.time}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    statusBadge(appt.status),
                                  )}>
                                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    {appt.technician}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
