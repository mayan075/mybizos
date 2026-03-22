"use client";

import { type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStep {
  title: string;
  description: string;
}

interface SetupWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  canProceed: boolean;
  /** Show a loading spinner on the Continue button */
  isLoading?: boolean;
  children: ReactNode;
}

export function SetupWizard({
  steps,
  currentStep,
  onNext,
  onBack,
  onComplete,
  canProceed,
  isLoading = false,
  children,
}: SetupWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="space-y-8">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                  index < currentStep
                    ? "bg-emerald-500 text-white"
                    : index === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  index === currentStep
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 rounded-full transition-colors duration-300 mb-5",
                  index < currentStep ? "bg-emerald-500" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content with fade animation */}
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        {children}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={isFirstStep}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
            isFirstStep
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={isLastStep ? onComplete : onNext}
          disabled={!canProceed || isLoading}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-all",
            canProceed && !isLoading
              ? isLastStep
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : isLastStep ? (
            "Finish Setup"
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Success Celebration                                                        */
/* -------------------------------------------------------------------------- */

export function SuccessCelebration({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Animated checkmark */}
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 animate-in zoom-in duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </div>
        </div>
        {/* Celebration dots */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full animate-ping"
            style={{
              backgroundColor: ["#f43f5e", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16"][i],
              top: `${50 + 55 * Math.sin((i * Math.PI * 2) / 8)}%`,
              left: `${50 + 55 * Math.cos((i * Math.PI * 2) / 8)}%`,
              animationDelay: `${i * 100}ms`,
              animationDuration: "1.5s",
            }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>
    </div>
  );
}
