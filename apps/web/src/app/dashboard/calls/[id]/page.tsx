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

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

function createMockCalls(): CallRecord[] {
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);

  return [
    {
      id: "call-1",
      contactName: "Sarah Johnson",
      phoneNumber: "+17045551234",
      direction: "inbound",
      duration: 247,
      timestamp: minutesAgo(12),
      outcome: "booked",
      aiHandled: true,
      summary: "Customer Sarah Johnson called about a leaking faucet in her kitchen. She's available Tuesday or Wednesday afternoon. Quoted $150-250 for repair. Booked for Tuesday 2:00 PM.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Acme HVAC & Plumbing's AI assistant. This call may be recorded. How can I help you today?", time: "0:00" },
        { speaker: "caller", text: "Hi, I have a leaking faucet in my kitchen and need someone to come fix it.", time: "0:05" },
        { speaker: "ai", text: "I'm sorry to hear about the leak. I can help get that scheduled for you. A kitchen faucet repair typically starts around $150-250 depending on the issue. When would be a good time?", time: "0:12" },
        { speaker: "caller", text: "Tuesday or Wednesday afternoon would work best for me.", time: "0:22" },
        { speaker: "ai", text: "I have an opening on Tuesday at 2:00 PM. Would that work for you?", time: "0:28" },
        { speaker: "caller", text: "That's perfect. Let's do Tuesday at 2.", time: "0:33" },
        { speaker: "ai", text: "Great! I've booked you for Tuesday at 2:00 PM. You'll receive a confirmation text shortly. Is there anything else I can help with?", time: "0:38" },
        { speaker: "caller", text: "No, that's all. Thank you!", time: "0:44" },
        { speaker: "ai", text: "You're welcome! Have a great day, Sarah.", time: "0:48" },
      ],
      actionsTaken: ["Contact updated", "Appointment booked: Tue 2:00 PM", "Deal created: Kitchen Faucet Repair"],
      recordingAvailable: true,
    },
    {
      id: "call-2",
      contactName: "Mike Rodriguez",
      phoneNumber: "+17045555678",
      direction: "outbound",
      duration: 183,
      timestamp: minutesAgo(45),
      outcome: "qualified",
      aiHandled: false,
      summary: "Follow-up call with Mike about his HVAC maintenance plan. He's interested in the annual plan at $299/year. Will call back by Friday to confirm.",
      transcript: [
        { speaker: "agent", text: "Hi Mike, this is John from Acme HVAC. I'm following up on the maintenance plan we discussed.", time: "0:00" },
        { speaker: "caller", text: "Hey John, yeah I've been thinking about it. The annual plan sounded good.", time: "0:06" },
        { speaker: "agent", text: "Great! The annual plan is $299 per year and includes two tune-ups, priority scheduling, and 15% off all repairs.", time: "0:12" },
        { speaker: "caller", text: "That sounds reasonable. Let me talk it over with my wife and I'll get back to you by Friday.", time: "0:20" },
        { speaker: "agent", text: "Sounds good, Mike. I'll follow up Friday if I don't hear from you. Have a great day!", time: "0:28" },
      ],
      actionsTaken: ["Follow-up scheduled: Friday", "Deal stage updated: Proposal"],
      recordingAvailable: true,
    },
    {
      id: "call-3",
      contactName: null,
      phoneNumber: "+17045554321",
      direction: "inbound",
      duration: 0,
      timestamp: minutesAgo(68),
      outcome: "missed",
      aiHandled: false,
      summary: "Missed call from unknown number. No voicemail left.",
      transcript: [],
      actionsTaken: [],
      recordingAvailable: false,
    },
    {
      id: "call-4",
      contactName: "Lisa Thompson",
      phoneNumber: "+17045559012",
      direction: "inbound",
      duration: 156,
      timestamp: minutesAgo(120),
      outcome: "booked",
      aiHandled: true,
      summary: "Lisa called to schedule her annual AC tune-up. Booked for next Wednesday at 10 AM. Existing customer since 2024.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Acme HVAC & Plumbing's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "Hi, I need to schedule my annual AC tune-up.", time: "0:04" },
        { speaker: "ai", text: "Of course! I see you're an existing customer. The AC tune-up typically runs $89-149. When works best for you?", time: "0:10" },
        { speaker: "caller", text: "Next Wednesday morning if possible.", time: "0:17" },
        { speaker: "ai", text: "I have 10 AM available next Wednesday. Shall I book that?", time: "0:21" },
        { speaker: "caller", text: "Yes please!", time: "0:25" },
        { speaker: "ai", text: "Perfect! You're all set for next Wednesday at 10 AM. You'll get a confirmation text. Anything else?", time: "0:29" },
        { speaker: "caller", text: "Nope, that's it. Thanks!", time: "0:34" },
      ],
      actionsTaken: ["Appointment booked: Wed 10:00 AM", "Recurring service noted"],
      recordingAvailable: true,
    },
    {
      id: "call-5",
      contactName: "James Wilson",
      phoneNumber: "+17045553456",
      direction: "outbound",
      duration: 42,
      timestamp: minutesAgo(180),
      outcome: "voicemail",
      aiHandled: false,
      summary: "Called James to confirm tomorrow's appointment. Left voicemail requesting callback.",
      transcript: [
        { speaker: "agent", text: "Hi James, this is John from Acme HVAC calling to confirm your appointment tomorrow at 9 AM. Please give us a call back to confirm. Thanks!", time: "0:00" },
      ],
      actionsTaken: ["Voicemail left", "Follow-up reminder set"],
      recordingAvailable: true,
    },
    {
      id: "call-6",
      contactName: "Patricia Garcia",
      phoneNumber: "+17045557890",
      direction: "inbound",
      duration: 312,
      timestamp: minutesAgo(240),
      outcome: "escalated",
      aiHandled: true,
      summary: "Patricia called about a gas smell near her furnace. AI escalated immediately due to emergency keyword detection. Owner notified.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Acme HVAC & Plumbing's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "I think I smell gas near my furnace and I'm worried.", time: "0:05" },
        { speaker: "ai", text: "I understand your concern. For your safety, I'm connecting you to our owner immediately. Please leave the area if the smell is strong.", time: "0:10" },
        { speaker: "agent", text: "Hi Patricia, this is John. I heard you might have a gas leak. First, are you and your family safe?", time: "0:18" },
        { speaker: "caller", text: "Yes, we're okay, it's a faint smell near the furnace.", time: "0:24" },
        { speaker: "agent", text: "Good. I'm going to send someone out to you right away. Don't turn on any electrical switches. Our technician will be there within the hour.", time: "0:30" },
        { speaker: "caller", text: "Thank you so much, I really appreciate the quick response.", time: "0:38" },
        { speaker: "agent", text: "Of course. Safety is our top priority. You'll get a text when our tech is on the way.", time: "0:44" },
      ],
      actionsTaken: ["Emergency escalation triggered", "Owner notified immediately", "Emergency appointment created"],
      recordingAvailable: true,
    },
    {
      id: "call-7",
      contactName: "David Chen",
      phoneNumber: "+17045552345",
      direction: "inbound",
      duration: 198,
      timestamp: minutesAgo(300),
      outcome: "qualified",
      aiHandled: true,
      summary: "David inquired about a new AC installation for his 2,500 sq ft home. Qualified as hot lead. Requested an in-home estimate.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Acme HVAC & Plumbing's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "I'm looking to get a new central AC system installed.", time: "0:05" },
        { speaker: "ai", text: "I'd be happy to help with that. Could you tell me the approximate square footage of your home?", time: "0:10" },
        { speaker: "caller", text: "About 2,500 square feet.", time: "0:15" },
        { speaker: "ai", text: "For a home that size, a new AC installation typically starts around $4,000-8,000 depending on the system. We offer free in-home estimates. Would you like to schedule one?", time: "0:20" },
        { speaker: "caller", text: "Yes, that would be great. When can someone come out?", time: "0:28" },
        { speaker: "ai", text: "We have availability this Thursday afternoon or Friday morning. Which works better?", time: "0:33" },
        { speaker: "caller", text: "Thursday afternoon works. Around 3 PM?", time: "0:38" },
        { speaker: "ai", text: "Thursday at 3 PM it is! I'll have one of our senior technicians come out for the estimate. Can I confirm your address?", time: "0:43" },
      ],
      actionsTaken: ["Contact created", "Deal created: AC Installation", "Estimate visit requested"],
      recordingAvailable: true,
    },
  ];
}

const MOCK_CALLS = createMockCalls();

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
      description: `"Hi, I need help with my plumbing. Can someone call me?"`,
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
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/calls")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
          <p className="text-sm text-muted-foreground">{formatFullTimestamp(call.timestamp)}</p>
        </div>
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
