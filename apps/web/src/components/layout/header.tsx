"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Phone,
  UserPlus,
  Bot,
  Flame,
  Star,
  AlertTriangle,
  ChevronRight,
  Menu,
  Plus,
  Users,
  Kanban,
  CalendarDays,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser, removeToken } from "@/lib/auth";
import { getOnboardingData } from "@/lib/onboarding";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onToggleMobileSidebar?: () => void;
}

const notifications: Array<{
  id: string;
  icon: typeof UserPlus;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  href: string;
}> = [
  // Real notifications will come from the API
  // Empty for now — no fake data
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${(parts[0]?.[0] ?? "").toUpperCase()}${(parts[parts.length - 1]?.[0] ?? "").toUpperCase()}`;
  }
  return (parts[0]?.substring(0, 2) ?? "DU").toUpperCase();
}

const quickActions = [
  { id: "qa-contact", label: "New Contact", icon: Users, href: "/dashboard/contacts?action=new" },
  { id: "qa-deal", label: "New Deal", icon: Kanban, href: "/dashboard/pipeline?action=new" },
  { id: "qa-appointment", label: "New Appointment", icon: CalendarDays, href: "/dashboard/scheduling?action=new" },
  { id: "qa-invoice", label: "New Invoice", icon: Receipt, href: "/dashboard/invoices/new" },
];

export function Header({ onOpenCommandPalette, onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set(["n6", "n7"]));
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  const user = useMemo(() => getUser(), []);
  const onboarding = useMemo(() => getOnboardingData(), []);
  const userName = user?.name ?? "User";
  const userEmail = user?.email ?? "";

  // Resolve business name from multiple sources (priority order):
  // 1. JWT token orgName
  // 2. Onboarding data businessName
  // 3. localStorage settings businessName
  // 4. "My Business" as last resort
  const orgName = useMemo(() => {
    // JWT orgName is highest priority (most authoritative)
    if (user?.orgName && user.orgName !== "My Business") return user.orgName;
    // Onboarding data
    if (onboarding?.businessName) return onboarding.businessName;
    // localStorage settings (from the settings page)
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("hararai_settings");
        if (raw) {
          const settings = JSON.parse(raw) as { businessName?: string };
          if (settings.businessName) return settings.businessName;
        }
      } catch { /* ignore */ }
    }
    return "My Business";
  }, [user, onboarding]);

  const userInitials = getInitials(userName);

  const unreadCount = notifications.filter((n) => !readNotifications.has(n.id)).length;
  const visibleNotifications = notifications.slice(0, 5);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setShowQuickActions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowQuickActions(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleNotificationClick(id: string, href: string) {
    setReadNotifications((prev) => new Set([...prev, id]));
    setShowNotifications(false);
    router.push(href);
  }

  function markAllRead() {
    setReadNotifications(new Set(notifications.map((n) => n.id)));
  }

  function handleLogout() {
    setShowUserMenu(false);
    removeToken();
    router.push("/login");
  }

  return (
    <header className="relative z-40 flex h-16 items-center justify-between bg-card border-b border-border/50 px-4 sm:px-6">
      {/* Left: Mobile menu + Org name */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{orgName}</h2>
        <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
          Active
        </span>
      </div>

      {/* Center: Search bar */}
      <button
        onClick={onOpenCommandPalette}
        className={cn(
          "hidden sm:flex h-9 w-full max-w-md items-center gap-2.5 rounded-full",
          "bg-muted/40 px-4 text-sm text-muted-foreground",
          "border border-border/40",
          "hover:bg-muted/60 hover:border-border/60",
          "transition-all duration-200",
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground/70" />
        <span className="flex-1 text-left">Search contacts, deals...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md bg-background/80 px-1.5 text-[10px] font-medium text-muted-foreground border border-border/40">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Right: Quick actions + Notifications + user menu */}
      <div className="flex items-center gap-1.5">
        {/* Quick Actions (+) button */}
        <div className="relative" ref={quickActionsRef}>
          <button
            onClick={() => { setShowQuickActions(!showQuickActions); setShowNotifications(false); setShowUserMenu(false); }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/60",
              "transition-colors",
              showQuickActions && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            aria-label="Quick actions"
            title="Create new..."
          >
            <Plus className={cn("h-[18px] w-[18px] transition-transform duration-200", showQuickActions && "rotate-45")} />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-popover border border-border/60 shadow-lg z-[60]">
              <div className="px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Create New</p>
              </div>
              <div className="h-px bg-border/50 mx-3" />
              <div className="p-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      setShowQuickActions(false);
                      router.push(action.href);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/60",
              "transition-colors",
              showNotifications && "bg-muted/60 text-foreground",
            )}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 rounded-xl bg-popover border border-border/60 shadow-lg z-[60]">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="h-px bg-border/50 mx-4" />
              <div className="max-h-[400px] overflow-y-auto py-1">
                {visibleNotifications.map((notif) => {
                  const isRead = readNotifications.has(notif.id);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.href)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-muted/40 rounded-lg mx-1",
                        !isRead && "bg-primary/[0.03]",
                      )}
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5",
                          notif.iconBg
                        )}
                      >
                        <notif.icon className={cn("h-4 w-4", notif.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-snug",
                          isRead ? "text-muted-foreground" : "text-foreground font-medium",
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{notif.time}</p>
                      </div>
                      {!isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-px bg-border/50 mx-4" />
              <div className="px-4 py-2.5">
                <button
                  onClick={() => { setShowNotifications(false); router.push("/dashboard/notifications"); }}
                  className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full"
                >
                  View all notifications
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5",
              "hover:bg-muted/60",
              "transition-colors",
              showUserMenu && "bg-muted/60",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {userInitials}
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", showUserMenu && "rotate-180")} />
          </button>

          {/* User dropdown — positioned below avatar, proper z-index */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-popover border border-border/60 shadow-lg z-[60]">
              <div className="px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground tracking-tight">{userName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
              </div>
              <div className="h-px bg-border/50 mx-3" />
              <div className="p-1.5">
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings?tab=profile"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              </div>
              <div className="h-px bg-border/50 mx-3" />
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
