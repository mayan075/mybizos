"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Clock, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";

interface Conversation {
  id: string;
  contactName: string;
  channel: string;
  lastMessage: string;
  updatedAt: string;
  status: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  channel: string;
  createdAt: string;
  senderName?: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    async function load() {
      const orgId = getOrgId();
      const data = await tryFetch<Conversation[]>(`/orgs/${orgId}/conversations`);
      const convs = data ?? [];
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0]!.id);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConvId) return;
    async function loadMessages() {
      const orgId = getOrgId();
      const data = await tryFetch<Message[]>(
        `/orgs/${orgId}/conversations/${selectedConvId}/messages`
      );
      setMessages(data ?? []);
    }
    loadMessages();
  }, [selectedConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !selectedConvId) return;

    setSending(true);
    try {
      const orgId = getOrgId();
      await apiClient(`/orgs/${orgId}/conversations/${selectedConvId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text, channel: "sms" }),
      });

      // Optimistic add
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          direction: "outbound",
          body: text,
          channel: "sms",
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    } catch {
      // Silently fail — message wasn't sent
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConvId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chat with our team</p>
        </div>
        <div className="py-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No messages yet. Start a conversation by contacting us!
          </p>
        </div>
      </div>
    );
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

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Conversation list */}
        <div className="hidden w-72 shrink-0 overflow-y-auto rounded-xl border border-border bg-card sm:block">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setSelectedConvId(conv.id)}
              className={cn(
                "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50",
                selectedConvId === conv.id && "bg-muted/50"
              )}
            >
              <p className="text-sm font-medium text-foreground truncate">
                {conv.contactName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {conv.lastMessage}
              </p>
            </button>
          ))}
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
                    msg.direction === "outbound" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%]",
                      msg.direction === "outbound"
                        ? "rounded-br-md bg-blue-600 text-white"
                        : "rounded-bl-md bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[11px] text-muted-foreground/70",
                      msg.direction === "outbound" ? "text-right" : "text-left"
                    )}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
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
                disabled={!newMessage.trim() || sending}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  newMessage.trim() && !sending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground/50"
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
