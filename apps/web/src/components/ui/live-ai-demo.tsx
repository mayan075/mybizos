"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  Waveform,
  CalendarCheck,
  CheckCircle,
  UserCircle,
} from "@phosphor-icons/react";

interface Message {
  role: "ai" | "caller";
  text: string;
  delay: number;
}

const conversation: Message[] = [
  { role: "caller", text: "Hi, I need a plumber for a leaking pipe", delay: 0 },
  { role: "ai", text: "Hi! I'm the AI assistant for Johnson Plumbing. I can help with that — is the leak active right now?", delay: 1800 },
  { role: "caller", text: "Yes, it's under the kitchen sink", delay: 3800 },
  { role: "ai", text: "Got it. I have a slot available tomorrow at 10 AM. Shall I book that for you?", delay: 5600 },
  { role: "caller", text: "That works perfect", delay: 7200 },
  { role: "ai", text: "Booked! You'll get a confirmation text shortly. Anything else I can help with?", delay: 8400 },
];

/**
 * Live AI phone conversation demo — animated chat bubbles that replay
 * showing the AI phone agent qualifying a lead and booking an appointment.
 */
export function LiveAIDemo() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          startConversation();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function startConversation() {
    setIsCallActive(true);
    setVisibleMessages(0);
    setShowResult(false);

    conversation.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages(i + 1);
      }, msg.delay + 800);
    });

    // Show result card after conversation
    setTimeout(() => {
      setShowResult(true);
    }, 10000);

    // Loop the demo
    setTimeout(() => {
      hasStarted.current = false;
      setIsCallActive(false);
      setVisibleMessages(0);
      setShowResult(false);
      // Restart after a pause
      setTimeout(() => {
        hasStarted.current = true;
        startConversation();
      }, 2000);
    }, 14000);
  }

  return (
    <div ref={containerRef} className="w-full max-w-sm mx-auto">
      {/* Phone call header */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
      >
        {/* Call status bar */}
        <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isCallActive ? "bg-emerald-500/15" : "bg-white/[0.04]"}`}>
              <Phone className={`h-4 w-4 ${isCallActive ? "text-emerald-400" : "text-white/30"}`} weight="fill" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white/80">Incoming Call</div>
              <div className="text-[10px] text-white/30">+1 (555) 0147</div>
            </div>
          </div>
          {isCallActive && (
            <div className="flex items-center gap-2">
              <Waveform className="h-4 w-4 text-emerald-400 animate-pulse" weight="fill" />
              <span className="text-[10px] font-medium text-emerald-400">LIVE</span>
            </div>
          )}
        </div>

        {/* Conversation area */}
        <div className="h-[260px] overflow-hidden px-4 py-3">
          <div className="space-y-2.5">
            <AnimatePresence>
              {conversation.slice(0, visibleMessages).map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed ${
                      msg.role === "ai"
                        ? "rounded-tl-sm bg-sky-500/10 text-white/75"
                        : "rounded-tr-sm bg-white/[0.06] text-white/60"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isCallActive && visibleMessages < conversation.length && visibleMessages > 0 && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-sky-500/10 px-4 py-2.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-sky-400/50"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Result card */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              className="border-t border-white/[0.04] bg-emerald-500/[0.04] px-4 py-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                  <CalendarCheck className="h-4 w-4 text-emerald-400" weight="fill" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-emerald-400">Appointment Booked</div>
                  <div className="text-[10px] text-white/30">Tomorrow 10 AM · Kitchen sink leak</div>
                </div>
                <CheckCircle className="h-5 w-5 text-emerald-400" weight="fill" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
