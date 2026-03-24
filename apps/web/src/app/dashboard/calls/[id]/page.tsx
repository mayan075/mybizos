"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Bot,
  Clock,
  Circle,
  Play,
  MessageSquare,
  CalendarPlus,
  User,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from parent)                                               */
/* -------------------------------------------------------------------------- */

type CallDirection = "inbound" | "outbound";
type CallOutcome = "booked" | "qualified" | "voicemail" | "missed" | "escalated";

interface TranscriptLine {
  speaker: "caller" | "agent" | "ai";
  text: string;
  time: string;
}

interface CallRecord {
  id: string;
  contactName: string | null;
  phoneNumber: string;
  direction: CallDirection;
  duration: number;
  timestamp: Date;
  outcome: CallOutcome;
  aiHandled: boolean;
  summary: string;
  transcript: TranscriptLine[];
  actionsTaken: string[];
  recordingAvailable: boolean;
}

interface TimelineEvent {
  id: string;
  type: "call" | "sms" | "email" | "appointment" | "note";
  title: string;
  description: string;
  timestamp: Date;
  isCurrent: boolean;
}

// Real call data will come from the API; empty fallback
const MOCK_CALLS: CallRecord[] = [];

function createMockTimeline(call: CallRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();

  if (call.contactName) {
    events.push({
      id: "tl-1",
      type: "note",
      title: "Contact created",
      description: `${call.contactName} was added to contacts`,
      timestamp: new Date(call.timestamp.getTime() - 86400000 * 7),
      isCurrent: false,
    });

    events.push({
      id: "tl-2",
      type: "sms",
      title: "SMS received",
      description: `"Hi, I need help with my rubbish removal. Can someone call me?"`,
      timestamp: new Date(call.timestamp.getTime() - 3600000),
      isCurrent: false,
    });
  }

  events.push({
    id: "tl-3",
    type: "call",
    title: `${call.direction === "inbound" ? "Inbound" : "Outbound"} call`,
    description: call.summary.slice(0, 80) + "...",
    timestamp: call.timestamp,
    isCurrent: true,
  });

  if (call.outcome === "booked") {
    events.push({
      id: "tl-4",
      type: "appointment",
      title: "Appointment booked",
      description: "Service appointment scheduled",
      timestamp: new Date(call.timestamp.getTime() + 60000),
      isCurrent: false,
    });

    events.push({
      id: "tl-5",
      type: "sms",
      title: "Confirmation SMS sent",
      description: "Appointment confirmation text sent to customer",
      timestamp: new Date(call.timestamp.getTime() + 120000),
      isCurrent: false,
    });
  }

  return events;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function formatFullTimestamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortTimestamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  qualified: { label: "Qualified", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  voicemail: { label: "Voicemail", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  missed: { label: "Missed", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  escalated: { label: "Escalated", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
};

const SPEAKER_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  caller: { label: "Customer", color: "text-foreground", bgColor: "bg-muted" },
  agent: { label: "You", color: "text-primary-foreground", bgColor: "bg-primary" },
  ai: { label: "AI Agent", color: "text-foreground", bgColor: "bg-primary/10" },
};

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  sms: MessageSquare,
  email: FileText,
  appointment: CalendarPlus,
  note: User,
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;

  const call = useMemo(() => MOCK_CALLS.find((c) => c.id === callId), [callId]);
  const timeline = useMemo(() => (call ? createMockTimeline(call) : []), [call]);

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Phone className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Call not found</p>
        <button
          onClick={() => router.push("/dashboard/calls")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to Calls
        </button>
      </div>
    );
  }

  const displayName = call.contactName ?? formatPhoneDisplay(call.phoneNumber);
  const initials = call.contactName
    ? call.contactName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "#";
  const outcomeConfig = OUTCOME_CONFIG[call.outcome];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs currentLabel={displayName} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
        <p className="text-sm text-muted-foreground">{formatFullTimestamp(call.timestamp)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------------------------------------------------------- */}
        {/*  Main content (left 2/3)                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Call info card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold",
                  call.contactName ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">{formatPhoneDisplay(call.phoneNumber)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {call.direction === "inbound" ? (
                      call.outcome === "missed" ? (
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <PhoneMissed className="h-3.5 w-3.5" />
                          Missed Call
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <PhoneIncoming className="h-3.5 w-3.5" />
                          Inbound
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <PhoneOutgoing className="h-3.5 w-3.5" />
                        Outbound
                      </div>
                    )}
                    <span className="text-muted-foreground">|</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(call.duration)}
                    </div>
                    {call.aiHandled && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Bot className="h-3.5 w-3.5" />
                          AI Handled
                        </div>
                      </>
                    )}
                    {call.recordingAvailable && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                          Recorded
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", outcomeConfig.className)}>
                {outcomeConfig.label}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-5 pt-4 border-t border-border">
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Phone className="h-4 w-4" />
                Call Again
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <MessageSquare className="h-4 w-4" />
                Send Follow-Up Text
              </button>
              {call.recordingAvailable && (
                <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <Play className="h-4 w-4" />
                  Play Recording
                </button>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI Call Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {call.summary}
            </p>

            {call.actionsTaken.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Actions Taken
                </h4>
                <div className="space-y-1.5">
                  {call.actionsTaken.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Transcript */}
          {call.transcript.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Full Transcript</h3>
              <div className="space-y-3">
                {call.transcript.map((line, i) => {
                  const config = SPEAKER_CONFIG[line.speaker];
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        line.speaker === "agent" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5",
                        line.speaker === "agent"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : line.speaker === "ai"
                            ? "bg-primary/10 text-foreground rounded-bl-md border border-primary/20"
                            : "bg-muted text-foreground rounded-bl-md",
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {line.speaker === "ai" && <Bot className="h-3 w-3 text-primary" />}
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider",
                            line.speaker === "agent" ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}>
                            {config.label}
                          </span>
                          <span className={cn(
                            "text-[10px]",
                            line.speaker === "agent" ? "text-primary-foreground/50" : "text-muted-foreground/60",
                          )}>
                            {line.time}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{line.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/*  Sidebar (right 1/3)                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-6">
          {/* Contact Timeline */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Contact Timeline</h3>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {timeline.map((event) => {
                  const Icon = TIMELINE_ICONS[event.type] ?? FileText;
                  return (
                    <div key={event.id} className="flex gap-3 relative">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 z-10",
                        event.isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={cn(
                          "text-sm font-medium",
                          event.isCurrent ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatShortTimestamp(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {!call.contactName && (
                <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Add to Contacts
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </button>
              )}
              <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                Book Follow-Up
                <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Create Estimate
                <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
