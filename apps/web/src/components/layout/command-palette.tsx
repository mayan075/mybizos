"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Users,
  Kanban,
  Inbox,
  CalendarDays,
  Settings,
  LayoutDashboard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const commands = [
  { label: "Go to Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Go to Contacts", icon: Users, href: "/dashboard/contacts" },
  { label: "Go to Pipeline", icon: Kanban, href: "/dashboard/pipeline" },
  { label: "Go to Inbox", icon: Inbox, href: "/dashboard/inbox" },
  { label: "Go to Scheduling", icon: CalendarDays, href: "/dashboard/scheduling" },
  { label: "Go to Settings", icon: Settings, href: "/dashboard/settings" },
] as const;

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
          {filtered.map((cmd) => (
            <a
              key={cmd.href}
              href={cmd.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                "text-foreground hover:bg-accent transition-colors",
              )}
            >
              <cmd.icon className="h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex gap-2">
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
              &uarr;&darr;
            </kbd>
            <span className="text-xs text-muted-foreground">Navigate</span>
          </div>
          <div className="flex gap-2">
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
              Esc
            </kbd>
            <span className="text-xs text-muted-foreground">Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
