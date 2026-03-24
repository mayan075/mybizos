"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Phone,
  Users,
  MessageSquare,
  CalendarDays,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboardingData } from "@/lib/onboarding";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const WELCOME_DISMISSED_KEY = "mybizos_welcome_dismissed";
const GETTING_STARTED_DISMISSED_KEY = "mybizos_getting_started_dismissed";
const COMPLETED_STEPS_KEY = "mybizos_onboarding_steps";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  /** How to detect this step is done */
  checkKey: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "account",
    label: "Create your account",
    description: "You're in! Your account is set up.",
    href: "/dashboard/settings",
    icon: CheckCircle2,
    checkKey: "account",
  },
  {
    id: "phone",
    label: "Set up your phone number",
    description: "Connect a phone number so customers can reach you.",
    href: "/dashboard/settings",
    icon: Phone,
    checkKey: "phone",
  },
  {
    id: "contact",
    label: "Add your first contact",
    description: "Import or manually add a customer contact.",
    href: "/dashboard/contacts",
    icon: Users,
    checkKey: "contact",
  },
  {
    id: "message",
    label: "Send your first message",
    description: "Reach out to a customer via SMS or email.",
    href: "/dashboard/inbox",
    icon: MessageSquare,
    checkKey: "message",
  },
  {
    id: "booking",
    label: "Create your booking page",
    description: "Let customers book appointments online.",
    href: "/dashboard/scheduling",
    icon: CalendarDays,
    checkKey: "booking",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCompletedSteps(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COMPLETED_STEPS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveCompletedSteps(steps: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETED_STEPS_KEY, JSON.stringify([...steps]));
}

function isWelcomeDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_DISMISSED_KEY) === "true";
}

function dismissWelcome(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
}

function isGettingStartedDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === "true";
}

function dismissGettingStarted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, "true");
}

// ---------------------------------------------------------------------------
// Progress Ring SVG Component
// ---------------------------------------------------------------------------

function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/60"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="progress-ring-circle"
        style={{
          "--ring-circumference": circumference,
          "--ring-offset": offset,
          transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        } as React.CSSProperties}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.42 0.17 265)" />
          <stop offset="100%" stopColor="oklch(0.48 0.2 295)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Welcome Banner Component — Glassmorphism
// ---------------------------------------------------------------------------

export function WelcomeBanner() {
  const [visible, setVisible] = useState(false);
  const onboarding = typeof window !== "undefined" ? getOnboardingData() : null;
  const businessName = onboarding?.businessName ?? "your business";

  useEffect(() => {
    setVisible(!isWelcomeDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    dismissWelcome();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 border border-primary/10">
      {/* Decorative gradient orbs */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10" />
      <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-violet-500/10" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-accent shadow-sm">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Welcome to MyBizOS!
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              We are excited to help {businessName} grow. Here are 3 things to get started:
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <QuickAction
                href="/dashboard/contacts"
                label="Add a contact"
                step="1"
              />
              <QuickAction
                href="/dashboard/settings"
                label="Set up your phone"
                step="2"
              />
              <QuickAction
                href="/dashboard/scheduling"
                label="Create a booking page"
                step="3"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200 hover:scale-[1.05]"
          aria-label="Dismiss welcome banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  step,
}: {
  href: string;
  label: string;
  step: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground",
        "bg-card/80 backdrop-blur-sm",
        "shadow-[0_0_0_1px_oklch(0_0_0/0.04),0_1px_2px_0_oklch(0_0_0/0.03)]",
        "hover:shadow-[0_0_0_1px_oklch(0.42_0.17_265/0.3),0_2px_4px_0_oklch(0_0_0/0.04)]",
        "hover:text-primary transition-all duration-200 hover:scale-[1.02]",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full gradient-accent text-[10px] font-bold text-primary-foreground">
        {step}
      </span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Getting Started Checklist Component — with Progress Ring
// ---------------------------------------------------------------------------

export function GettingStartedChecklist() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = getCompletedSteps();
    // Account is always done if they got through onboarding
    saved.add("account");

    // Auto-detect phone setup from onboarding data
    const onboarding = getOnboardingData();
    if (onboarding?.phoneSetup?.mode && onboarding.phoneSetup.mode !== "skip") {
      saved.add("phone");
    }

    saveCompletedSteps(saved);
    setCompleted(saved);
    setDismissed(isGettingStartedDismissed());
  }, []);

  const handleComplete = useCallback(
    (stepId: string) => {
      const next = new Set(completed);
      next.add(stepId);
      saveCompletedSteps(next);
      setCompleted(next);
    },
    [completed],
  );

  const handleDismiss = useCallback(() => {
    dismissGettingStarted();
    setDismissed(true);
  }, []);

  const completedCount = STEPS.filter((s) => completed.has(s.id)).length;
  const allDone = completedCount === STEPS.length;
  const progress = (completedCount / STEPS.length) * 100;

  // Hide if dismissed or all done
  if (dismissed || allDone) return null;

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header with progress ring */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <ProgressRing progress={progress} size={44} strokeWidth={3.5} />
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Getting Started
            </h2>
            <span className="text-xs text-muted-foreground">
              {completedCount} of {STEPS.length} complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
            aria-label="Dismiss getting started"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {STEPS.map((step) => {
            const isDone = completed.has(step.id);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200",
                  isDone
                    ? "opacity-50"
                    : "hover:bg-muted/30 cursor-pointer",
                )}
                onClick={() => {
                  if (!isDone) {
                    router.push(step.href);
                  }
                }}
              >
                {/* Check circle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDone) handleComplete(step.id);
                  }}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    isDone
                      ? "bg-success text-white"
                      : "border-2 border-muted-foreground/20 hover:border-primary text-transparent hover:text-primary hover:scale-110",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>

                {/* Icon */}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200",
                    isDone ? "bg-muted/50" : "bg-primary/8 group-hover:scale-[1.05]",
                  )}
                >
                  <StepIcon
                    className={cn(
                      "h-4 w-4",
                      isDone ? "text-muted-foreground" : "text-primary",
                    )}
                  />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isDone
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Action arrow for incomplete steps */}
                {!isDone && (
                  <span className="text-xs font-semibold text-primary shrink-0">
                    Start
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
