"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Bot,
  ArrowDown,
  ArrowUp,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  Circle,
  ArrowRightLeft,
  Hash,
  X,
  User,
  Clock,
  FileText,
  CalendarPlus,
  UserPlus,
  PhoneCall,
  Delete,
  Star,
  Settings2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import {
  formatPhoneNumber,
  detectCountry,
  toE164,
  isValidNumber,
  stripToDigits,
  maxDigitsForCountry,
  formatE164ForDisplay,
} from "@/lib/phone-utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { useApiQuery, buildPath } from "@/lib/hooks/use-api";
import { CallsSkeleton } from "@/components/skeletons/calls-skeleton";
import type { PhoneNumber as TwilioPhoneNumber } from "@/components/phone/pricing-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type CallDirection = "inbound" | "outbound";
type CallOutcome = "booked" | "qualified" | "voicemail" | "missed" | "escalated";
type CallStatus = "idle" | "ringing" | "connected" | "on-hold" | "ended";
type CallTab = "all" | "inbound" | "outbound" | "ai" | "missed";

interface CallRecord {
  id: string;
  contactName: string | null;
  phoneNumber: string;
  direction: CallDirection;
  duration: number; // seconds
  timestamp: Date;
  outcome: CallOutcome;
  aiHandled: boolean;
  summary: string;
  transcript: TranscriptLine[];
  actionsTaken: string[];
  recordingAvailable: boolean;
}

interface TranscriptLine {
  speaker: "caller" | "agent" | "ai";
  text: string;
  time: string;
}

interface QuickDialContact {
  name: string;
  initials: string;
  phone: string;
  color: string;
}

/* -------------------------------------------------------------------------- */
/*  Hook: useCallerNumbers                                                     */
/* -------------------------------------------------------------------------- */

interface CallerNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
}

function useCallerNumbers() {
  const [numbers, setNumbers] = useState<CallerNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    async function load() {
      setLoading(true);

      try {
        const path = buildPath("/orgs/:orgId/phone-system/numbers");
        const result = await tryFetch(() =>
          apiClient.get<{ numbers: TwilioPhoneNumber[] }>(path),
        );
        if (result && result.numbers.length > 0) {
          setNumbers(
            result.numbers.map((n) => ({
              sid: n.sid,
              phoneNumber: n.phoneNumber,
              friendlyName: n.friendlyName,
            })),
          );
        }
      } catch {
        // API not available — no numbers to show
      }

      setLoading(false);
    }

    load();
  }, []);

  return { numbers, loading };
}

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const QUICK_DIAL_CONTACTS: QuickDialContact[] = [
  { name: "Sarah J.", initials: "SJ", phone: "+17045551234", color: "bg-rose-500" },
  { name: "Mike R.", initials: "MR", phone: "+17045555678", color: "bg-blue-500" },
  { name: "Lisa T.", initials: "LT", phone: "+17045559012", color: "bg-emerald-500" },
  { name: "James W.", initials: "JW", phone: "+17045553456", color: "bg-amber-500" },
];

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
      summary: "Customer Sarah Johnson called about a garage cleanout she needs done. She's available Tuesday or Wednesday afternoon. Quoted $200-350 for pickup. Booked for Tuesday 2:00 PM.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. This call may be recorded. How can I help you today?", time: "0:00" },
        { speaker: "caller", text: "Hi, I have a bunch of old furniture and junk I need removed from my garage.", time: "0:05" },
        { speaker: "ai", text: "I'm sorry to hear about the leak. I can help get that scheduled for you. A kitchen faucet repair typically starts around $150-250 depending on the issue. When would be a good time?", time: "0:12" },
        { speaker: "caller", text: "Tuesday or Wednesday afternoon would work best for me.", time: "0:22" },
        { speaker: "ai", text: "I have an opening on Tuesday at 2:00 PM. Would that work for you?", time: "0:28" },
        { speaker: "caller", text: "That's perfect. Let's do Tuesday at 2.", time: "0:33" },
        { speaker: "ai", text: "Great! I've booked you for Tuesday at 2:00 PM. You'll receive a confirmation text shortly. Is there anything else I can help with?", time: "0:38" },
        { speaker: "caller", text: "No, that's all. Thank you!", time: "0:44" },
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
      summary: "Follow-up call with Mike about his regular pickup plan. He's interested in the annual plan at $299/year for monthly pickups. Will call back by Friday to confirm.",
      transcript: [
        { speaker: "agent", text: "Hi Mike, this is John from Northern Removals. I'm following up on the maintenance plan we discussed.", time: "0:00" },
        { speaker: "caller", text: "Hey John, yeah I've been thinking about it. The annual plan sounded good.", time: "0:06" },
        { speaker: "agent", text: "Great! The annual plan is $299 per year and includes monthly pickups, priority scheduling, and 15% off all services.", time: "0:12" },
        { speaker: "caller", text: "That sounds reasonable. Let me talk it over with my wife and I'll get back to you by Friday.", time: "0:20" },
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
      summary: "Lisa called to schedule her annual property cleanout. Booked for next Wednesday at 10 AM. Existing customer since 2024.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "Hi, I need to schedule my annual property cleanout.", time: "0:04" },
        { speaker: "ai", text: "Of course! I see you're an existing customer. The cleanout typically runs $200-400. When works best for you?", time: "0:10" },
        { speaker: "caller", text: "Next Wednesday morning if possible.", time: "0:17" },
        { speaker: "ai", text: "I have 10 AM available next Wednesday. Shall I book that?", time: "0:21" },
        { speaker: "caller", text: "Yes please!", time: "0:25" },
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
        { speaker: "agent", text: "Hi James, this is John from Northern Removals calling to confirm your appointment tomorrow at 9 AM. Please give us a call back to confirm. Thanks!", time: "0:00" },
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
      summary: "Patricia called about a urgent rubbish removal after a flood. AI escalated immediately due to emergency keyword detection. Owner notified.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "I think I had flooding and there's rubbish everywhere I need removed urgently.", time: "0:05" },
        { speaker: "ai", text: "I understand your concern. For your safety, I'm connecting you to our owner immediately. Please leave the area if the smell is strong.", time: "0:10" },
        { speaker: "agent", text: "Hi Patricia, this is John. I heard you might have a gas leak. First, are you and your family safe?", time: "0:18" },
        { speaker: "caller", text: "Yes, we're okay, it's a lot of damaged items that need clearing out.", time: "0:24" },
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
      summary: "David inquired about a full estate clearance for a 4-bedroom house. Qualified as hot lead. Requested an in-home estimate.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "I'm looking to get a full house cleared out before selling.", time: "0:05" },
        { speaker: "ai", text: "I'd be happy to help with that. Could you tell me the approximate square footage of your home?", time: "0:10" },
        { speaker: "caller", text: "About 2,500 square feet.", time: "0:15" },
        { speaker: "ai", text: "For a home that size, a full estate clearance typically starts around $800-2,000 depending on the system. We offer free in-home estimates. Would you like to schedule one?", time: "0:20" },
      ],
      actionsTaken: ["Contact created", "Deal created: Estate Clearance", "Estimate visit requested"],
      recordingAvailable: true,
    },
    {
      id: "call-8",
      contactName: "Amanda Foster",
      phoneNumber: "+17045558901",
      direction: "outbound",
      duration: 95,
      timestamp: minutesAgo(380),
      outcome: "booked",
      aiHandled: false,
      summary: "Called Amanda to reschedule her water heater inspection. Moved from Thursday to Friday at 1 PM.",
      transcript: [
        { speaker: "agent", text: "Hi Amanda, this is John from Northern Removals. I need to reschedule your Thursday appointment. Would Friday at 1 PM work instead?", time: "0:00" },
        { speaker: "caller", text: "Friday at 1 works fine for me.", time: "0:08" },
        { speaker: "agent", text: "Perfect, I've updated the schedule. See you Friday!", time: "0:12" },
      ],
      actionsTaken: ["Appointment rescheduled: Fri 1:00 PM"],
      recordingAvailable: true,
    },
    {
      id: "call-9",
      contactName: null,
      phoneNumber: "+17045556789",
      direction: "inbound",
      duration: 0,
      timestamp: minutesAgo(420),
      outcome: "missed",
      aiHandled: false,
      summary: "Missed call from unknown number. No voicemail left.",
      transcript: [],
      actionsTaken: [],
      recordingAvailable: false,
    },
    {
      id: "call-10",
      contactName: "Robert Kim",
      phoneNumber: "+17045551122",
      direction: "inbound",
      duration: 267,
      timestamp: minutesAgo(500),
      outcome: "booked",
      aiHandled: true,
      summary: "Robert called about slow drains in both bathrooms. AI diagnosed likely main line issue. Booked inspection for tomorrow morning.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. This call may be recorded. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "Both my bathrooms have really slow drains. It started a couple days ago.", time: "0:06" },
        { speaker: "ai", text: "When multiple drains are slow at the same time, it could indicate a main line issue. A drain inspection typically starts around $150-200. Would you like to schedule one?", time: "0:14" },
        { speaker: "caller", text: "Yes, as soon as possible please.", time: "0:22" },
        { speaker: "ai", text: "I have tomorrow morning at 9 AM available. Would that work?", time: "0:26" },
        { speaker: "caller", text: "That would be great.", time: "0:30" },
      ],
      actionsTaken: ["Appointment booked: Tomorrow 9:00 AM", "Priority flag set", "Deal created: Drain Inspection"],
      recordingAvailable: true,
    },
    {
      id: "call-11",
      contactName: "Jennifer Park",
      phoneNumber: "+17045553344",
      direction: "outbound",
      duration: 128,
      timestamp: minutesAgo(600),
      outcome: "qualified",
      aiHandled: false,
      summary: "Called Jennifer about her furnace replacement quote. She's comparing with two other companies. Following up next week.",
      transcript: [
        { speaker: "agent", text: "Hi Jennifer, just checking in on the furnace replacement quote we sent over.", time: "0:00" },
        { speaker: "caller", text: "I got it, thanks. I'm comparing with a couple other companies right now.", time: "0:07" },
        { speaker: "agent", text: "Completely understand. Just a reminder our quote includes a 10-year warranty and free first-year maintenance.", time: "0:14" },
      ],
      actionsTaken: ["Deal stage updated: Comparison"],
      recordingAvailable: true,
    },
    {
      id: "call-12",
      contactName: "Tom Bradley",
      phoneNumber: "+17045555566",
      direction: "inbound",
      duration: 89,
      timestamp: minutesAgo(720),
      outcome: "voicemail",
      aiHandled: true,
      summary: "Tom called after hours. AI took a message about needing a thermostat replacement. Will call back during business hours.",
      transcript: [
        { speaker: "ai", text: "Hi, this is Northern Removals's AI assistant. We're currently closed but I can take a message. How can I help?", time: "0:00" },
        { speaker: "caller", text: "My thermostat stopped working and I need it replaced. Can someone call me back?", time: "0:06" },
        { speaker: "ai", text: "Absolutely. I'll have someone call you back first thing tomorrow morning. A thermostat replacement typically runs $150-400. Is there anything else?", time: "0:13" },
      ],
      actionsTaken: ["Callback scheduled: Tomorrow AM", "Contact created"],
      recordingAvailable: true,
    },
    {
      id: "call-13",
      contactName: "Maria Santos",
      phoneNumber: "+17045557788",
      direction: "inbound",
      duration: 345,
      timestamp: minutesAgo(840),
      outcome: "booked",
      aiHandled: false,
      summary: "Maria called about installing a tankless water heater. Extensive consultation. Booked estimate visit for Thursday.",
      transcript: [
        { speaker: "agent", text: "Northern Removals, this is John speaking. How can I help you?", time: "0:00" },
        { speaker: "caller", text: "I'm interested in switching to a tankless water heater. Can you tell me about it?", time: "0:05" },
        { speaker: "agent", text: "Absolutely! Tankless water heaters are great for energy savings. They typically run $2,000-4,500 installed.", time: "0:12" },
      ],
      actionsTaken: ["Estimate visit booked: Thursday", "Deal created: Tankless WH Installation"],
      recordingAvailable: true,
    },
    {
      id: "call-14",
      contactName: null,
      phoneNumber: "+17045559900",
      direction: "inbound",
      duration: 0,
      timestamp: minutesAgo(960),
      outcome: "missed",
      aiHandled: false,
      summary: "Missed call. Likely spam - number flagged by carrier.",
      transcript: [],
      actionsTaken: [],
      recordingAvailable: false,
    },
    {
      id: "call-15",
      contactName: "Kevin Wright",
      phoneNumber: "+17045552233",
      direction: "outbound",
      duration: 210,
      timestamp: minutesAgo(1080),
      outcome: "booked",
      aiHandled: false,
      summary: "Called Kevin to schedule seasonal HVAC maintenance. Booked both AC and furnace tune-ups. Applied loyalty discount.",
      transcript: [
        { speaker: "agent", text: "Hi Kevin, it's John from Northern Removals. I'm calling about your seasonal maintenance.", time: "0:00" },
        { speaker: "caller", text: "Oh right, it's that time of year already. Let's get both done.", time: "0:06" },
        { speaker: "agent", text: "Perfect! Since you're a loyal customer, I can offer you 20% off both tune-ups.", time: "0:12" },
      ],
      actionsTaken: ["Appointment booked: AC tune-up", "Appointment booked: Furnace tune-up", "Loyalty discount applied"],
      recordingAvailable: true,
    },
  ];
}

const MOCK_CALLS = createMockCalls();

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  qualified: { label: "Qualified", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  voicemail: { label: "Voicemail", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  missed: { label: "Missed", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  escalated: { label: "Escalated", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
};

const KEYPAD_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

/* -------------------------------------------------------------------------- */
/*  Components                                                                 */
/* -------------------------------------------------------------------------- */

function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  const config = OUTCOME_CONFIG[outcome];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

function CallListItem({
  call,
  isSelected,
  onClick,
}: {
  call: CallRecord;
  isSelected: boolean;
  onClick: () => void;
}) {
  const displayName = call.contactName ?? formatE164ForDisplay(call.phoneNumber);
  const initials = call.contactName
    ? call.contactName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "#";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors",
        isSelected ? "bg-accent" : "hover:bg-muted/30",
      )}
    >
      <div className="relative">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          call.contactName ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {initials}
        </div>
        {call.aiHandled && (
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {call.direction === "inbound" ? (
              call.outcome === "missed" ? (
                <PhoneMissed className="h-3.5 w-3.5 text-red-500 shrink-0" />
              ) : (
                <PhoneIncoming className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )
            ) : (
              <PhoneOutgoing className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {displayName}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
            {formatTimestamp(call.timestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-muted-foreground">
            {call.duration > 0 ? formatDuration(call.duration) : "No answer"}
          </span>
          <OutcomeBadge outcome={call.outcome} />
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dialer Keypad                                                              */
/* -------------------------------------------------------------------------- */

function DialerKeypad({
  onKeyPress,
  compact = false,
}: {
  onKeyPress: (digit: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3", compact ? "gap-2" : "gap-3")}>
      {KEYPAD_KEYS.map(({ digit, letters }) => (
        <button
          key={digit}
          onClick={() => onKeyPress(digit)}
          className={cn(
            "group flex flex-col items-center justify-center rounded-full border border-border bg-card transition-all",
            "hover:bg-accent hover:border-primary/30 active:scale-95 active:bg-primary/10",
            compact ? "h-12 w-12 mx-auto" : "h-14 w-14 mx-auto",
          )}
        >
          <span className={cn(
            "font-semibold text-foreground group-hover:text-primary transition-colors",
            compact ? "text-lg" : "text-xl",
          )}>
            {digit}
          </span>
          {letters && (
            <span className="text-[9px] tracking-widest text-muted-foreground mt-[-2px]">
              {letters}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Active Call View                                                            */
/* -------------------------------------------------------------------------- */

function ActiveCallView({
  phoneNumber,
  contactName,
  callStatus,
  callTimer,
  onEnd,
  onToggleMute,
  onToggleHold,
  onToggleSpeaker,
  onToggleRecord,
  isMuted,
  isOnHold,
  isSpeaker,
  isRecording,
}: {
  phoneNumber: string;
  contactName: string | null;
  callStatus: CallStatus;
  callTimer: number;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onToggleSpeaker: () => void;
  onToggleRecord: () => void;
  isMuted: boolean;
  isOnHold: boolean;
  isSpeaker: boolean;
  isRecording: boolean;
}) {
  const [showDtmf, setShowDtmf] = useState(false);
  const [callNotes, setCallNotes] = useState("");

  return (
    <div className="flex flex-col h-full">
      {/* Contact info + timer */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          {contactName ? (
            <span className="text-xl font-bold">
              {contactName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
          ) : (
            <User className="h-7 w-7" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {contactName ?? "Unknown Caller"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatE164ForDisplay(phoneNumber)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            callStatus === "ringing"
              ? "bg-amber-500/10 text-amber-600 animate-pulse"
              : callStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-600"
                : callStatus === "on-hold"
                  ? "bg-orange-500/10 text-orange-600"
                  : "bg-muted text-muted-foreground",
          )}>
            {callStatus === "ringing" ? "Ringing..." : callStatus === "connected" ? "Connected" : callStatus === "on-hold" ? "On Hold" : ""}
          </span>
        </div>
        <p className={cn(
          "text-3xl font-mono font-light text-foreground mt-2 tabular-nums",
          callStatus === "connected" && "animate-[pulse_2s_ease-in-out_infinite]",
        )}>
          {formatTimerDisplay(callTimer)}
        </p>
      </div>

      {/* DTMF Overlay */}
      {showDtmf && (
        <div className="px-6 pb-4">
          <DialerKeypad onKeyPress={() => {}} compact />
        </div>
      )}

      {/* Action buttons */}
      {!showDtmf && (
        <div className="grid grid-cols-3 gap-4 px-8 py-4">
          <button
            onClick={onToggleMute}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              isMuted
                ? "bg-red-500/10 text-red-600"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="text-[10px] font-medium">Mute</span>
          </button>

          <button
            onClick={onToggleHold}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              isOnHold
                ? "bg-orange-500/10 text-orange-600"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {isOnHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            <span className="text-[10px] font-medium">Hold</span>
          </button>

          <button
            onClick={onToggleSpeaker}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              isSpeaker
                ? "bg-blue-500/10 text-blue-600"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Volume2 className="h-5 w-5" />
            <span className="text-[10px] font-medium">Speaker</span>
          </button>

          <button
            onClick={onToggleRecord}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              isRecording
                ? "bg-red-500/10 text-red-600"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <div className="relative">
              <Circle className="h-5 w-5" />
              {isRecording && (
                <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-medium">Record</span>
          </button>

          <button className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-muted-foreground hover:bg-muted transition-all">
            <ArrowRightLeft className="h-5 w-5" />
            <span className="text-[10px] font-medium">Transfer</span>
          </button>

          <button
            onClick={() => setShowDtmf(!showDtmf)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              showDtmf
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Hash className="h-5 w-5" />
            <span className="text-[10px] font-medium">Keypad</span>
          </button>
        </div>
      )}

      {/* Notes area */}
      <div className="px-6 py-2 flex-1">
        <textarea
          value={callNotes}
          onChange={(e) => setCallNotes(e.target.value)}
          placeholder="Add call notes..."
          className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />
      </div>

      {/* Live AI transcript */}
      <div className="px-6 pb-2">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Listening</span>
            <div className="flex gap-0.5 ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            &quot;...Yes, I can schedule that for next Tuesday afternoon. Does 2 PM work for you?&quot;
          </p>
        </div>
      </div>

      {/* End call button */}
      <div className="p-6 pt-2">
        <button
          onClick={onEnd}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 py-3.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-lg shadow-red-600/20"
        >
          <Phone className="h-4 w-4 rotate-[135deg]" />
          End Call
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Call Summary View                                                          */
/* -------------------------------------------------------------------------- */

function CallSummaryView({
  call,
  onClose,
  onCallAgain,
}: {
  call: CallRecord;
  onClose: () => void;
  onCallAgain: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">Call Summary</h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Duration + recording */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDuration(call.duration)}
          </div>
          {call.recordingAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
              <Circle className="h-2 w-2 fill-current" />
              Recording Available
            </span>
          )}
        </div>

        {/* AI Summary */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Bot className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              AI Summary
            </h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {call.summary}
          </p>
        </div>

        {/* Actions taken */}
        {call.actionsTaken.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Actions Taken
            </h4>
            <div className="space-y-1.5">
              {call.actionsTaken.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          {call.recordingAvailable && (
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Play className="h-4 w-4" />
              Play Recording
            </button>
          )}
          {!call.contactName && (
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <UserPlus className="h-4 w-4" />
              Add to Contacts
            </button>
          )}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <CalendarPlus className="h-4 w-4" />
            Book Follow-Up
          </button>
          <button
            onClick={onCallAgain}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Selected Call Detail (within left panel)                                    */
/* -------------------------------------------------------------------------- */

function CallDetailPanel({ call }: { call: CallRecord }) {
  const router = useRouter();

  return (
    <div className="border-t border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Summary</span>
        </div>
        <button
          onClick={() => router.push(`/dashboard/calls/${call.id}`)}
          className="text-xs text-primary hover:underline font-medium"
        >
          View Full Details
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {call.summary}
      </p>
      {call.actionsTaken.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {call.actionsTaken.slice(0, 3).map((action, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-medium"
            >
              {action}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function CallsPage() {
  usePageTitle("Calls");
  const router = useRouter();

  // Fetch call history via API, fall back to mock data on network error
  const { data: callRecords, isLoading: callsLoading } = useApiQuery<CallRecord[]>(
    "/orgs/:orgId/calls",
    MOCK_CALLS,
  );

  // Call history state
  const [activeTab, setActiveTab] = useState<CallTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Dialer state — raw digits (no formatting in state)
  const [rawDigits, setRawDigits] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [activeCallContact, setActiveCallContact] = useState<string | null>(null);
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [lastCallData, setLastCallData] = useState<CallRecord | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);

  // Caller-from state
  const { numbers: callerNumbers, loading: numbersLoading } = useCallerNumbers();
  const [selectedFromSid, setSelectedFromSid] = useState<string | null>(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);

  // Auto-select first number when loaded
  useEffect(() => {
    if (callerNumbers.length > 0 && selectedFromSid === null) {
      setSelectedFromSid(callerNumbers[0].sid);
    }
  }, [callerNumbers, selectedFromSid]);

  const selectedFrom = callerNumbers.find((n) => n.sid === selectedFromSid) ?? null;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived from rawDigits
  const displayFormatted = formatPhoneNumber(rawDigits);
  const detectedCountry = detectCountry(rawDigits);
  const numberValid = isValidNumber(rawDigits);

  // The actual list to filter from (API data or mock fallback)
  const activeCalls = callsLoading ? [] : callRecords;

  // Filter calls
  const filteredCalls = useMemo(() => {
    return activeCalls.filter((call) => {
      // Tab filter
      if (activeTab === "inbound" && call.direction !== "inbound") return false;
      if (activeTab === "outbound" && call.direction !== "outbound") return false;
      if (activeTab === "ai" && !call.aiHandled) return false;
      if (activeTab === "missed" && call.outcome !== "missed") return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = call.contactName?.toLowerCase().includes(q);
        const matchesPhone = call.phoneNumber.includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      return true;
    });
  }, [activeCalls, activeTab, searchQuery]);

  const selectedCall = useMemo(
    () => activeCalls.find((c) => c.id === selectedCallId) ?? null,
    [activeCalls, selectedCallId],
  );

  // Poll for call status updates from Twilio
  const startStatusPolling = useCallback((callSid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/webhooks/twilio/call-status/${callSid}`);
        if (!res.ok) return;

        const data = await res.json() as { status: string; duration: number };
        const status = data.status;

        if (status === "in-progress" || status === "answered") {
          setCallStatus("connected");
          if (!timerRef.current) {
            timerRef.current = setInterval(() => {
              setCallTimer((prev) => prev + 1);
            }, 1000);
          }
        } else if (status === "ringing") {
          setCallStatus("ringing");
        } else if (status === "completed" || status === "busy" || status === "no-answer" || status === "canceled" || status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (status === "failed") {
            setCallError("Call failed. The number may be unreachable.");
          } else if (status === "busy") {
            setCallError("Line is busy. Try again later.");
          } else if (status === "no-answer") {
            setCallError("No answer. Try again later.");
          }
          // For completed calls, show summary
          if (status === "completed" && callTimer > 0) {
            setCallStatus("ended");
          } else {
            setCallStatus("idle");
          }
          setActiveCallSid(null);
        }
      } catch {
        // Network error — keep polling
      }
    }, 2000);
  }, [callTimer]);

  // Real call via Twilio API
  const startCall = useCallback(async (number: string, contactName: string | null) => {
    setActiveCallNumber(number);
    setActiveCallContact(contactName);
    setCallError(null);
    setCallStatus("ringing");
    setCallTimer(0);
    setIsMuted(false);
    setIsOnHold(false);
    setIsSpeaker(false);
    setIsRecording(true);
    setShowCallSummary(false);

    const fromNumber = selectedFrom?.phoneNumber;

    try {
      const res = await fetch(`${API_BASE}/webhooks/twilio/outbound-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: number,
          ...(fromNumber ? { from: fromNumber } : {}),
        }),
      });

      const data = await res.json() as { success?: boolean; callSid?: string; error?: string };

      if (!res.ok || !data.success) {
        setCallError(data.error || "Call failed. Check your Twilio setup.");
        setCallStatus("idle");
        return;
      }

      // Call initiated — start polling for real status
      if (data.callSid) {
        setActiveCallSid(data.callSid);
        startStatusPolling(data.callSid);
      }
    } catch {
      setCallError("Cannot reach the server. Make sure the API is running.");
      setCallStatus("idle");
    }
  }, [selectedFrom, startStatusPolling]);

  const endCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setCallStatus("ended");

    const endedCall: CallRecord = {
      id: `call-new-${Date.now()}`,
      contactName: activeCallContact,
      phoneNumber: activeCallNumber,
      direction: "outbound",
      duration: callTimer,
      timestamp: new Date(),
      outcome: "qualified",
      aiHandled: false,
      summary: `Outbound call to ${activeCallContact ?? formatE164ForDisplay(activeCallNumber)}. Call lasted ${formatDuration(callTimer)}.`,
      transcript: [],
      actionsTaken: ["Call logged"],
      recordingAvailable: false,
    };

    setLastCallData(endedCall);
    setShowCallSummary(true);
    setActiveCallSid(null);
  }, [activeCallContact, activeCallNumber, callTimer]);

  const resetDialer = useCallback(() => {
    setCallStatus("idle");
    setCallTimer(0);
    setShowCallSummary(false);
    setLastCallData(null);
    setActiveCallNumber("");
    setActiveCallContact(null);
    setRawDigits("");
    setCallError(null);
    setActiveCallSid(null);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Handle keypad press
  const handleKeyPress = useCallback((digit: string) => {
    setCallError(null);
    setRawDigits((prev) => {
      const max = maxDigitsForCountry(prev);
      if (prev.length >= max) return prev;
      return prev + digit;
    });
  }, []);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    setCallError(null);
    setRawDigits((prev) => {
      if (prev.length === 0) return "";
      return prev.slice(0, -1);
    });
  }, []);

  // Handle text input (paste support)
  const handleInputChange = useCallback((value: string) => {
    setCallError(null);
    const digits = stripToDigits(value);
    const max = maxDigitsForCountry(digits);
    setRawDigits(digits.slice(0, max));
  }, []);

  // Click a contact in call history -> fill dialer
  const handleSelectContact = useCallback((call: CallRecord) => {
    setSelectedCallId(call.id);
    if (callStatus === "idle" && !showCallSummary) {
      const digits = stripToDigits(call.phoneNumber);
      setRawDigits(digits);
      setActiveCallContact(call.contactName);
    }
  }, [callStatus, showCallSummary]);

  const handleCallButton = useCallback(async () => {
    if (!numberValid) return;
    setCallError(null);
    const e164 = toE164(rawDigits);
    await startCall(e164, activeCallContact);
  }, [rawDigits, numberValid, activeCallContact, startCall]);

  const missedCount = activeCalls.filter((c) => c.outcome === "missed").length;
  const tabs: { key: CallTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "inbound", label: "Inbound" },
    { key: "outbound", label: "Outbound" },
    { key: "ai", label: "AI Handled" },
    { key: "missed", label: "Missed", count: missedCount },
  ];

  // Loading state — show skeleton while initial fetch is in progress
  if (callsLoading) {
    return <CallsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calls</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCalls.length === 0
              ? "No call history yet"
              : "Manage calls, view history, and make outbound calls"}
          </p>
        </div>
        <Link
          href="/dashboard/settings/phone"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          Phone Settings
        </Link>
      </div>

      <div className="flex h-[calc(100vh-13rem)] rounded-xl border border-border bg-card overflow-hidden">
        {/* ---------------------------------------------------------------- */}
        {/*  Left Panel: Call History                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-[420px] shrink-0 flex-col border-r border-border">
          {/* Search + tabs */}
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calls by name or number..."
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      "ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      activeTab === tab.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-red-500/10 text-red-600",
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Call list */}
          <div className="flex-1 overflow-y-auto">
            {filteredCalls.map((call) => (
              <div key={call.id}>
                <CallListItem
                  call={call}
                  isSelected={selectedCallId === call.id}
                  onClick={() => handleSelectContact(call)}
                />
                {selectedCallId === call.id && (
                  <CallDetailPanel call={call} />
                )}
              </div>
            ))}
            {filteredCalls.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                  <PhoneCall className="h-7 w-7 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {activeCalls.length === 0 ? "No call history yet" : "No calls found"}
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {activeCalls.length === 0
                    ? "Connect your phone number to start receiving and making calls. Your AI agent will answer automatically."
                    : "Try a different search or filter."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/*  Right Panel: Dialer / Active Call / Summary                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-1 flex-col">
          {/* Active call view */}
          {(callStatus === "ringing" || callStatus === "connected" || callStatus === "on-hold") && (
            <ActiveCallView
              phoneNumber={activeCallNumber}
              contactName={activeCallContact}
              callStatus={callStatus}
              callTimer={callTimer}
              onEnd={endCall}
              onToggleMute={() => setIsMuted(!isMuted)}
              onToggleHold={() => {
                setIsOnHold(!isOnHold);
                setCallStatus(isOnHold ? "connected" : "on-hold");
              }}
              onToggleSpeaker={() => setIsSpeaker(!isSpeaker)}
              onToggleRecord={() => setIsRecording(!isRecording)}
              isMuted={isMuted}
              isOnHold={isOnHold}
              isSpeaker={isSpeaker}
              isRecording={isRecording}
            />
          )}

          {/* Call summary view */}
          {showCallSummary && lastCallData && callStatus === "ended" && (
            <CallSummaryView
              call={lastCallData}
              onClose={resetDialer}
              onCallAgain={() => {
                const digits = stripToDigits(lastCallData.phoneNumber);
                resetDialer();
                setRawDigits(digits);
                setActiveCallContact(lastCallData.contactName);
              }}
            />
          )}

          {/* Dialer view (when idle) */}
          {callStatus === "idle" && !showCallSummary && (
            <div className="flex flex-col h-full items-center justify-center">
              <div className="w-full max-w-xs space-y-6">
                {/* Phone input with country flag */}
                <div className="text-center">
                  <div className="relative flex items-center">
                    {rawDigits.length > 0 && (
                      <span className="text-2xl mr-1.5 shrink-0" title={detectedCountry.name}>
                        {detectedCountry.flag}
                      </span>
                    )}
                    <input
                      value={displayFormatted}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Enter number..."
                      className="w-full text-center text-2xl font-light tracking-wider bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-2"
                    />
                    {rawDigits.length > 0 && (
                      <button
                        onClick={handleBackspace}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <Delete className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-border mt-1" />
                </div>

                {/* Keypad */}
                <DialerKeypad onKeyPress={handleKeyPress} />

                {/* Call button */}
                <button
                  onClick={handleCallButton}
                  disabled={!numberValid || (callerNumbers.length === 0 && !numbersLoading)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all shadow-lg",
                    numberValid && callerNumbers.length > 0
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-600/20"
                      : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Call
                </button>

                {/* Inline error message */}
                {callError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{callError}</span>
                  </div>
                )}

                {/* Calling from — dynamic */}
                <div className="text-center">
                  {numbersLoading ? (
                    <p className="text-xs text-muted-foreground">Loading numbers...</p>
                  ) : callerNumbers.length === 0 ? (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>
                        No number configured &mdash;{" "}
                        <Link href="/dashboard/settings/phone" className="text-primary hover:underline font-medium">
                          Set up in Phone Settings
                        </Link>
                      </span>
                    </p>
                  ) : callerNumbers.length === 1 ? (
                    <p className="text-xs text-muted-foreground">
                      Calling from:{" "}
                      <span className="font-medium text-foreground">
                        {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                      </span>
                    </p>
                  ) : (
                    /* Multiple numbers — dropdown */
                    <div className="relative inline-block">
                      <button
                        onClick={() => setShowFromDropdown(!showFromDropdown)}
                        className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                      >
                        Calling from:{" "}
                        <span className="font-medium text-foreground">
                          {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showFromDropdown && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-10">
                          {callerNumbers.map((num) => (
                            <button
                              key={num.sid}
                              onClick={() => {
                                setSelectedFromSid(num.sid);
                                setShowFromDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                                num.sid === selectedFromSid && "bg-muted font-medium",
                              )}
                            >
                              <span className="text-foreground">
                                {formatE164ForDisplay(num.phoneNumber)}
                              </span>
                              {num.friendlyName && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {num.friendlyName}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick dial */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                    Quick Dial
                  </p>
                  <div className="flex justify-center gap-4">
                    {QUICK_DIAL_CONTACTS.map((contact) => (
                      <button
                        key={contact.phone}
                        onClick={() => {
                          const digits = stripToDigits(contact.phone);
                          setRawDigits(digits);
                          setActiveCallContact(contact.name);
                        }}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full text-white text-xs font-bold transition-transform group-hover:scale-110",
                          contact.color,
                        )}>
                          {contact.initials}
                        </div>
                        <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                          {contact.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
