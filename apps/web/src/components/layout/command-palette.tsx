"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Kanban,
  Inbox,
  CalendarDays,
  Settings,
  LayoutDashboard,
  X,
  Phone,
  Megaphone,
  GitBranch,
  Zap,
  Star,
  Share2,
  FileInput,
  Receipt,
  FileText,
  UsersRound,
  BarChart3,
  Activity,
  Plus,
  MessageSquare,
  Send,
  ArrowRight,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/recently-viewed";

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  section: string;
  shortcut?: string;
  action: "navigate" | "create" | "search" | "action" | "recent";
  href?: string;
  /** For dynamic commands: a description shown below the label */
  description?: string;
}

const staticCommands: Command[] = [
  // Navigation — Core
  { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, section: "Navigation", action: "navigate", href: "/dashboard" },
  { id: "nav-contacts", label: "Go to Contacts", icon: Users, section: "Navigation", action: "navigate", href: "/dashboard/contacts" },
  { id: "nav-pipeline", label: "Go to Pipeline", icon: Kanban, section: "Navigation", action: "navigate", href: "/dashboard/pipeline" },
  { id: "nav-inbox", label: "Go to Inbox", icon: Inbox, section: "Navigation", action: "navigate", href: "/dashboard/inbox" },
  { id: "nav-calls", label: "Go to Calls", icon: Phone, section: "Navigation", action: "navigate", href: "/dashboard/calls" },
  { id: "nav-scheduling", label: "Go to Scheduling", icon: CalendarDays, section: "Navigation", action: "navigate", href: "/dashboard/scheduling" },

  // Navigation — Marketing
  { id: "nav-campaigns", label: "Go to Campaigns", icon: Megaphone, section: "Navigation", action: "navigate", href: "/dashboard/campaigns" },
  { id: "nav-sequences", label: "Go to Sequences", icon: GitBranch, section: "Navigation", action: "navigate", href: "/dashboard/sequences" },
  { id: "nav-automations", label: "Go to Automations", icon: Zap, section: "Navigation", action: "navigate", href: "/dashboard/automations" },
  { id: "nav-reviews", label: "Go to Reviews", icon: Star, section: "Navigation", action: "navigate", href: "/dashboard/reviews" },
  { id: "nav-social", label: "Go to Social", icon: Share2, section: "Navigation", action: "navigate", href: "/dashboard/social" },
  { id: "nav-forms", label: "Go to Forms", icon: FileInput, section: "Navigation", action: "navigate", href: "/dashboard/forms" },

  // Navigation — Operations
  { id: "nav-invoices", label: "Go to Invoices", icon: Receipt, section: "Navigation", action: "navigate", href: "/dashboard/invoices" },
  { id: "nav-estimates", label: "Go to Estimates", icon: FileText, section: "Navigation", action: "navigate", href: "/dashboard/estimates" },

  // Navigation — Other
  { id: "nav-team", label: "Go to Team", icon: UsersRound, section: "Navigation", action: "navigate", href: "/dashboard/team" },
  { id: "nav-analytics", label: "Go to Analytics", icon: BarChart3, section: "Navigation", action: "navigate", href: "/dashboard/analytics" },
  { id: "nav-activity", label: "Go to Activity", icon: Activity, section: "Navigation", action: "navigate", href: "/dashboard/activity" },
  { id: "nav-settings", label: "Go to Settings", icon: Settings, section: "Navigation", action: "navigate", href: "/dashboard/settings" },
  { id: "nav-notifications", label: "Go to Notifications", icon: Activity, section: "Navigation", action: "navigate", href: "/dashboard/notifications" },

  // Create actions
  { id: "create-contact", label: "New Contact", icon: Plus, section: "Create", shortcut: "Ctrl+N", action: "create", href: "/dashboard/contacts?action=new" },
  { id: "create-deal", label: "New Deal", icon: Plus, section: "Create", shortcut: "Ctrl+Shift+N", action: "create", href: "/dashboard/pipeline?action=new" },
  { id: "create-appointment", label: "New Appointment", icon: Plus, section: "Create", action: "create", href: "/dashboard/scheduling?action=new" },
  { id: "create-invoice", label: "New Invoice", icon: Plus, section: "Create", action: "create", href: "/dashboard/invoices/new" },

  // Actions
  { id: "action-sms", label: "Send SMS", icon: MessageSquare, section: "Actions", description: "Open inbox to send a text message", action: "action", href: "/dashboard/inbox" },
  { id: "action-call", label: "Make a Call", icon: Phone, section: "Actions", description: "Open the dialer to place a call", action: "action", href: "/dashboard/calls" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load recently viewed items when palette opens
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([]);
  useEffect(() => {
    if (open) {
      setRecentItems(getRecentlyViewed());
    }
  }, [open]);

  // Build recent commands from recently viewed
  const recentCommands: Command[] = useMemo(() => {
    return recentItems.slice(0, 5).map((item, idx) => ({
      id: `recent-${idx}`,
      label: item.label,
      icon: item.type === "Contact" ? User :
            item.type === "Deal" ? Kanban :
            item.type === "Invoice" ? Receipt :
            item.type === "Appointment" ? CalendarDays :
            Clock,
      section: "Recent",
      action: "recent" as const,
      href: item.path,
      description: item.type,
    }));
  }, [recentItems]);

  // Merge all commands
  const allCommands = useMemo(() => {
    return [...recentCommands, ...staticCommands];
  }, [recentCommands]);

  const filtered = useMemo(() => {
    if (!query) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.section.toLowerCase().includes(q) ||
        (cmd.description && cmd.description.toLowerCase().includes(q)),
    );
  }, [query, allCommands]);

  // Group filtered commands by section
  const grouped = useMemo(() => {
    const sections: { title: string; items: Command[] }[] = [];
    const sectionOrder = ["Recent", "Create", "Actions", "Search", "Navigation"];

    for (const section of sectionOrder) {
      const items = filtered.filter((c) => c.section === section);
      if (items.length > 0) {
        sections.push({ title: section, items });
      }
    }

    return sections;
  }, [filtered]);

  const flatFiltered = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );

  function executeCommand(cmd: Command) {
    onClose();
    if (cmd.href) {
      router.push(cmd.href);
    }
  }

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatFiltered.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatFiltered.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatFiltered[selectedIndex];
        if (cmd) executeCommand(cmd);
      }
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onClose, flatFiltered, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = 0;

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
            placeholder="Search contacts, deals, pages, or type a command..."
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
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.title}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              {group.items.map((cmd) => {
                const idx = flatIndex++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left",
                      "transition-colors",
                      isSelected
                        ? "bg-accent text-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{cmd.label}</span>
                      {cmd.description && (
                        <span className="block text-[11px] text-muted-foreground truncate">{cmd.description}</span>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {!cmd.shortcut && isSelected && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
                &uarr;&darr;
              </kbd>
              <span className="text-xs text-muted-foreground">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
                Enter
              </kbd>
              <span className="text-xs text-muted-foreground">Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
