"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Minus, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  businessName: string;
  orgSlug: string;
  accentColor?: string;
}

/* -------------------------------------------------------------------------- */
/*  Simulated AI responses                                                    */
/* -------------------------------------------------------------------------- */

const AI_RESPONSES = [
  "I can help you book an appointment! What service do you need?",
  "Our drain cleaning service typically costs $150-250. Would you like to schedule?",
  "Let me check availability... We have openings tomorrow at 10am and 2pm. Which works better for you?",
  "Great choice! I will get that set up for you. Can I get your name and phone number?",
  "Perfect. Your appointment is being scheduled. You will receive a confirmation text shortly!",
  "Is there anything else I can help you with today?",
  "Our emergency plumbing service is available 24/7. The typical cost is $200-400 depending on the issue.",
  "We serve the greater metro area including all surrounding suburbs. What is your zip code?",
];

function getAIResponse(userMessage: string, responseIndex: number): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
    return "I can help you book an appointment! What service do you need?";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "Our services typically range from $89 for a tune-up to $3,000 for installations. Which service are you interested in?";
  }
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("asap")) {
    return "Our emergency plumbing service is available 24/7. The typical cost is $200-400 depending on the issue. Should I dispatch someone?";
  }
  if (lower.includes("drain") || lower.includes("clog")) {
    return "Our drain cleaning service typically costs $150-250. Would you like to schedule an appointment?";
  }
  if (lower.includes("ac") || lower.includes("air condition") || lower.includes("cooling")) {
    return "Our AC tune-up service runs $89-149 and takes about 1-2 hours. We have openings this week!";
  }
  if (lower.includes("water heater")) {
    return "Water heater installations typically run $1,500-3,000. We can send someone out to give you a free estimate!";
  }
  if (lower.includes("available") || lower.includes("when") || lower.includes("time")) {
    return "Let me check availability... We have openings tomorrow at 10am and 2pm. Which works better for you?";
  }
  if (lower.includes("thank") || lower.includes("bye") || lower.includes("done")) {
    return "You are welcome! Do not hesitate to reach out if you need anything else. Have a great day!";
  }

  return AI_RESPONSES[responseIndex % AI_RESPONSES.length];
}

/* -------------------------------------------------------------------------- */
/*  Chat Widget                                                               */
/* -------------------------------------------------------------------------- */

export function ChatWidget({
  businessName,
  orgSlug,
  accentColor = "#2563eb",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [responseCounter, setResponseCounter] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi! I'm ${businessName}'s AI assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, businessName]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulated AI response with 1-2 second delay
    const delay = 1000 + Math.random() * 1000;
    const currentCounter = responseCounter;
    setResponseCounter((c) => c + 1);

    setTimeout(() => {
      const aiResponse = getAIResponse(text, currentCounter);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, delay);
  }, [input, responseCounter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  };

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {isOpen && !isMinimized && (
        <div
          className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease-out]"
          style={{ width: "350px", height: "500px" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {businessName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{businessName}</p>
                <p className="text-[10px] opacity-80">AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                aria-label="Minimize chat"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === "user" ? "ml-auto items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm",
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start max-w-[85%]">
                <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-3 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0",
                  input.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    : "bg-gray-200 text-gray-400",
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-[9px] text-gray-400 mt-2">
              Powered by <span className="font-semibold">MyBizOS</span>
            </p>
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "flex h-[60px] w-[60px] items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 active:scale-95",
          isOpen ? "rotate-0" : "animate-[pulse_3s_ease-in-out_infinite]",
        )}
        style={{ backgroundColor: accentColor }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default ChatWidget;
