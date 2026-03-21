"use client";

import { useState, use } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const contactsMap: Record<string, {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  source: string;
  score: number;
  tags: string[];
  createdAt: string;
}> = {
  c1: {
    id: "c1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "(555) 234-5678",
    company: "Johnson Residence",
    address: "742 Evergreen Terrace, Springfield, IL",
    source: "Phone",
    score: 92,
    tags: ["Hot Lead", "HVAC"],
    createdAt: "Mar 15, 2026",
  },
  c2: {
    id: "c2",
    name: "Mike Chen",
    email: "mike.chen@email.com",
    phone: "(555) 345-6789",
    company: "Chen Properties LLC",
    address: "123 Oak Street, Springfield, IL",
    source: "Web Form",
    score: 78,
    tags: ["Plumbing"],
    createdAt: "Mar 10, 2026",
  },
  c3: {
    id: "c3",
    name: "David Park",
    email: "dpark@gmail.com",
    phone: "(555) 456-7890",
    company: "Park Family Home",
    address: "456 Pine Ave, Springfield, IL",
    source: "AI Call",
    score: 85,
    tags: ["Hot Lead", "Furnace"],
    createdAt: "Mar 12, 2026",
  },
  c6: {
    id: "c6",
    name: "Emily Davis",
    email: "emily.d@mail.com",
    phone: "(555) 789-0123",
    company: "Davis Apartments",
    address: "321 Elm Street, Springfield, IL",
    source: "Phone",
    score: 91,
    tags: ["Hot Lead", "Emergency"],
    createdAt: "Mar 18, 2026",
  },
};

const defaultContact = {
  id: "c0",
  name: "Unknown Contact",
  email: "unknown@example.com",
  phone: "(555) 000-0000",
  company: "Unknown",
  address: "Springfield, IL",
  source: "Unknown",
  score: 50,
  tags: [],
  createdAt: "Mar 20, 2026",
};

interface TimelineEntry {
  id: string;
  type: string;
  icon: typeof Phone;
  title: string;
  description: string;
  time: string;
  color: string;
  bg: string;
}

const baseTimeline: TimelineEntry[] = [
  {
    id: "t1",
    type: "call",
    icon: Phone,
    title: "AI answered inbound call",
    description:
      "Customer inquired about AC maintenance. AI qualified as high-intent lead and scheduled callback.",
    time: "2 hours ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t2",
    type: "appointment",
    icon: CalendarCheck,
    title: "Appointment booked",
    description: "AC Tune-Up — Tomorrow at 10:00 AM",
    time: "2 hours ago",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    id: "t3",
    type: "sms",
    icon: MessageSquare,
    title: "SMS confirmation sent",
    description:
      "Automated confirmation message sent with appointment details.",
    time: "2 hours ago",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "t4",
    type: "score",
    icon: TrendingUp,
    title: "AI score updated: 72 -> 92",
    description: "Score increased due to appointment booking and engagement.",
    time: "2 hours ago",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "t5",
    type: "email",
    icon: Mail,
    title: "Follow-up email sent",
    description: "Service estimate PDF attached — AC Tune-Up package details.",
    time: "1 day ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t6",
    type: "call",
    icon: Phone,
    title: "Initial call — AI agent",
    description:
      "First contact. Customer asked about HVAC services. AI collected contact details and service needs.",
    time: "3 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t7",
    type: "sms",
    icon: MessageSquare,
    title: "SMS received",
    description: "Customer replied: 'Thanks for the info, I'll think about it.'",
    time: "3 days ago",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "t8",
    type: "ai",
    icon: Bot,
    title: "AI auto-response sent",
    description: "AI sent follow-up message with seasonal maintenance tips and a special offer.",
    time: "3 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t9",
    type: "score",
    icon: TrendingUp,
    title: "AI score updated: 45 -> 72",
    description: "Score increased — customer engaged with SMS and opened email.",
    time: "4 days ago",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "t10",
    type: "email",
    icon: Mail,
    title: "Welcome email sent",
    description: "Automated welcome email with company brochure and service menu.",
    time: "5 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t11",
    type: "call",
    icon: Phone,
    title: "First inbound call",
    description: "Customer called main number. AI agent answered and collected initial requirements.",
    time: "5 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const contact = contactsMap[id] ?? { ...defaultContact, id };
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const [timeline, setTimeline] = useState<TimelineEntry[]>(baseTimeline);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    const newEntry: TimelineEntry = {
      id: `t-note-${Date.now()}`,
      type: "note",
      icon: StickyNote,
      title: "Note added",
      description: noteText.trim(),
      time: "Just now",
      color: "text-foreground",
      bg: "bg-muted",
    };
    setTimeline((prev) => [newEntry, ...prev]);
    setNoteText("");
    setShowNoteInput(false);
    showToast("Note added to timeline");
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

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
            onClick={() => showToast("Calling " + contact.name + "...")}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Contact details */}
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
              {[
                { icon: Phone, label: "Call", color: "text-primary", msg: "Initiating call..." },
                { icon: MessageSquare, label: "SMS", color: "text-info", msg: "Opening SMS composer..." },
                { icon: Mail, label: "Email", color: "text-warning", msg: "Opening email composer..." },
                { icon: CalendarCheck, label: "Book Appt", color: "text-success", msg: "Opening scheduler..." },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => showToast(action.msg)}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <action.icon className={cn("h-4 w-4", action.color)} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Timeline — 2 cols */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
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
        </div>
      </div>
    </div>
  );
}
