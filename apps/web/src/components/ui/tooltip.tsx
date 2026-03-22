"use client";

import { useState, useRef, useCallback } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  /** Show as an info icon if no children provided */
  showIcon?: boolean;
  /** Position relative to the trigger */
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  showIcon = true,
  position = "top",
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children ?? (
        showIcon && (
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        )
      )}
      {visible && (
        <span
          className={cn(
            "absolute z-50 w-max max-w-xs rounded-lg bg-popover border border-border px-3 py-2 text-xs text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            positionClasses[position],
          )}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
