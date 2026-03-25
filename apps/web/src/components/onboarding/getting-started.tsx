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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
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
    href: "/dashboard/settings/phone",
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

function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

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
// WelcomeBanner — clean Notion-style info banner with left accent border
// Dismissable. Once dismissed, only the Getting Started checklist shows.
// ---------------------------------------------------------------------------

export function WelcomeBanner() {
  const [visible, setVisible] = useState(false);
  const onboarding = typeof window !== "undefined" ? getOnboardingData() : null;
  const rawName = onboarding?.businessName ?? "your business";
  const businessName = toTitleCase(rawName);

  useEffect(() => {
    setVisible(!isWelcomeDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    dismissWelcome();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative rounded-xl bg-card border border-border/60 border-l-4 border-l-primary p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Welcome to MyBizOS!
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              We&apos;re excited to help {businessName} grow. Complete the steps below to get started.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          aria-label="Dismiss welcome banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Getting Started Checklist — clean design with progress bar
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
  const progressPercent = (completedCount / STEPS.length) * 100;

  // Hide if dismissed or all done
  if (dismissed || allDone) return null;

  return (
    <div className="rounded-xl bg-card border border-border/60 overflow-hidden shadow-sm">
      {/* Header with text progress and thin bar */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Getting Started
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount} of {STEPS.length} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
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
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              aria-label="Dismiss getting started"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {STEPS.map((step) => {
            const isDone = completed.has(step.id);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3.5 px-3 py-3 rounded-lg transition-colors",
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
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDone) handleComplete(step.id);
                  }}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                    isDone
                      ? "bg-success text-white"
                      : "border-2 border-border hover:border-primary",
                  )}
                >
                  {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>

                {/* Icon */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isDone ? "bg-muted/50" : "bg-primary/8",
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

                {/* Action link for incomplete steps */}
                {!isDone && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                    Start
                    <ArrowRight className="h-3 w-3" />
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
