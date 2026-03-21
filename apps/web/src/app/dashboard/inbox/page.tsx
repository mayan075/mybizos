"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Phone,
  MessageSquare,
  Mail,
  Bot,
  Check,
  CheckCheck,
  Clock,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  contact: string;
  initials: string;
  channel: "sms" | "email" | "call";
  lastMessage: string;
  time: string;
  unread: boolean;
  aiHandled: boolean;
  status: "open" | "closed";
}

const conversations: Conversation[] = [
  {
    id: "conv1",
    contact: "Sarah Johnson",
    initials: "SJ",
    channel: "sms",
    lastMessage: "Great, I'll see your technician tomorrow at 10 AM!",
    time: "2m ago",
    unread: true,
    aiHandled: false,
    status: "open",
  },
  {
    id: "conv2",
    contact: "Mike Chen",
    initials: "MC",
    channel: "sms",
    lastMessage: "Can you send me the estimate for the water heater?",
    time: "15m ago",
    unread: true,
    aiHandled: true,
    status: "open",
  },
  {
    id: "conv3",
    contact: "David Park",
    initials: "DP",
    channel: "email",
    lastMessage: "Re: Furnace Replacement Quote — Thanks for the detailed...",
    time: "1h ago",
    unread: false,
    aiHandled: false,
    status: "open",
  },
  {
    id: "conv4",
    contact: "Lisa Wang",
    initials: "LW",
    channel: "call",
    lastMessage: "AI Call Summary: Customer inquired about maintenance plans",
    time: "3h ago",
    unread: false,
    aiHandled: true,
    status: "open",
  },
  {
    id: "conv5",
    contact: "James Wilson",
    initials: "JW",
    channel: "sms",
    lastMessage: "Thanks for the quick fix! 5 stars from me.",
    time: "1d ago",
    unread: false,
    aiHandled: false,
    status: "closed",
  },
  {
    id: "conv6",
    contact: "Emily Davis",
    initials: "ED",
    channel: "call",
    lastMessage: "AI Call Summary: Emergency plumbing request — escalated to...",
    time: "1d ago",
    unread: false,
    aiHandled: true,
    status: "closed",
  },
];

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
};

interface ChatMessage {
  id: string;
  sender: "contact" | "user" | "ai";
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
}

const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    sender: "contact",
    text: "Hi, I need to schedule an AC tune-up. What times do you have available this week?",
    time: "10:23 AM",
    status: "read",
  },
  {
    id: "m2",
    sender: "ai",
    text: "Hi Sarah! This is Acme HVAC's AI assistant. I'd be happy to help you schedule an AC tune-up. We have availability tomorrow (Wednesday) at 10 AM, 1 PM, or 3 PM. We also have Thursday morning slots. Which works best for you?",
    time: "10:23 AM",
    status: "read",
  },
  {
    id: "m3",
    sender: "contact",
    text: "Tomorrow at 10 AM works perfectly.",
    time: "10:25 AM",
    status: "read",
  },
  {
    id: "m4",
    sender: "ai",
    text: "I've booked you for an AC tune-up tomorrow, Wednesday at 10:00 AM. Our technician will arrive at your address on file. The service typically takes about an hour and starts at $89. You'll receive a confirmation text shortly. Is there anything else I can help with?",
    time: "10:25 AM",
    status: "read",
  },
  {
    id: "m5",
    sender: "contact",
    text: "Great, I'll see your technician tomorrow at 10 AM!",
    time: "10:26 AM",
    status: "read",
  },
];

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState("conv1");
  const [filter, setFilter] = useState<"all" | "unread" | "ai">("all");

  const filtered = conversations.filter((c) => {
    if (filter === "unread") return c.unread;
    if (filter === "ai") return c.aiHandled;
    return true;
  });

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {conversations.filter((c) => c.unread).length} unread conversations
        </p>
      </div>

      <div className="flex h-[calc(100vh-13rem)] rounded-xl border border-border bg-card overflow-hidden">
        {/* Conversation list — left pane */}
        <div className="flex w-96 shrink-0 flex-col border-r border-border">
          {/* Search + filter bar */}
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search conversations..."
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread", "ai"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f === "all" ? "All" : f === "unread" ? "Unread" : "AI Handled"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel];
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                    selectedId === conv.id
                      ? "bg-accent"
                      : "hover:bg-muted/30",
                  )}
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {conv.initials}
                    </div>
                    {conv.unread && (
                      <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-sm",
                            conv.unread
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground",
                          )}
                        >
                          {conv.contact}
                        </span>
                        {conv.aiHandled && (
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {conv.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ChannelIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message thread — right pane */}
        <div className="flex flex-1 flex-col">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {selected.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selected.contact}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {(() => {
                        const Icon = channelIcons[selected.channel];
                        return <Icon className="h-3 w-3" />;
                      })()}
                      {selected.channel.toUpperCase()}
                      {selected.aiHandled && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-primary">
                          <Bot className="h-3 w-3" />
                          AI handled
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {mockMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sender === "contact"
                        ? "justify-start"
                        : "justify-end",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5",
                        msg.sender === "contact"
                          ? "bg-muted text-foreground rounded-bl-md"
                          : msg.sender === "ai"
                            ? "bg-primary/10 text-foreground rounded-br-md border border-primary/20"
                            : "bg-primary text-primary-foreground rounded-br-md",
                      )}
                    >
                      {msg.sender === "ai" && (
                        <div className="flex items-center gap-1 mb-1 text-xs font-medium text-primary">
                          <Bot className="h-3 w-3" />
                          AI Agent
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 mt-1 text-[10px]",
                          msg.sender === "contact"
                            ? "text-muted-foreground"
                            : msg.sender === "ai"
                              ? "text-muted-foreground"
                              : "text-primary-foreground/70",
                        )}
                      >
                        {msg.time}
                        {msg.sender !== "contact" &&
                          (msg.status === "read" ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message input */}
              <div className="border-t border-border p-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 rounded-xl border border-input bg-background p-3">
                    <textarea
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                          <Smile className="h-4 w-4" />
                        </button>
                      </div>
                      <button className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
