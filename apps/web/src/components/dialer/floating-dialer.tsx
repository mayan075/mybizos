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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type FloatingCallStatus = "idle" | "ringing" | "connected" | "on-hold" | "ended";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 1) return `+${digits}`;
  if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

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
/*  Floating Dialer                                                            */
/* -------------------------------------------------------------------------- */

export function FloatingDialer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  // Call state
  const [callStatus, setCallStatus] = useState<FloatingCallStatus>("idle");
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeContactName, setActiveContactName] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleKeyPress = useCallback((digit: string) => {
    setPhoneInput((prev) => {
      const digits = prev.replace(/\D/g, "");
      if (digits.length >= 11) return prev;
      return formatPhoneInput(digits + digit);
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setPhoneInput((prev) => {
      const digits = prev.replace(/\D/g, "");
      if (digits.length === 0) return "";
      return formatPhoneInput(digits.slice(0, -1));
    });
  }, []);

  const startCall = useCallback(() => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) return;

    setCallStatus("ringing");
    setCallTimer(0);
    setIsMuted(false);

    setTimeout(() => {
      setCallStatus("connected");
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }, 2000);
  }, [phoneInput]);

  const endCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallStatus("idle");
    setCallTimer(0);
    setPhoneInput("");
    setActiveContactName(null);
  }, []);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const isCallActive = callStatus === "ringing" || callStatus === "connected" || callStatus === "on-hold";

  return (
    <div className="fixed bottom-5 right-5 sm:right-24 z-50 flex flex-col items-end gap-3">
      {/* Expanded dialer popup */}
      {isOpen && !isMinimized && (
        <div
          className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] w-[calc(100vw-2.5rem)] sm:w-[300px]"
          style={{ maxWidth: "300px", height: isCallActive ? "340px" : "440px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isCallActive ? "Active Call" : "Dialer"}
              </span>
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

          {/* Active call mini view */}
          {isCallActive && (
            <div className="flex flex-col items-center flex-1 pt-6 pb-4 px-4">
              {/* Contact avatar */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                {activeContactName ? (
                  <span className="text-lg font-bold">
                    {activeContactName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>

              <p className="text-sm font-semibold text-foreground">
                {activeContactName ?? phoneInput}
              </p>

              {/* Status */}
              <span className={cn(
                "text-xs font-medium mt-1 px-2 py-0.5 rounded-full",
                callStatus === "ringing"
                  ? "text-amber-600 bg-amber-500/10 animate-pulse"
                  : "text-emerald-600 bg-emerald-500/10",
              )}>
                {callStatus === "ringing" ? "Ringing..." : "Connected"}
              </span>

              {/* Timer */}
              <p className="text-2xl font-mono font-light text-foreground mt-2 tabular-nums">
                {formatTimerDisplay(callTimer)}
              </p>

              {/* Mini action buttons */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-all",
                    isMuted
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <button
                  onClick={endCall}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                  <Phone className="h-4 w-4 rotate-[135deg]" />
                </button>
              </div>
            </div>
          )}

          {/* Dialer view */}
          {!isCallActive && (
            <div className="flex flex-col flex-1 px-4 py-3 overflow-hidden">
              {/* Phone input */}
              <div className="relative mb-2">
                <input
                  value={phoneInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPhoneInput(formatPhoneInput(digits));
                  }}
                  placeholder="+1 (___) ___-____"
                  className="w-full text-center text-lg font-light tracking-wider bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1"
                />
                {phoneInput && (
                  <button
                    onClick={handleBackspace}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                )}
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
                disabled={phoneInput.replace(/\D/g, "").length < 10}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold mt-3 transition-all",
                  phoneInput.replace(/\D/g, "").length >= 10
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed shadow-none",
                )}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>

              {/* Calling from */}
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                From: (704) 555-0001
              </p>
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
        </button>
      )}
    </div>
  );
}

export default FloatingDialer;
