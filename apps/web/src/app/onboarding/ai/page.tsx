"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Building2,
  Clock,
  Briefcase,
  Bot,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Settings2,
  MessageSquare,
} from "lucide-react";
import type {
  OnboardingConfig,
  OnboardingServiceConfig,
  OnboardingPipelineStage,
} from "@hararai/shared";
import { createEmptyOnboardingConfig } from "@hararai/shared";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* -------------------------------------------------------------------------- */
/*  Config Preview Panel                                                       */
/* -------------------------------------------------------------------------- */

function ConfigSection({
  title,
  icon,
  filled,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-500 ${
        filled
          ? "border-indigo-500/30 bg-indigo-500/5 shadow-sm shadow-indigo-500/10"
          : "border-border/40 bg-card/50"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            filled ? "bg-indigo-500/15 text-indigo-500" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {filled && <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function ConfigPreview({ config }: { config: OnboardingConfig }) {
  const sections = [
    { key: "business", filled: Boolean(config.industry) },
    { key: "services", filled: config.services.length > 0 },
    { key: "hours", filled: Boolean(config.hours) },
    { key: "pipeline", filled: config.pipelineStages.length > 0 },
    { key: "agent", filled: Boolean(config.aiAgent) },
  ];
  const filledCount = sections.filter((s) => s.filled).length;
  const progress = Math.round((filledCount / sections.length) * 100);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/40 p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-foreground">Your Platform</h2>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filledCount} of {sections.length} configured</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <ConfigSection
          title="Business"
          icon={<Building2 className="h-4 w-4" />}
          filled={Boolean(config.industry)}
        >
          {config.businessName ? (
            <div>
              <div className="font-medium text-foreground">{config.businessName}</div>
              {config.industry && (
                <div className="text-xs capitalize text-muted-foreground">
                  {config.industry.replace(/_/g, " ")}
                </div>
              )}
              {config.location && (
                <div className="text-xs text-muted-foreground">{config.location}</div>
              )}
            </div>
          ) : (
            <span className="text-xs italic">Waiting for business info...</span>
          )}
        </ConfigSection>

        <ConfigSection
          title="Services"
          icon={<Briefcase className="h-4 w-4" />}
          filled={config.services.length > 0}
        >
          {config.services.length > 0 ? (
            <ul className="space-y-1">
              {config.services.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className={s.isEstimate ? "italic text-muted-foreground" : "text-foreground"}>
                    {s.name}
                    {s.isEstimate && (
                      <span className="ml-1 rounded bg-amber-500/10 px-1 text-[10px] text-amber-600">
                        suggested
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    ${s.priceMin}-${s.priceMax}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs italic">No services yet...</span>
          )}
        </ConfigSection>

        <ConfigSection
          title="Hours"
          icon={<Clock className="h-4 w-4" />}
          filled={Boolean(config.hours)}
        >
          {config.hours ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {Object.entries(config.hours).map(([day, h]) => (
                <div key={day} className="flex justify-between">
                  <span className="capitalize">{day.slice(0, 3)}</span>
                  <span className={h.open ? "text-foreground" : "text-muted-foreground"}>
                    {h.open ? `${h.start}-${h.end}` : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs italic">Not set yet...</span>
          )}
        </ConfigSection>

        <ConfigSection
          title="Pipeline"
          icon={<ChevronRight className="h-4 w-4" />}
          filled={config.pipelineStages.length > 0}
        >
          {config.pipelineStages.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {config.pipelineStages
                .sort((a, b) => a.order - b.order)
                .map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600"
                  >
                    {s.name}
                  </span>
                ))}
            </div>
          ) : (
            <span className="text-xs italic">Not configured yet...</span>
          )}
        </ConfigSection>

        <ConfigSection
          title="AI Agent"
          icon={<Bot className="h-4 w-4" />}
          filled={Boolean(config.aiAgent)}
        >
          {config.aiAgent ? (
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Tone: </span>
                <span className="capitalize text-foreground">{config.aiAgent.tone}</span>
              </div>
              {config.aiAgent.emergencyKeywords.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Emergency alerts: </span>
                  <span className="text-foreground">
                    {config.aiAgent.emergencyKeywords.length} keywords
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs italic">Not configured yet...</span>
          )}
        </ConfigSection>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 p-4">
        <a
          href="/onboarding"
          className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip to manual setup &rarr;
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chat Panel                                                                 */
/* -------------------------------------------------------------------------- */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-500 text-white"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function AiOnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<OnboardingConfig>(createEmptyOnboardingConfig());
  const [isFinishing, setIsFinishing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send initial greeting after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm going to help you set up your entire business platform in about 5 minutes. Tell me about your business \u2014 what do you do?",
        },
      ]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/onboarding/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          config,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const { data } = await res.json();

      // Update config
      setConfig(data.config);

      // Add assistant response
      setMessages([...newMessages, { role: "assistant", content: data.message }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Sorry, I had trouble processing that. Could you try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, config]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFinalize = async () => {
    setIsFinishing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("hararai_token");

      const res = await fetch(`${apiUrl}/onboarding/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        // Even if finalization fails, move to dashboard — they can configure manually
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
  };

  // Check if setup is "complete enough" to offer Launch button
  const isSetupComplete = Boolean(config.industry) && config.services.length > 0;

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Chat Panel */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border/40 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Set Up Your Business</h1>
            <p className="text-xs text-muted-foreground">
              Chat with AI to configure your platform
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/40 px-6 py-4">
          <div className="mx-auto max-w-2xl">
            {isSetupComplete && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-green-500/10 px-4 py-2.5">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Your platform is ready to launch!
                </span>
                <button
                  onClick={handleFinalize}
                  disabled={isFinishing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isFinishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Launch
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell me about your business..."
                  disabled={isLoading}
                  className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Config Preview Panel */}
      <div className="hidden w-96 border-l border-border/40 bg-card/50 lg:block">
        <ConfigPreview config={config} />
      </div>

      {/* Mobile: floating config button */}
      <div className="fixed bottom-20 right-4 lg:hidden">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
          onClick={() => {
            // TODO: show config panel as bottom sheet on mobile
          }}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
