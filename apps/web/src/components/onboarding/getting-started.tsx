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
// Welcome Banner Component
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
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-5 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Welcome to MyBizOS!
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              We are excited to help {businessName} grow. Here are 3 things to get started:
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        {step}
      </span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Getting Started Checklist Component
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Getting Started
          </h2>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {STEPS.length} complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Dismiss getting started"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-border">
          {STEPS.map((step) => {
            const isDone = completed.has(step.id);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors",
                  isDone
                    ? "opacity-60"
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
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    isDone
                      ? "bg-success text-white"
                      : "border-2 border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary",
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
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isDone ? "bg-muted" : "bg-primary/10",
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Action arrow for incomplete steps */}
                {!isDone && (
                  <span className="text-xs font-medium text-primary shrink-0">
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
