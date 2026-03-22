"use client";

import { useState } from "react";
import { Send, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

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
    text: "Hi, I noticed my AC is making a rattling noise when it kicks on. Should I be concerned?",
    timestamp: "Mar 20, 2026 at 2:15 PM",
  },
  {
    id: "msg-2",
    sender: "business",
    senderName: "Precision HVAC & Plumbing",
    text: "Hi Sarah! A rattling noise can sometimes indicate a loose component or debris in the unit. It's a good idea to have it checked before summer. Would you like us to take a look during your upcoming tune-up on Mar 28?",
    timestamp: "Mar 20, 2026 at 2:18 PM",
  },
  {
    id: "msg-3",
    sender: "customer",
    senderName: "You",
    text: "Yes, that would be great! Can Mike take a look at it during the appointment?",
    timestamp: "Mar 20, 2026 at 2:22 PM",
  },
  {
    id: "msg-4",
    sender: "business",
    senderName: "Precision HVAC & Plumbing",
    text: "Absolutely! I've added a note to your appointment so Mike knows to inspect the rattling noise. If it turns out to be something bigger, he'll give you options right there. See you on the 28th!",
    timestamp: "Mar 20, 2026 at 2:25 PM",
  },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            Typically responds in under 5 minutes
          </div>
        </div>
      </div>

      {/* Message area */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white">
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
                      : "rounded-bl-md bg-gray-100 text-gray-900"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <p
                  className={cn(
                    "mt-1 text-[11px] text-gray-400",
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
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                newMessage.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-300"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
