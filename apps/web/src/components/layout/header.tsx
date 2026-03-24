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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser, removeToken } from "@/lib/auth";
import { getOnboardingData } from "@/lib/onboarding";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onToggleMobileSidebar?: () => void;
}

const notifications = [
  {
    id: "n1",
    icon: UserPlus,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    title: "New lead: Sarah Johnson",
    description: "Quote request for drain cleaning",
    time: "5 min ago",
    read: false,
    href: "/dashboard/contacts/c1",
  },
  {
    id: "n2",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "AI booked: Tom Anderson",
    description: "AC Tune-Up, Tomorrow 10:00 AM",
    time: "15 min ago",
    read: false,
    href: "/dashboard/scheduling",
  },
  {
    id: "n3",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    title: "AI qualified lead: Mike Thompson",
    description: "Water heater replacement, $3,000 budget",
    time: "23 min ago",
    read: false,
    href: "/dashboard/contacts/c2",
  },
  {
    id: "n4",
    icon: Star,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    title: "New 5-star Google review!",
    description: "Sarah Johnson left a review",
    time: "1 hr ago",
    read: false,
    href: "/dashboard/reviews",
  },
  {
    id: "n5",
    icon: Flame,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    title: "Hot lead: David Wilson",
    description: "Visited pricing page 3 times",
    time: "1 hr ago",
    read: false,
    href: "/dashboard/contacts/c3",
  },
  {
    id: "n6",
    icon: AlertTriangle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    title: "2-star review needs response",
    description: "Tom Anderson on Google",
    time: "2 hr ago",
    read: true,
    href: "/dashboard/reviews",
  },
  {
    id: "n7",
    icon: Phone,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    title: "AI Phone Agent: 47 calls today",
    description: "32 qualified, 15 booked",
    time: "6:00 PM",
    read: true,
    href: "/dashboard/analytics",
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${(parts[0]?.[0] ?? "").toUpperCase()}${(parts[parts.length - 1]?.[0] ?? "").toUpperCase()}`;
  }
  return (parts[0]?.substring(0, 2) ?? "DU").toUpperCase();
}

export function Header({ onOpenCommandPalette, onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set(["n6", "n7"]));
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const user = useMemo(() => getUser(), []);
  const onboarding = useMemo(() => getOnboardingData(), []);
  const userName = user?.name ?? "Demo User";
  const userEmail = user?.email ?? "demo@mybizos.com";
  const orgName = onboarding?.businessName ?? user?.orgName ?? "Demo Business";
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
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
    <header className="flex h-16 items-center justify-between bg-card/80 backdrop-blur-xl px-4 sm:px-6 relative">
      {/* Subtle bottom shadow instead of border */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-border/50" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] shadow-[0_1px_3px_0_oklch(0_0_0/0.04)]" />

      {/* Left: Mobile menu + Org name */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 hover:scale-[1.04] md:hidden"
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

      {/* Center: Search bar — rounded-full, subtle shadow */}
      <button
        onClick={onOpenCommandPalette}
        className={cn(
          "hidden sm:flex h-9 w-full max-w-md items-center gap-2.5 rounded-full",
          "bg-muted/40 px-4 text-sm text-muted-foreground",
          "shadow-[0_0_0_1px_oklch(0_0_0/0.04),0_1px_2px_0_oklch(0_0_0/0.03)]",
          "hover:bg-muted/60 hover:shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_2px_4px_0_oklch(0_0_0/0.04)]",
          "transition-all duration-200",
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground/70" />
        <span className="flex-1 text-left">Search contacts, deals...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md bg-background/80 px-1.5 text-[10px] font-medium text-muted-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.06)]">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Right: Notifications + user menu */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/60 hover:scale-[1.06]",
              "transition-all duration-200",
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
            <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl bg-popover shadow-[0_16px_48px_-12px_oklch(0_0_0/0.15),0_0_0_1px_oklch(0_0_0/0.04)] z-50">
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
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150",
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
                        <div className="h-2 w-2 rounded-full gradient-accent shrink-0 mt-2" />
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
              "hover:bg-muted/60 hover:scale-[1.02]",
              "transition-all duration-200",
              showUserMenu && "bg-muted/60",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-accent text-primary-foreground text-xs font-bold shadow-sm">
              {userInitials}
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", showUserMenu && "rotate-180")} />
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-popover shadow-[0_16px_48px_-12px_oklch(0_0_0/0.15),0_0_0_1px_oklch(0_0_0/0.04)] z-50">
              <div className="px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground tracking-tight">{userName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
              </div>
              <div className="h-px bg-border/50 mx-3" />
              <div className="p-1.5">
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings?tab=profile"); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-all duration-150"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings"); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-all duration-150"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              </div>
              <div className="h-px bg-border/50 mx-3" />
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-all duration-150"
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
