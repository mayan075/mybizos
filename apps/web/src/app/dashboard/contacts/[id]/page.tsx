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
import { useContact } from "@/lib/hooks/use-contacts";
import type { LucideIcon } from "lucide-react";
import type { MockTimelineEntry } from "@/lib/mock-data";

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

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: contactData } = useContact(id);

  const contact = contactData.contact;
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const [localTimeline, setLocalTimeline] = useState<TimelineEntryWithIcon[]>([]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Merge local additions on top of API/mock timeline
  const timeline: TimelineEntryWithIcon[] = [
    ...localTimeline,
    ...contactData.timeline.map(resolveIcon),
  ];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
