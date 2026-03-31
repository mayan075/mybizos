"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Minus,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import {
  findBestAnswer,
  getPageContext,
  isIssueReport,
  type PageContext,
} from "./platform-knowledge";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "issue-prompt" | "issue-logged";
}

interface LoggedIssue {
  id: string;
  timestamp: string;
  page: string;
  description: string;
  status: "open" | "resolved";
  userAgent: string;
}

interface ChatApiResponse {
  response: string;
  context?: {
    orgName?: string;
    totalContacts?: number;
    openConversations?: number;
  } | null;
}

interface SuggestionsApiResponse {
  suggestions: Array<{
    id: string;
    text: string;
    priority: "high" | "medium" | "low";
    icon: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_SUGGESTIONS = [
  "How is my business doing?",
  "Show my pipeline summary",
  "Any upcoming appointments?",
  "How many open conversations?",
];

const STORAGE_KEY = "hararai_issues";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getOrgId(): string {
  const user = getUser();
  return user?.orgId ?? "org_01";
}

function logIssue(description: string, page: string): LoggedIssue {
  const issue: LoggedIssue = {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    page,
    description,
    status: "open",
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  };

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const issues: LoggedIssue[] = existing ? JSON.parse(existing) : [];
    issues.unshift(issue);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  } catch {
    // localStorage may be unavailable in some contexts
  }

  return issue;
}

/* -------------------------------------------------------------------------- */
/*  AI Assistant Component                                                    */
/* -------------------------------------------------------------------------- */

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [awaitingIssueDescription, setAwaitingIssueDescription] =
    useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();

  /* ---------------------------------------- */
  /*  Track current page                       */
  /* ---------------------------------------- */
  useEffect(() => {
    const ctx = getPageContext(pathname);
    setPageContext(ctx);
  }, [pathname]);

  /* ---------------------------------------- */
  /*  Load suggestions from API on open        */
  /* ---------------------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    const orgId = getOrgId();
    const loadSuggestions = async () => {
      try {
        const result = await tryFetch(() =>
          apiClient.get<SuggestionsApiResponse>(
            `/orgs/${orgId}/assistant/suggestions`,
          ),
        );

        if (result && result.suggestions.length > 0) {
          setDynamicSuggestions(
            result.suggestions.slice(0, 4).map((s) => s.text),
          );
          setIsOnline(true);
        }
      } catch {
        // Suggestions loading is best-effort
      }
    };

    loadSuggestions();
  }, [isOpen]);

  /* ---------------------------------------- */
  /*  Welcome / contextual greeting            */
  /* ---------------------------------------- */
  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasShownGreeting) {
      const greeting =
        pageContext?.greeting ??
        "Hey there! I'm your AI office manager. I have access to all your business data — ask me about your pipeline, appointments, contacts, revenue, or anything else.";

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
      setHasShownGreeting(true);
    }
  }, [isOpen, messages.length, hasShownGreeting, pageContext]);

  /* ---------------------------------------- */
  /*  Auto-scroll                              */
  /* ---------------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ---------------------------------------- */
  /*  Focus input on open                      */
  /* ---------------------------------------- */
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  /* ---------------------------------------- */
  /*  OFFLINE fallback (keyword matching)      */
  /* ---------------------------------------- */
  const generateOfflineResponse = useCallback(
    (userText: string): string => {
      // If we're waiting for an issue description, log it
      if (awaitingIssueDescription) {
        const page =
          typeof window !== "undefined"
            ? window.location.pathname
            : "/unknown";
        logIssue(userText, page);
        setAwaitingIssueDescription(false);
        return `I've logged your issue. Here's what I recorded:

**Page:** ${page}
**Issue:** "${userText}"
**Status:** Open

The HararAI team will review this and work on a fix. If it's urgent, you can also email support@hararai.com. Is there anything else I can help with?`;
      }

      // Check if this is an issue report
      if (isIssueReport(userText)) {
        setAwaitingIssueDescription(true);
        return `I'm sorry you're running into trouble! So I can log this properly for the team, can you describe exactly what's happening? Include:

- What you were trying to do
- What happened instead
- Any error messages you saw

I'll make sure the HararAI team sees this.`;
      }

      // Try to match from knowledge base
      const match = findBestAnswer(userText);
      if (match) {
        return match.answer;
      }

      // Fallback for unrecognized questions
      return `I'm currently in offline mode and can't access your business data. Here's what I'd suggest:

1. **Check Settings** — Many configuration options are in Settings (gear icon in the sidebar)
2. **Use the Command Palette** — Press Ctrl+K (or Cmd+K) to search for anything
3. **Try again** — The AI assistant should reconnect shortly

Is there something else I can help with?`;
    },
    [awaitingIssueDescription],
  );

  /* ---------------------------------------- */
  /*  Send message via API                     */
  /* ---------------------------------------- */
  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text ?? input).trim();
      if (!messageText || isTyping) return;

      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      // Handle issue reporting locally (no API needed)
      if (awaitingIssueDescription || isIssueReport(messageText)) {
        const response = generateOfflineResponse(messageText);
        const assistantMsg: AssistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response,
          timestamp: new Date(),
          type: awaitingIssueDescription ? "issue-prompt" : "text",
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        return;
      }

      // Build conversation history for the API
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const orgId = getOrgId();

      try {
        // Try real API first
        const result = await tryFetch(() =>
          apiClient.post<ChatApiResponse>(
            `/orgs/${orgId}/assistant/chat`,
            {
              message: messageText,
              history,
            },
          ),
        );

        if (result) {
          // API response received
          setIsOnline(true);
          const assistantMsg: AssistantMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsTyping(false);
          return;
        }

        // API unreachable — fall back to offline keyword matching
        setIsOnline(false);
        const fallbackResponse = generateOfflineResponse(messageText);
        const fallbackMsg: AssistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fallbackResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsTyping(false);
      } catch {
        // API error — fall back to offline
        setIsOnline(false);
        const fallbackResponse = generateOfflineResponse(messageText);
        const fallbackMsg: AssistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fallbackResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsTyping(false);
      }
    },
    [input, isTyping, messages, awaitingIssueDescription, generateOfflineResponse],
  );

  /* ---------------------------------------- */
  /*  Handle suggestion click                  */
  /* ---------------------------------------- */
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  /* ---------------------------------------- */
  /*  Key handler                              */
  /* ---------------------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---------------------------------------- */
  /*  Toggle                                   */
  /* ---------------------------------------- */
  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  };

  /* ---------------------------------------- */
  /*  Format time                              */
  /* ---------------------------------------- */
  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

  /* ---------------------------------------- */
  /*  Current suggestions                      */
  /* ---------------------------------------- */
  const currentSuggestions =
    dynamicSuggestions.length > 0
      ? dynamicSuggestions
      : pageContext?.suggestions ?? DEFAULT_SUGGESTIONS;

  /* ---------------------------------------- */
  /*  Render                                   */
  /* ---------------------------------------- */
  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {/* ============================================================= */}
      {/*  Chat Window                                                   */}
      {/* ============================================================= */}
      {isOpen && !isMinimized && (
        <div
          className="flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease-out] w-[calc(100vw-2.5rem)] sm:w-[400px]"
          style={{
            maxWidth: "400px",
            height: "min(550px, calc(100vh - 6rem))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  AI Office Manager
                </p>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi className="h-2.5 w-2.5 text-green-300" />
                  ) : (
                    <WifiOff className="h-2.5 w-2.5 text-amber-300" />
                  )}
                  <p className="text-[10px] opacity-80">
                    {isOnline ? "Connected to your data" : "Offline mode"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                aria-label="Minimize assistant"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[88%]",
                  msg.role === "user" ? "ml-auto items-end" : "items-start",
                )}
              >
                {/* Avatar for assistant messages */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                      <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI Office Manager
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-card text-foreground border border-border rounded-bl-md shadow-sm",
                  )}
                >
                  {/* Render markdown-like bold text */}
                  {msg.content.split("\n").map((line, lineIdx) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <span key={lineIdx}>
                        {lineIdx > 0 && <br />}
                        {parts.map((part, partIdx) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return (
                              <strong key={partIdx} className="font-semibold">
                                {part.slice(2, -2)}
                              </strong>
                            );
                          }
                          return <span key={partIdx}>{part}</span>;
                        })}
                      </span>
                    );
                  })}
                </div>

                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex flex-col items-start max-w-[88%]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                    <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    AI Office Manager
                  </span>
                </div>
                <div className="rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion chips — show after welcome message if only 1 message */}
            {messages.length === 1 &&
              messages[0].role === "assistant" &&
              !isTyping && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 transition-colors cursor-pointer shadow-sm"
                    >
                      <Sparkles className="h-3 w-3" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-card px-3 py-3 shrink-0">
            {/* Issue reporting indicator */}
            {awaitingIssueDescription && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Describe the issue you're experiencing
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  awaitingIssueDescription
                    ? "Describe what went wrong..."
                    : "Ask about your business..."
                }
                className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition"
                disabled={isTyping}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0",
                  input.trim() && !isTyping
                    ? "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/20"
                    : "bg-muted text-muted-foreground",
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <p className="text-center text-[9px] text-muted-foreground mt-2">
              Powered by{" "}
              <span className="font-semibold">Claude AI</span>
              {!isOnline && " (offline)"}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  Minimized Bar                                                  */}
      {/* ============================================================= */}
      {isOpen && isMinimized && (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg transition-all hover:scale-105"
        >
          <Sparkles className="h-4 w-4" />
          AI Office Manager
        </button>
      )}

      {/* ============================================================= */}
      {/*  Floating Action Button                                         */}
      {/* ============================================================= */}
      {!isMinimized && (
        <button
          type="button"
          onClick={toggleOpen}
          className={cn(
            "group relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
            "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
          )}
          aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {/* Pulse ring to draw attention */}
              <span className="absolute inset-0 rounded-full bg-violet-500 opacity-0 group-hover:opacity-20 transition-opacity" />
            </>
          )}

          {/* "AI" label badge */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-violet-600 shadow-sm border border-violet-200">
              AI
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default AIAssistant;
