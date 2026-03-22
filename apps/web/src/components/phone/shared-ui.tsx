"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  DemoBanner                                                                 */
/* -------------------------------------------------------------------------- */

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Demo mode</span> — connect your API to use real Twilio numbers
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ToggleSwitch                                                               */
/* -------------------------------------------------------------------------- */

export function ToggleSwitch({
  enabled,
  onToggle,
  size = "default",
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: "default" | "large";
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative rounded-full transition-colors cursor-pointer shrink-0",
        size === "large" ? "h-7 w-[52px]" : "h-6 w-11",
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 rounded-full bg-white shadow transition-transform",
          size === "large" ? "h-6 w-6" : "h-5 w-5",
          enabled
            ? size === "large"
              ? "translate-x-[26px]"
              : "translate-x-[22px]"
            : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

export function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-popover border border-border p-3 text-xs text-popover-foreground shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 h-2 w-2 rotate-45 bg-popover border-r border-b border-border" />
        </div>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  SectionCard                                                                */
/* -------------------------------------------------------------------------- */

export function SectionCard({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  RoutingOptionCard                                                          */
/* -------------------------------------------------------------------------- */

export function RoutingOptionCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  recommended,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  recommended?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl border-2 p-5 transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-muted-foreground/30 bg-card",
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          Recommended
        </span>
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              selected ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          {selected && children && (
            <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors mt-0.5",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground/30",
          )}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  );
}
