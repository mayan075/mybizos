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
  CalendarPlus,
  UserPlus,
  PhoneCall,
  Delete,
  Settings2,
  ChevronDown,
  AlertCircle,
  PhoneOff,
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
  duration: number;
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
        // API not available
      }

      setLoading(false);
    }

    load();
  }, []);

  return { numbers, loading };
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
    <div className={cn("grid grid-cols-3", compact ? "gap-2" : "gap-2.5")}>
      {KEYPAD_KEYS.map(({ digit, letters }) => (
        <button
          key={digit}
          onClick={() => onKeyPress(digit)}
          className={cn(
            "group flex flex-col items-center justify-center rounded-full border border-border bg-card transition-all",
            "hover:bg-accent hover:border-primary/30 active:scale-95 active:bg-primary/10",
            compact ? "h-12 w-12 mx-auto" : "h-[56px] w-[56px] mx-auto",
          )}
        >
          <span className={cn(
            "font-semibold text-foreground group-hover:text-primary transition-colors leading-none",
            compact ? "text-lg" : "text-xl",
          )}>
            {digit}
          </span>
          {letters && (
            <span className="text-[8px] tracking-widest text-muted-foreground mt-[-1px]">
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
          <PhoneOff className="h-4 w-4" />
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

  // Fetch call history via API — no mock fallback
  const { data: callRecords, isLoading: callsLoading } = useApiQuery<CallRecord[]>(
    "/orgs/:orgId/calls",
    [],
  );

  // Call history state
  const [activeTab, setActiveTab] = useState<CallTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Dialer state
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

  // The actual list (API data, no mock fallback)
  const activeCalls = callsLoading ? [] : callRecords;

  // Filter calls
  const filteredCalls = useMemo(() => {
    return activeCalls.filter((call) => {
      if (activeTab === "inbound" && call.direction !== "inbound") return false;
      if (activeTab === "outbound" && call.direction !== "outbound") return false;
      if (activeTab === "ai" && !call.aiHandled) return false;
      if (activeTab === "missed" && call.outcome !== "missed") return false;

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

  // Handle clear all (long press)
  const handleClearAll = useCallback(() => {
    setCallError(null);
    setRawDigits("");
  }, []);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteDown = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      handleClearAll();
      longPressRef.current = null;
    }, 500);
  }, [handleClearAll]);

  const handleDeleteUp = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
      handleBackspace();
    }
  }, [handleBackspace]);

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

  // Loading state
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
        {/*  Left Panel: Call History (60%)                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-[60%] min-w-0 flex-col border-r border-border">
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
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-5">
                  <PhoneCall className="h-8 w-8 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1.5">
                  {activeCalls.length === 0 ? "No call history yet" : "No calls found"}
                </p>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  {activeCalls.length === 0
                    ? "No call history yet. Use the dialer to make your first call."
                    : "Try a different search or filter."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/*  Right Panel: Dialer / Active Call / Summary (40%)               */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-[40%] min-w-0 flex-col bg-card">
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
            <div className="flex flex-col h-full">
              {/* Calling from — prominent at top */}
              <div className="border-b border-border px-5 py-3">
                {numbersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading numbers...</p>
                ) : callerNumbers.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      No phone number configured{" "}
                      <Link href="/dashboard/settings/phone" className="text-primary hover:underline font-semibold">
                        Set up now
                      </Link>
                    </span>
                  </div>
                ) : callerNumbers.length === 1 ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Calling from</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowFromDropdown(!showFromDropdown)}
                      className="flex items-center gap-2 text-sm hover:bg-muted rounded-md px-2 py-1 -mx-2 -my-1 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Calling from</span>
                      <span className="font-semibold text-foreground">
                        {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {showFromDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-10">
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

              {/* Number display bar */}
              <div className="px-5 pt-6 pb-2">
                <div className="flex items-center justify-center min-h-[56px] rounded-xl bg-muted/50 border border-border px-4">
                  {rawDigits.length > 0 && (
                    <span className="text-2xl mr-2 shrink-0" title={detectedCountry.name}>
                      {detectedCountry.flag}
                    </span>
                  )}
                  <input
                    value={displayFormatted}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Enter number..."
                    className="flex-1 text-center text-2xl font-mono font-medium tracking-wider bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-2 min-w-0"
                  />
                  {rawDigits.length > 0 && (
                    <button
                      onMouseDown={handleDeleteDown}
                      onMouseUp={handleDeleteUp}
                      onMouseLeave={handleDeleteUp}
                      onTouchStart={handleDeleteDown}
                      onTouchEnd={handleDeleteUp}
                      title="Tap to delete one digit, hold to clear all"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded-md hover:bg-muted active:bg-red-50 active:text-red-500"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Keypad */}
              <div className="flex-1 flex items-center justify-center px-5">
                <DialerKeypad onKeyPress={handleKeyPress} />
              </div>

              {/* Call button */}
              <div className="px-5 pb-3">
                <button
                  onClick={handleCallButton}
                  disabled={!numberValid || (callerNumbers.length === 0 && !numbersLoading)}
                  className={cn(
                    "flex h-14 w-14 mx-auto items-center justify-center rounded-full text-white transition-all shadow-lg",
                    numberValid && callerNumbers.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                  )}
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>

              {/* Inline error message */}
              {callError && (
                <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{callError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
