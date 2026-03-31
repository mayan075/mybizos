"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  RefreshCw,
  UserPlus,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useConversations, useMessages, useSendMessage } from "@/lib/hooks/use-conversations";
import { type MockConversation, type MockChatMessage } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { InboxSkeleton } from "@/components/skeletons/inbox-skeleton";
import { playNotification } from "@/lib/sounds";
import { apiClient, tryFetch } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
};

// ── Contact Quick-Create Form ──────────────────────────────────────────────

function ContactQuickCreate({
  phoneNumber,
  onSaved,
  onCancel,
}: {
  phoneNumber: string;
  onSaved: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const path = buildPath("/orgs/:orgId/contacts");
      if (!path) return;
      await tryFetch(() =>
        apiClient.post(path, {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phoneNumber,
        }),
      );
      onSaved(name.trim());
    } catch {
      // Even if API fails, update the name locally
      onSaved(name.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
      <UserPlus className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <p className="text-xs font-medium text-foreground">Save as Contact</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoFocus
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
              name.trim() && !saving
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper: detect if a contact name looks like an unknown number ──────────

function isUnknownContact(contactName: string): boolean {
  if (!contactName) return true;
  const cleaned = contactName.replace(/[\s\-\(\)\+]/g, "");
  // If it's all digits (a phone number), treat as unknown
  return /^\d{7,15}$/.test(cleaned) || contactName.toLowerCase().includes("unknown");
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function InboxPage() {
  usePageTitle("Inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "ai">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Local state — empty by default; real data comes from the API
  const [localConversations, setLocalConversations] = useState<MockConversation[]>([]);
  const [localMessages, setLocalMessages] = useState<Record<string, MockChatMessage[]>>({});

  // Polling state for "New messages" banner
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastConversationCountRef = useRef<number | null>(null);
  const lastConversationIdsRef = useRef<Set<string>>(new Set());

  // Hooks (try API, fall back to mock data)
  const { data: apiConversations, isLive: conversationsLive, isLoading } = useConversations({ filter, search: searchQuery });

  // Use API data if live, otherwise use local state for full interactivity
  const conversations = conversationsLive ? apiConversations : localConversations;

  // ── Polling: check for new conversations every 15 seconds ──────────────

  useEffect(() => {
    if (!conversationsLive) return;

    // Initialize tracking refs
    if (lastConversationCountRef.current === null) {
      lastConversationCountRef.current = apiConversations.length;
      lastConversationIdsRef.current = new Set(apiConversations.map((c) => c.id));
    }

    const interval = setInterval(async () => {
      try {
        const path = buildPath("/orgs/:orgId/conversations");
        if (!path) return;
        const result = await tryFetch(() =>
          apiClient.get<MockConversation[]>(path),
        );
        if (result && Array.isArray(result)) {
          const newIds = new Set(result.map((c: MockConversation) => c.id));
          const hasNew = result.some(
            (c: MockConversation) => !lastConversationIdsRef.current.has(c.id),
          );

          // Check for new unread messages in existing conversations
          const hasNewUnread = result.some((c: MockConversation) => {
            const existing = apiConversations.find((e) => e.id === c.id);
            return existing && !existing.unread && c.unread;
          });

          if (hasNew || hasNewUnread) {
            setHasNewMessages(true);
            playNotification();
          }

          lastConversationIdsRef.current = newIds;
          lastConversationCountRef.current = result.length;
        }
      } catch {
        // API unavailable — silently skip
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [conversationsLive, apiConversations]);

  // ── Refresh handler for "New messages" banner ──────────────────────────

  const handleRefreshConversations = useCallback(() => {
    setHasNewMessages(false);
    // Force page-level re-render by toggling filter
    setFilter((prev) => {
      // Trigger a re-fetch by briefly changing and reverting
      const temp = prev;
      setTimeout(() => setFilter(temp), 0);
      return prev;
    });
    // Simpler approach: just reload
    window.location.reload();
  }, []);

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

  // Auto-select first conversation when not selected yet
  const effectiveSelectedId = selectedId ?? (filtered.length > 0 ? filtered[0]?.id ?? null : null);
  const selected = conversations.find((c) => c.id === effectiveSelectedId);
  const currentMessages = effectiveSelectedId ? (localMessages[effectiveSelectedId] ?? []) : [];
  const unreadCount = conversations.filter((c) => c.unread).length;

  const { mutate: sendMessageApi } = useSendMessage(effectiveSelectedId ?? "");

  function handleSend() {
    if (!messageText.trim() || !effectiveSelectedId) return;

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
      [effectiveSelectedId]: [...(prev[effectiveSelectedId] ?? []), newMsg],
    }));

    // Update conversation last message
    setLocalConversations((prev) =>
      prev.map((c) =>
        c.id === effectiveSelectedId
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
        [effectiveSelectedId]: (prev[effectiveSelectedId] ?? []).map((m) =>
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
    setShowQuickCreate(false);
    // Mark as read
    setLocalConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread: false } : c)),
    );
  }

  function handleContactSaved(name: string) {
    setShowQuickCreate(false);
    // Update the conversation contact name locally
    if (effectiveSelectedId) {
      setLocalConversations((prev) =>
        prev.map((c) =>
          c.id === effectiveSelectedId
            ? {
                ...c,
                contact: name,
                initials: name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
              }
            : c,
        ),
      );
    }
  }

  // Loading state — show skeleton while initial fetch is in progress
  if (isLoading) {
    return <InboxSkeleton />;
  }

  // Empty state when no conversations at all (API returned empty)
  if (conversations.length === 0 && !searchQuery) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">0 conversations</p>
        </div>
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="When customers text or call, their messages will appear here. Your AI agent handles them 24/7."
          className="rounded-xl border border-border bg-card"
        />
      </div>
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

      {/* New messages banner */}
      {hasNewMessages && (
        <button
          onClick={handleRefreshConversations}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          New messages received. Click to refresh.
        </button>
      )}

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
                  {f === "all" ? "All" : f === "unread" ? `Unread (${unreadCount})` : (
                    <span className="flex items-center gap-1">
                      AI Handled
                      <Tooltip content="Conversations where your AI agent responded to the customer automatically." position="bottom" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
              const unknown = isUnknownContact(conv.contact || "");
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                    effectiveSelectedId === conv.id
                      ? "bg-accent"
                      : "hover:bg-muted/30",
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      unknown
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}>
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
                            unknown && "italic text-muted-foreground",
                          )}
                        >
                          {unknown ? `Unknown (${conv.contact || "?"})` : (conv.contact || "Unknown")}
                        </span>
                        {conv.aiHandled && (
                          <Tooltip content="Handled by your AI agent" position="right">
                            <Bot className="h-3.5 w-3.5 text-primary cursor-help" />
                          </Tooltip>
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
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                  <MessageSquare className="h-7 w-7 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try a different search.`
                    : "When customers text or call, their messages will appear here. Your AI agent handles them 24/7."}
                </p>
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
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                    isUnknownContact(selected.contact || "")
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  )}>
                    {selected.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {isUnknownContact(selected.contact || "") ? `Unknown Contact` : (selected.contact || "Unknown")}
                      </p>
                      {isUnknownContact(selected.contact || "") && !showQuickCreate && (
                        <button
                          onClick={() => setShowQuickCreate(true)}
                          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors"
                        >
                          <UserPlus className="h-3 w-3" />
                          Save as Contact
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {(() => {
                        const Icon = channelIcons[selected.channel] || MessageSquare;
                        return <Icon className="h-3 w-3" />;
                      })()}
                      {isUnknownContact(selected.contact || "") ? (selected.contact || "?") : (selected.channel || "sms").toUpperCase()}
                      {selected.aiHandled && (
                        <Tooltip
                          content="This conversation was handled by your AI agent. The AI answered the customer's call or message automatically, qualified the lead, and may have booked an appointment."
                          position="bottom"
                        >
                          <span className="ml-1 inline-flex items-center gap-0.5 text-primary cursor-help">
                            <Bot className="h-3 w-3" />
                            AI handled
                          </span>
                        </Tooltip>
                      )}
                    </p>
                  </div>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Quick-create contact form */}
              {showQuickCreate && isUnknownContact(selected.contact || "") && (
                <div className="border-b border-border px-5 py-3">
                  <ContactQuickCreate
                    phoneNumber={selected.contact}
                    onSaved={handleContactSaved}
                    onCancel={() => setShowQuickCreate(false)}
                  />
                </div>
              )}

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
