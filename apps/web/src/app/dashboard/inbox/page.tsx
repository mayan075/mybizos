"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Phone,
  MessageSquare,
  Mail,
  Bot,
  Check,
  CheckCheck,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, useMessages, useSendMessage } from "@/lib/hooks/use-conversations";
import { mockConversations, mockMessages, type MockConversation, type MockChatMessage } from "@/lib/mock-data";

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
};

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState("conv1");
  const [filter, setFilter] = useState<"all" | "unread" | "ai">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");

  // Local state mirrors for optimistic UI
  const [localConversations, setLocalConversations] = useState<MockConversation[]>(mockConversations);
  const [localMessages, setLocalMessages] = useState<Record<string, MockChatMessage[]>>(mockMessages);

  // Hooks (try API, fall back to mock data)
  const { data: apiConversations, isLive: conversationsLive } = useConversations({ filter, search: searchQuery });

  // Use API data if live, otherwise use local state for full interactivity
  const conversations = conversationsLive ? apiConversations : localConversations;

  const filtered = useMemo(() => {
    if (conversationsLive) return conversations;

    return conversations.filter((c) => {
      if (filter === "unread") return c.unread;
      if (filter === "ai") return c.aiHandled;
      return true;
    }).filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.contact.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q);
    });
  }, [conversations, conversationsLive, filter, searchQuery]);

  const selected = conversations.find((c) => c.id === selectedId);
  const currentMessages = localMessages[selectedId] ?? [];
  const unreadCount = conversations.filter((c) => c.unread).length;

  const { mutate: sendMessageApi } = useSendMessage(selectedId);

  function handleSend() {
    if (!messageText.trim() || !selectedId) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const newMsg: MockChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: messageText.trim(),
      time: timeStr,
      status: "sent",
    };

    setLocalMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), newMsg],
    }));

    // Update conversation last message
    setLocalConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, lastMessage: messageText.trim(), time: "Just now", unread: false }
          : c,
      ),
    );

    // Try to persist via API
    sendMessageApi({ text: messageText.trim() });

    setMessageText("");

    // Simulate delivered status after 1 second
    setTimeout(() => {
      setLocalMessages((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" as const } : m,
        ),
      }));
    }, 1000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSelectConversation(convId: string) {
    setSelectedId(convId);
    // Mark as read
    setLocalConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread: false } : c)),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {unreadCount} unread conversations
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  {f === "all" ? "All" : f === "unread" ? `Unread (${unreadCount})` : "AI Handled"}
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
                  onClick={() => handleSelectConversation(conv.id)}
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
                      <p className={cn(
                        "truncate text-xs",
                        conv.unread ? "text-foreground font-medium" : "text-muted-foreground",
                      )}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No conversations found
              </div>
            )}
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
                {currentMessages.map((msg) => (
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
                          ) : msg.status === "delivered" ? (
                            <CheckCheck className="h-3 w-3 opacity-50" />
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
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
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
                      <button
                        onClick={handleSend}
                        disabled={!messageText.trim()}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                          messageText.trim()
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground cursor-not-allowed",
                        )}
                      >
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
