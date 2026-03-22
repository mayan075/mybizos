"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  className,
}: EmptyStateProps) {
  const router = useRouter();

  function handlePrimary() {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      router.push(actionHref);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      {/* Illustration circle */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
          <Icon className="h-10 w-10 text-primary/40" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-primary/10" />
        <div className="absolute -left-3 bottom-0 h-2 w-2 rounded-full bg-primary/10" />
        <div className="absolute right-1 -bottom-3 h-2.5 w-2.5 rounded-full bg-primary/5" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      <div className="flex items-center gap-3">
        {actionLabel && (
          <button
            onClick={handlePrimary}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5",
              "bg-primary text-primary-foreground text-sm font-medium",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <button
            onClick={() => router.push(secondaryHref)}
            className="flex h-10 items-center gap-2 rounded-lg border border-input px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
