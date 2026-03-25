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
  Loader2,
  Wifi,
  WifiOff,
  Settings,
  Link as LinkIcon,
  ShieldAlert,
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
import {
  initDevice,
  makeCall,
  hangUp,
  toggleMute,
  sendDigits,
  subscribe,
  runVoiceSetup,
  clearError,
  type TwilioCallState,
  type DeviceStatus,
} from "@/lib/twilio-device";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type CallDirection = "inbound" | "outbound";
type CallOutcome = "booked" | "qualified" | "voicemail" | "missed" | "escalated";
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
/*  Hook: useTwilioDevice — subscribe to Voice SDK singleton state             */
/* -------------------------------------------------------------------------- */

function useTwilioDevice() {
  const [state, setState] = useState<TwilioCallState>({
    deviceStatus: "uninitialized",
    callStatus: "idle",
    remoteNumber: null,
    isMuted: false,
    error: null,
    needsSetup: false,
  });

  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

/* -------------------------------------------------------------------------- */
/*  Hook: useMicrophonePermission                                              */
/* -------------------------------------------------------------------------- */

type MicPermission = "unknown" | "granted" | "denied" | "prompt" | "checking";

function useMicrophonePermission() {
  const [permission, setPermission] = useState<MicPermission>("unknown");

  useEffect(() => {
    async function checkPermission() {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setPermission(result.state as MicPermission);
          result.addEventListener("change", () => {
            setPermission(result.state as MicPermission);
          });
        }
      } catch {
        setPermission("unknown");
      }
    }
    checkPermission();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setPermission("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermission("granted");
      return true;
    } catch {
      setPermission("denied");
      return false;
    }
  }, []);

  return { permission, requestPermission };
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
  const cfg = OUTCOME_CONFIG[outcome];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", cfg.className)}>
      {cfg.label}
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
/*  Device Status Badge                                                        */
/* -------------------------------------------------------------------------- */

function DeviceStatusBadge({ status, error }: { status: DeviceStatus; error?: string | null }) {
  if (status === "registered") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
        <Wifi className="h-2.5 w-2.5" />
        Ready
      </span>
    );
  }
  if (status === "initializing") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-600">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Connecting...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-500" title={error ?? "Disconnected"}>
        <WifiOff className="h-2.5 w-2.5" />
        {error ? "Error" : "Disconnected"}
      </span>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Active Call View — uses Voice SDK state                                    */
/* -------------------------------------------------------------------------- */

function ActiveCallView({
  phoneNumber,
  contactName,
  callStatus,
  callTimer,
  onEnd,
  onToggleMute,
  onSendDigits,
  isMuted,
}: {
  phoneNumber: string;
  contactName: string | null;
  callStatus: "connecting" | "ringing" | "open";
  callTimer: number;
  onEnd: () => void;
  onToggleMute: () => void;
  onSendDigits: (digit: string) => void;
  isMuted: boolean;
}) {
  const [showDtmf, setShowDtmf] = useState(false);
  const [callNotes, setCallNotes] = useState("");

  const statusLabel =
    callStatus === "connecting"
      ? "Connecting..."
      : callStatus === "ringing"
        ? "Ringing..."
        : "Connected";

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
            callStatus === "connecting"
              ? "bg-blue-500/10 text-blue-600 animate-pulse"
              : callStatus === "ringing"
                ? "bg-amber-500/10 text-amber-600 animate-pulse"
                : "bg-emerald-500/10 text-emerald-600",
          )}>
            {statusLabel}
          </span>
        </div>
        <p className="text-3xl font-mono font-light text-foreground mt-2 tabular-nums">
          {formatTimerDisplay(callTimer)}
        </p>
      </div>

      {/* DTMF Overlay */}
      {showDtmf && (
        <div className="px-6 pb-4">
          <DialerKeypad onKeyPress={onSendDigits} compact />
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
            className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-muted-foreground hover:bg-muted transition-all cursor-not-allowed opacity-50"
            title="Hold not available with browser calling"
          >
            <Pause className="h-5 w-5" />
            <span className="text-[10px] font-medium">Hold</span>
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

      {/* End call button — BIG RED */}
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
  phoneNumber,
  contactName,
  duration,
  onClose,
  onCallAgain,
}: {
  phoneNumber: string;
  contactName: string | null;
  duration: number;
  onClose: () => void;
  onCallAgain: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">Call Ended</h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Contact info */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            {contactName ? (
              <span className="text-lg font-bold">
                {contactName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {contactName ?? formatE164ForDisplay(phoneNumber)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatE164ForDisplay(phoneNumber)}
          </p>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDuration(duration)}
          </div>
        </div>

        {/* Summary text */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <PhoneOutgoing className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Call Summary
            </h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Outbound call to {contactName ?? formatE164ForDisplay(phoneNumber)}. Duration: {formatDuration(duration)}.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <CalendarPlus className="h-4 w-4" />
            Book Follow-Up
          </button>
          {!contactName && (
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <UserPlus className="h-4 w-4" />
              Add to Contacts
            </button>
          )}
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
/*  Helper: Log call to API on end                                             */
/* -------------------------------------------------------------------------- */

async function logCallToApi(params: {
  phoneNumber: string;
  direction: "inbound" | "outbound";
  duration: number;
  contactName: string | null;
}) {
  try {
    const path = buildPath("/orgs/:orgId/calls/log");
    await tryFetch(() =>
      apiClient.post(path, {
        phoneNumber: params.phoneNumber,
        direction: params.direction,
        durationSeconds: params.duration,
        contactName: params.contactName,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    // Fire-and-forget: don't block the UI if logging fails
  }
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function CallsPage() {
  usePageTitle("Calls");

  // Fetch call history via API
  const { data: callRecords, isLoading: callsLoading, refetch: refetchCalls } = useApiQuery<CallRecord[]>(
    "/orgs/:orgId/calls",
    [],
  );

  // Call history state
  const [activeTab, setActiveTab] = useState<CallTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Dialer input state
  const [rawDigits, setRawDigits] = useState("");
  const [activeCallContact, setActiveCallContact] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  // Post-call state
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [lastCallNumber, setLastCallNumber] = useState("");
  const [lastCallContact, setLastCallContact] = useState<string | null>(null);
  const [lastCallDuration, setLastCallDuration] = useState(0);

  // Setup state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Twilio Voice SDK state (singleton)
  const twilioState = useTwilioDevice();
  const {
    deviceStatus,
    callStatus: sdkCallStatus,
    isMuted,
    error: deviceError,
    needsSetup,
    remoteNumber,
  } = twilioState;

  // Caller-from state
  const { numbers: callerNumbers, loading: numbersLoading } = useCallerNumbers();
  const [selectedFromSid, setSelectedFromSid] = useState<string | null>(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);

  // Microphone permission
  const { permission: micPermission, requestPermission: requestMicPermission } =
    useMicrophonePermission();

  // Auto-select first number when loaded
  useEffect(() => {
    if (callerNumbers.length > 0 && selectedFromSid === null) {
      setSelectedFromSid(callerNumbers[0].sid);
    }
  }, [callerNumbers, selectedFromSid]);

  const selectedFrom = callerNumbers.find((n) => n.sid === selectedFromSid) ?? null;

  // Initialize Twilio Device when page loads
  useEffect(() => {
    if (deviceStatus === "uninitialized") {
      initDevice();
    }
  }, [deviceStatus]);

  // Call timer
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number | null>(null);

  // Track the number we dialed (since remoteNumber comes from SDK)
  const dialedNumberRef = useRef<string>("");

  // Manage call timer based on SDK callStatus
  useEffect(() => {
    if (sdkCallStatus === "open") {
      if (!timerRef.current) {
        callStartRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setCallTimer((prev) => prev + 1);
        }, 1000);
      }
    } else if (sdkCallStatus === "idle" || sdkCallStatus === "closed") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Call just ended — show summary if we had an active call
      if (sdkCallStatus === "idle" && dialedNumberRef.current && callStartRef.current) {
        const finalDuration = Math.round((Date.now() - callStartRef.current) / 1000);
        setLastCallNumber(dialedNumberRef.current);
        setLastCallContact(activeCallContact);
        setLastCallDuration(finalDuration);
        setShowCallSummary(true);

        // Log the call to the API
        logCallToApi({
          phoneNumber: dialedNumberRef.current,
          direction: "outbound",
          duration: finalDuration,
          contactName: activeCallContact,
        }).then(() => {
          // Refresh call history
          refetchCalls();
        });

        dialedNumberRef.current = "";
        callStartRef.current = null;
        setCallTimer(0);
      }
    }
  }, [sdkCallStatus, activeCallContact, refetchCalls]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Derived from rawDigits
  const displayFormatted = formatPhoneNumber(rawDigits);
  const detectedCountry = detectCountry(rawDigits);
  const numberValid = isValidNumber(rawDigits);

  // Is there an active call via Voice SDK?
  const isCallActive =
    sdkCallStatus === "connecting" ||
    sdkCallStatus === "ringing" ||
    sdkCallStatus === "open";

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

  // ── Handlers ──────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (!numberValid) return;
    clearError();
    setCallError(null);
    setSetupError(null);
    setShowCallSummary(false);

    // Check microphone permission first
    if (micPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return;
    }

    const toNumber = toE164(rawDigits);
    dialedNumberRef.current = toNumber;
    setCallTimer(0);
    callStartRef.current = null;

    await makeCall(toNumber);
  }, [numberValid, rawDigits, micPermission, requestMicPermission]);

  const endCall = useCallback(() => {
    hangUp();
  }, []);

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, []);

  const handleSendDigits = useCallback((digit: string) => {
    sendDigits(digit);
  }, []);

  const handleSetup = useCallback(async () => {
    setIsSettingUp(true);
    setSetupError(null);

    if (!numbersLoading && callerNumbers.length === 0) {
      setSetupError("Connect your phone number first. Go to Phone Settings to add a Twilio number.");
      setIsSettingUp(false);
      return;
    }

    const result = await runVoiceSetup();
    setIsSettingUp(false);

    if (result.success) {
      await initDevice();
    } else {
      setSetupError(result.error ?? "Setup failed. Check your Twilio configuration and try again.");
    }
  }, [numbersLoading, callerNumbers.length]);

  const resetDialer = useCallback(() => {
    setShowCallSummary(false);
    setLastCallNumber("");
    setLastCallContact(null);
    setLastCallDuration(0);
    setRawDigits("");
    setCallError(null);
    setActiveCallContact(null);
  }, []);

  // Handle keypad press
  const handleKeyPress = useCallback((digit: string) => {
    clearError();
    setCallError(null);
    setSetupError(null);

    if (isCallActive) {
      sendDigits(digit);
      return;
    }

    setRawDigits((prev) => {
      const max = maxDigitsForCountry(prev);
      if (prev.length >= max) return prev;
      return prev + digit;
    });
  }, [isCallActive]);

  const handleBackspace = useCallback(() => {
    clearError();
    setCallError(null);
    setRawDigits((prev) => {
      if (prev.length === 0) return "";
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    clearError();
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

  const handleInputChange = useCallback((value: string) => {
    clearError();
    setCallError(null);
    const digits = stripToDigits(value);
    const max = maxDigitsForCountry(digits);
    setRawDigits(digits.slice(0, max));
  }, []);

  // Click a contact in call history -> fill dialer
  const handleSelectContact = useCallback((call: CallRecord) => {
    setSelectedCallId(call.id);
    if (!isCallActive && !showCallSummary) {
      const digits = stripToDigits(call.phoneNumber);
      setRawDigits(digits);
      setActiveCallContact(call.contactName);
    }
  }, [isCallActive, showCallSummary]);

  const handleCallButton = useCallback(async () => {
    await startCall();
  }, [startCall]);

  const missedCount = activeCalls.filter((c) => c.outcome === "missed").length;
  const tabs: { key: CallTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "inbound", label: "Inbound" },
    { key: "outbound", label: "Outbound" },
    { key: "ai", label: "AI Handled" },
    { key: "missed", label: "Missed", count: missedCount },
  ];

  // The display number for active call
  const displayCallNumber = remoteNumber
    ? formatE164ForDisplay(remoteNumber)
    : dialedNumberRef.current
      ? formatE164ForDisplay(dialedNumberRef.current)
      : "";

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
        <div className="flex items-center gap-2">
          <DeviceStatusBadge status={deviceStatus} error={deviceError} />
          <Link
            href="/dashboard/settings/phone"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Phone Settings
          </Link>
        </div>
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
          {/* ── Setup required prompt ─────────────────────────────────── */}
          {needsSetup && !isCallActive && !showCallSummary && (
            <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-3">
                <Settings className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Browser Calling Setup
              </p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {callerNumbers.length === 0 && !numbersLoading
                  ? "You need a phone number to make calls."
                  : "One-time setup to enable calling through your browser."}
              </p>

              {callerNumbers.length === 0 && !numbersLoading ? (
                <Link
                  href="/dashboard/settings/phone"
                  className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Connect Phone Number
                </Link>
              ) : (
                <button
                  onClick={handleSetup}
                  disabled={isSettingUp}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all",
                    isSettingUp
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                  )}
                >
                  {isSettingUp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSettingUp ? "Setting up..." : "Enable Browser Calling"}
                </button>
              )}

              {setupError && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-600 text-left w-full">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{setupError}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Active call view (Voice SDK) ─────────────────────────── */}
          {isCallActive && (
            <ActiveCallView
              phoneNumber={remoteNumber ?? dialedNumberRef.current}
              contactName={activeCallContact}
              callStatus={sdkCallStatus as "connecting" | "ringing" | "open"}
              callTimer={callTimer}
              onEnd={endCall}
              onToggleMute={handleToggleMute}
              onSendDigits={handleSendDigits}
              isMuted={isMuted}
            />
          )}

          {/* ── Call summary view ─────────────────────────────────────── */}
          {showCallSummary && !isCallActive && (
            <CallSummaryView
              phoneNumber={lastCallNumber}
              contactName={lastCallContact}
              duration={lastCallDuration}
              onClose={resetDialer}
              onCallAgain={() => {
                const digits = stripToDigits(lastCallNumber);
                resetDialer();
                setRawDigits(digits);
                setActiveCallContact(lastCallContact);
              }}
            />
          )}

          {/* ── Dialer view (when idle and device is ready) ───────────── */}
          {!isCallActive && !showCallSummary && !needsSetup && (
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

              {/* Mic blocked warning */}
              {micPermission === "denied" && (
                <div className="mx-5 mb-1 flex items-start gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-[10px] text-amber-700">
                  <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    Microphone blocked. Go to your browser settings to allow microphone access for this site.
                  </span>
                </div>
              )}

              {/* Keypad */}
              <div className="flex-1 flex items-center justify-center px-5">
                <DialerKeypad onKeyPress={handleKeyPress} />
              </div>

              {/* Call button */}
              <div className="px-5 pb-3">
                <button
                  onClick={handleCallButton}
                  disabled={
                    !numberValid ||
                    deviceStatus !== "registered" ||
                    (callerNumbers.length === 0 && !numbersLoading)
                  }
                  className={cn(
                    "flex h-14 w-14 mx-auto items-center justify-center rounded-full text-white transition-all shadow-lg",
                    numberValid && deviceStatus === "registered" && callerNumbers.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                  )}
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>

              {/* Inline error message */}
              {(callError || deviceError) && (
                <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{callError || deviceError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
