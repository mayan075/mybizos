"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left: Org name */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">Acme HVAC</h2>
        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Active
        </span>
      </div>

      {/* Center: Search bar */}
      <button
        onClick={onOpenCommandPalette}
        className={cn(
          "flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-input",
          "bg-muted/50 px-3 text-sm text-muted-foreground",
          "hover:bg-muted transition-colors",
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search contacts, deals...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Right: Notifications + user menu */}
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg",
            "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          )}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <button
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5",
            "hover:bg-muted transition-colors",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            JS
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
