"use client";

import { useState, useMemo } from "react";
import { Send, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboardingData } from "@/lib/onboarding";

interface Message {
  id: string;
  sender: "customer" | "business";
  senderName: string;
  text: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "msg-1",
    sender: "customer",
    senderName: "You",
    text: "Hi, I have a bunch of old furniture I need cleared out. Can you do a pickup this week?",
    timestamp: "Mar 20, 2026 at 2:15 PM",
  },
  {
    id: "msg-2",
    sender: "business",
    senderName: "BUSINESS_NAME",
    text: "Hi Sarah! We'd be happy to help with the furniture removal. Could you let us know roughly how many items? That way we can send the right sized truck. We have availability on Thursday and Friday this week.",
    timestamp: "Mar 20, 2026 at 2:18 PM",
  },
  {
    id: "msg-3",
    sender: "customer",
    senderName: "You",
    text: "It's a couch, two armchairs, a dining table, and some boxes. Would Thursday morning work?",
    timestamp: "Mar 20, 2026 at 2:22 PM",
  },
  {
    id: "msg-4",
    sender: "business",
    senderName: "BUSINESS_NAME",
    text: "Thursday morning works great! I've booked you in for 10 AM. Our team of two will arrive with the truck. Based on what you described, it should take about an hour. We'll send you a confirmation text the day before. See you Thursday!",
    timestamp: "Mar 20, 2026 at 2:25 PM",
  },
];

export default function MessagesPage() {
  const onboarding = useMemo(() => getOnboardingData(), []);
  const bizName = onboarding?.businessName ?? "Your Business";

  // Replace placeholder business name in initial messages with dynamic name
  const dynamicMessages = useMemo(() => {
    return initialMessages.map((m) =>
      m.senderName === "BUSINESS_NAME"
        ? { ...m, senderName: bizName }
        : m,
    );
  }, [bizName]);

  const [messages, setMessages] = useState<Message[]>(dynamicMessages);
  const [newMessage, setNewMessage] = useState("");

  function handleSend() {
    const text = newMessage.trim();
    if (!text) return;

    const msg: Message = {
      id: `msg-${Date.now()}`,
      sender: "customer",
      senderName: "You",
      text,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };

    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col sm:h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Typically responds in under 5 minutes
          </div>
        </div>
      </div>

      {/* Message area */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col",
                  msg.sender === "customer" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%]",
                    msg.sender === "customer"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <p
                  className={cn(
                    "mt-1 text-[11px] text-muted-foreground/70",
                    msg.sender === "customer" ? "text-right" : "text-left"
                  )}
                >
                  {msg.senderName} &middot; {msg.timestamp}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                newMessage.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground/50"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
