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
  ShieldAlert,
  Link as LinkIcon,
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
/*  Hook: useTwilioDevice                                                      */
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
    // Check permission state via the Permissions API if available
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
        // Permissions API not supported for microphone in some browsers
        setPermission("unknown");
      }
    }

    checkPermission();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setPermission("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately — we just needed the permission
      stream.getTracks().forEach((track) => track.stop());
      setPermission("granted");
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermission("denied");
      } else {
        setPermission("denied");
      }
      return false;
    }
  }, []);

  return { permission, requestPermission };
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
/*  Mic Permission Badge                                                       */
/* -------------------------------------------------------------------------- */

function MicPermissionBadge({ permission }: { permission: MicPermission }) {
  if (permission === "granted") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
        <Mic className="h-2.5 w-2.5" />
        Mic allowed
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-500">
        <MicOff className="h-2.5 w-2.5" />
        Mic blocked
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
  const [setupError, setSetupError] = useState<string | null>(null);

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

  // Microphone permission
  const { permission: micPermission, requestPermission: requestMicPermission } =
    useMicrophonePermission();

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
      setSetupError(null);
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
    setSetupError(null);
    setRawDigits((prev) => {
      if (prev.length === 0) return "";
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    clearError();
    setSetupError(null);
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
    setSetupError(null);
    const digits = stripToDigits(value);
    const max = maxDigitsForCountry(digits);
    setRawDigits(digits.slice(0, max));
  }, []);

  const startCall = useCallback(async () => {
    if (!numberValid) return;
    clearError();
    setSetupError(null);

    // Check microphone permission first
    if (micPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) {
        // Permission denied — don't proceed
        return;
      }
    }

    const toNumber = toE164(rawDigits);
    await makeCall(toNumber);
  }, [numberValid, rawDigits, micPermission, requestMicPermission]);

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
    setSetupError(null);

    // Check if Twilio numbers are available first
    if (!numbersLoading && callerNumbers.length === 0) {
      setSetupError("Connect your phone number first. Go to Phone Settings to add a Twilio number.");
      setIsSettingUp(false);
      return;
    }

    const result = await runVoiceSetup();
    setIsSettingUp(false);

    if (result.success) {
      // Re-initialize the device now that setup is complete
      await initDevice();
    } else {
      // Show the actual error message from the setup result
      setSetupError(result.error ?? "Setup failed. Check your Twilio configuration and try again.");
    }
  }, [numbersLoading, callerNumbers.length]);

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
          className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] w-[calc(100vw-2.5rem)] sm:w-[320px]"
          style={{ maxWidth: "320px", height: isCallActive ? "360px" : "540px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isCallActive ? "Active Call" : "Dialer"}
              </span>
              <DeviceStatusBadge status={deviceStatus} error={deviceError} />
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
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {callerNumbers.length === 0 && !numbersLoading
                  ? "You need a phone number to make calls."
                  : "One-time setup to enable calling through your browser."}
              </p>

              {callerNumbers.length === 0 && !numbersLoading ? (
                <a
                  href="/dashboard/settings/phone"
                  className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Connect Phone Number
                </a>
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

              {/* Setup error message */}
              {setupError && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-600 text-left w-full">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{setupError}</span>
                </div>
              )}
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
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                    isMuted
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                  title="End call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── Dialer view ───────────────────────────────────────────── */}
          {!isCallActive && !needsSetup && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Calling from — prominent */}
              <div className="px-4 py-2 border-b border-border bg-muted/20 shrink-0">
                {numbersLoading ? (
                  <p className="text-[11px] text-muted-foreground">Loading numbers...</p>
                ) : callerNumbers.length === 0 ? (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>
                      No number{" "}
                      <a
                        href="/dashboard/settings/phone"
                        className="text-primary hover:underline font-medium"
                      >
                        Set up
                      </a>
                    </span>
                  </p>
                ) : callerNumbers.length === 1 ? (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">From</span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                    </span>
                    <MicPermissionBadge permission={micPermission} />
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <button
                      onClick={() => setShowFromDropdown(!showFromDropdown)}
                      className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      From{" "}
                      <span className="font-semibold text-foreground">
                        {formatE164ForDisplay(selectedFrom?.phoneNumber ?? "")}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                    {showFromDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-10">
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

              {/* Number display bar */}
              <div className="px-4 pt-3 pb-1 shrink-0">
                <div className="flex items-center justify-center min-h-[44px] rounded-lg bg-muted/50 border border-border px-3">
                  {rawDigits.length > 0 && (
                    <span className="text-lg mr-1 shrink-0" title={detectedCountry.name}>
                      {detectedCountry.flag}
                    </span>
                  )}
                  <input
                    value={displayFormatted}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Enter number..."
                    className="flex-1 text-center text-xl font-mono font-medium tracking-wider bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1.5 min-w-0"
                  />
                  {rawDigits.length > 0 && (
                    <button
                      onMouseDown={handleDeleteDown}
                      onMouseUp={handleDeleteUp}
                      onMouseLeave={handleDeleteUp}
                      onTouchStart={handleDeleteDown}
                      onTouchEnd={handleDeleteUp}
                      title="Tap to delete one digit, hold to clear all"
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded-md hover:bg-muted active:bg-red-50 active:text-red-500"
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Compact keypad */}
              <div className="grid grid-cols-3 gap-1.5 px-4 py-2 flex-1 content-center">
                {KEYPAD_KEYS.map(({ digit, letters }) => (
                  <button
                    key={digit}
                    onClick={() => handleKeyPress(digit)}
                    className="group flex flex-col items-center justify-center rounded-full border border-border bg-card transition-all hover:bg-accent hover:border-primary/30 active:scale-95 active:bg-primary/10 h-12 w-12 mx-auto"
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

              {/* Mic blocked warning */}
              {micPermission === "denied" && (
                <div className="mx-4 mb-1 flex items-start gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-[10px] text-amber-700">
                  <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    Microphone blocked. Go to your browser settings to allow microphone access for this site.
                  </span>
                </div>
              )}

              {/* Call button — big green circle */}
              <div className="pb-2 pt-1 flex justify-center shrink-0">
                <button
                  onClick={startCall}
                  disabled={
                    !numberValid ||
                    deviceStatus !== "registered" ||
                    (callerNumbers.length === 0 && !numbersLoading)
                  }
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg",
                    numberValid && deviceStatus === "registered" && callerNumbers.length > 0
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-600/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                  )}
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>

              {/* Error message */}
              {deviceError && (
                <div className="mx-4 mb-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2 text-[10px] text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{deviceError}</span>
                </div>
              )}
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
