"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  X,
  Minus,
  Mic,
  MicOff,
  User,
  Delete,
  ChevronDown,
  AlertCircle,
  PhoneOff,
  Loader2,
  Wifi,
  WifiOff,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { buildPath } from "@/lib/hooks/use-api";
import type { PhoneNumber } from "@/components/phone/pricing-data";
import {
  initDevice,
  makeCall,
  hangUp,
  toggleMute,
  sendDigits,
  subscribe,
  destroyDevice,
  runVoiceSetup,
  clearError,
  type TwilioCallState,
  type DeviceStatus,
  type CallStatus,
} from "@/lib/twilio-device";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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
/*  Hook: useCallerNumbers — real Twilio numbers from the API                  */
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
          apiClient.get<{ numbers: PhoneNumber[] }>(path),
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
/*  Hook: useTwilioDevice — subscribe to the Twilio Device singleton           */
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
/*  Device Status Indicator                                                    */
/* -------------------------------------------------------------------------- */

function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
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
      <span className="flex items-center gap-1 text-[10px] text-red-500">
        <WifiOff className="h-2.5 w-2.5" />
        Disconnected
      </span>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Floating Dialer                                                            */
/* -------------------------------------------------------------------------- */

export function FloatingDialer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rawDigits, setRawDigits] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Caller-from state
  const { numbers: callerNumbers, loading: numbersLoading } = useCallerNumbers();
  const [selectedFromSid, setSelectedFromSid] = useState<string | null>(null);
  const [showFromDropdown, setShowFromDropdown] = useState(false);

  // Twilio Device state
  const twilioState = useTwilioDevice();
  const {
    deviceStatus,
    callStatus,
    isMuted,
    error: deviceError,
    needsSetup,
    remoteNumber,
  } = twilioState;

  // Call timer
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-select first number when loaded
  useEffect(() => {
    if (callerNumbers.length > 0 && selectedFromSid === null) {
      setSelectedFromSid(callerNumbers[0]?.sid ?? null);
    }
  }, [callerNumbers, selectedFromSid]);

  const selectedFrom = callerNumbers.find((n) => n.sid === selectedFromSid) ?? null;

  // Initialize Twilio Device when the dialer opens
  useEffect(() => {
    if (isOpen && deviceStatus === "uninitialized") {
      initDevice();
    }
  }, [isOpen, deviceStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Manage call timer based on callStatus
  useEffect(() => {
    if (callStatus === "open") {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCallTimer((prev) => prev + 1);
        }, 1000);
      }
    } else if (callStatus === "idle" || callStatus === "closed") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (callStatus === "idle") {
        setCallTimer(0);
      }
    }
  }, [callStatus]);

  // Derived
  const displayFormatted = formatPhoneNumber(rawDigits);
  const detectedCountry = detectCountry(rawDigits);
  const numberValid = isValidNumber(rawDigits);
  const isCallActive =
    callStatus === "connecting" ||
    callStatus === "ringing" ||
    callStatus === "open";

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleKeyPress = useCallback(
    (digit: string) => {
      clearError();
      // Send DTMF if in a call
      if (isCallActive) {
        sendDigits(digit);
        return;
      }
      setRawDigits((prev) => {
        const max = maxDigitsForCountry(prev);
        if (prev.length >= max) return prev;
        return prev + digit;
      });
    },
    [isCallActive],
  );

  const handleBackspace = useCallback(() => {
    clearError();
    setRawDigits((prev) => {
      if (prev.length === 0) return "";
      return prev.slice(0, -1);
    });
  }, []);

  const handleInputChange = useCallback((value: string) => {
    clearError();
    const digits = stripToDigits(value);
    const max = maxDigitsForCountry(digits);
    setRawDigits(digits.slice(0, max));
  }, []);

  const startCall = useCallback(async () => {
    if (!numberValid) return;
    clearError();

    const toNumber = toE164(rawDigits);
    await makeCall(toNumber);
  }, [numberValid, rawDigits]);

  const endCall = useCallback(() => {
    hangUp();
    setCallTimer(0);
    setRawDigits("");
  }, []);

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, []);

  const handleSetup = useCallback(async () => {
    setIsSettingUp(true);
    const result = await runVoiceSetup();
    setIsSettingUp(false);

    if (result.success) {
      // Re-initialize the device now that setup is complete
      await initDevice();
    }
  }, []);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────

  const callStatusLabel =
    callStatus === "connecting"
      ? "Connecting..."
      : callStatus === "ringing"
        ? "Ringing..."
        : callStatus === "open"
          ? "Connected"
          : "";

  const displayNumber = remoteNumber
    ? formatE164ForDisplay(remoteNumber)
    : displayFormatted;

  return (
    <div className="fixed bottom-5 right-5 sm:right-24 z-50 flex flex-col items-end gap-3">
      {/* Expanded dialer popup */}
      {isOpen && !isMinimized && (
        <div
          className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] w-[calc(100vw-2.5rem)] sm:w-[300px]"
          style={{ maxWidth: "300px", height: isCallActive ? "340px" : "500px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isCallActive ? "Active Call" : "Dialer"}
              </span>
              <DeviceStatusBadge status={deviceStatus} />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              {!isCallActive && (
                <button
                  onClick={toggleOpen}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Setup required prompt ─────────────────────────────────── */}
          {needsSetup && !isCallActive && (
            <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-3">
                <Settings className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Browser Calling Setup
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                One-time setup to enable calling through your browser. This creates the necessary Twilio resources.
              </p>
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
            </div>
          )}

          {/* ── Active call view ──────────────────────────────────────── */}
          {isCallActive && (
            <div className="flex flex-col items-center flex-1 pt-6 pb-4 px-4">
              {/* Contact avatar */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <User className="h-6 w-6" />
              </div>

              <p className="text-sm font-semibold text-foreground">
                {displayNumber || "Unknown"}
              </p>

              {/* Status */}
              <span
                className={cn(
                  "text-xs font-medium mt-1 px-2 py-0.5 rounded-full",
                  callStatus === "connecting"
                    ? "text-blue-600 bg-blue-500/10 animate-pulse"
                    : callStatus === "ringing"
                      ? "text-amber-600 bg-amber-500/10 animate-pulse"
                      : "text-emerald-600 bg-emerald-500/10",
                )}
              >
                {callStatusLabel}
              </span>

              {/* Timer */}
              <p className="text-2xl font-mono font-light text-foreground mt-2 tabular-nums">
                {formatTimerDisplay(callTimer)}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={handleToggleMute}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-all",
                    isMuted
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                  title="End call"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Dialer view ───────────────────────────────────────────── */}
          {!isCallActive && !needsSetup && (
            <div className="flex flex-col flex-1 px-4 py-3 overflow-hidden">
              {/* Phone input with country flag */}
              <div className="relative mb-2">
                <div className="flex items-center">
                  {rawDigits.length > 0 && (
                    <span
                      className="text-lg mr-1 shrink-0"
                      title={detectedCountry.name}
                    >
                      {detectedCountry.flag}
                    </span>
                  )}
                  <input
                    value={displayFormatted}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Enter number..."
                    className="w-full text-center text-lg font-light tracking-wider bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1"
                  />
                  {rawDigits.length > 0 && (
                    <button
                      onClick={handleBackspace}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="h-px bg-border mb-3" />

              {/* Compact keypad */}
              <div className="grid grid-cols-3 gap-1.5 flex-1">
                {KEYPAD_KEYS.map(({ digit, letters }) => (
                  <button
                    key={digit}
                    onClick={() => handleKeyPress(digit)}
                    className="group flex flex-col items-center justify-center rounded-full border border-border bg-card transition-all hover:bg-accent hover:border-primary/30 active:scale-95 active:bg-primary/10 h-10 w-10 mx-auto"
                  >
                    <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-none">
                      {digit}
                    </span>
                    {letters && (
                      <span className="text-[7px] tracking-widest text-muted-foreground mt-[-1px] leading-none">
                        {letters}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Call button */}
              <button
                onClick={startCall}
                disabled={
                  !numberValid ||
                  deviceStatus !== "registered" ||
                  (callerNumbers.length === 0 && !numbersLoading)
                }
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold mt-3 transition-all",
                  numberValid && deviceStatus === "registered" && callerNumbers.length > 0
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                )}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>

              {/* Error message */}
              {deviceError && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2 text-[10px] text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{deviceError}</span>
                </div>
              )}

              {/* Calling from — dynamic */}
              <div className="mt-2 text-center">
                {numbersLoading ? (
                  <p className="text-[10px] text-muted-foreground">
                    Loading numbers...
                  </p>
                ) : callerNumbers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>
                      No number configured{" "}
                      <a
                        href="/dashboard/settings/phone"
                        className="text-primary hover:underline"
                      >
                        Set up
                      </a>
                    </span>
                  </p>
                ) : callerNumbers.length === 1 ? (
                  <p className="text-[10px] text-muted-foreground">
                    From:{" "}
                    <span className="font-medium text-foreground">
                      {formatE164ForDisplay(
                        selectedFrom?.phoneNumber ?? "",
                      )}
                    </span>
                  </p>
                ) : (
                  /* Multiple numbers — dropdown */
                  <div className="relative inline-block">
                    <button
                      onClick={() => setShowFromDropdown(!showFromDropdown)}
                      className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                    >
                      From:{" "}
                      <span className="font-medium text-foreground">
                        {formatE164ForDisplay(
                          selectedFrom?.phoneNumber ?? "",
                        )}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                    {showFromDropdown && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-10">
                        {callerNumbers.map((num) => (
                          <button
                            key={num.sid}
                            onClick={() => {
                              setSelectedFromSid(num.sid);
                              setShowFromDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                              num.sid === selectedFromSid && "bg-muted font-medium",
                            )}
                          >
                            <span className="text-foreground">
                              {formatE164ForDisplay(num.phoneNumber)}
                            </span>
                            {num.friendlyName && (
                              <span className="text-muted-foreground ml-1.5">
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
            </div>
          )}
        </div>
      )}

      {/* Minimized bar */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all hover:scale-105",
            isCallActive
              ? "bg-emerald-600 text-white"
              : "bg-primary text-primary-foreground",
          )}
        >
          <Phone className="h-4 w-4" />
          {isCallActive ? (
            <span className="tabular-nums">{formatTimerDisplay(callTimer)}</span>
          ) : (
            "Dialer"
          )}
        </button>
      )}

      {/* Floating action button */}
      {!isMinimized && (
        <button
          onClick={toggleOpen}
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
            isCallActive
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-primary text-primary-foreground",
          )}
        >
          {isOpen ? (
            isCallActive ? (
              <Phone className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )
          ) : (
            <Phone className="h-5 w-5" />
          )}

          {/* Active call indicator */}
          {isCallActive && !isOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          )}

          {/* Device status dot when not in call */}
          {!isCallActive && !isOpen && deviceStatus === "registered" && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default FloatingDialer;
