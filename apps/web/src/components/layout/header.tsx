"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, User, Settings, LogOut, Phone, CalendarCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

const notifications = [
  { id: "n1", icon: Phone, title: "Missed call from (555) 444-3333", time: "5 min ago", read: false },
  { id: "n2", icon: CalendarCheck, title: "Appointment confirmed — Sarah Johnson", time: "20 min ago", read: false },
  { id: "n3", icon: MessageSquare, title: "New SMS from Mike Chen", time: "1 hr ago", read: false },
  { id: "n4", icon: Phone, title: "AI handled call — furnace inquiry", time: "2 hr ago", read: true },
  { id: "n5", icon: CalendarCheck, title: "Reminder: Lisa Wang appointment tomorrow", time: "3 hr ago", read: true },
];

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set(["n4", "n5"]));
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !readNotifications.has(n.id)).length;

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

  function handleNotificationClick(id: string) {
    setReadNotifications((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadNotifications(new Set(notifications.map((n) => n.id)));
  }

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
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg",
              "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              showNotifications && "bg-muted text-foreground",
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.map((notif) => {
                  const isRead = readNotifications.has(notif.id);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                        !isRead && "bg-primary/5",
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                        <notif.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          isRead ? "text-muted-foreground" : "text-foreground font-medium",
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.time}</p>
                      </div>
                      {!isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-border px-4 py-2.5">
                <button
                  onClick={() => { setShowNotifications(false); router.push("/dashboard/inbox"); }}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full text-center"
                >
                  View all notifications
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
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              "hover:bg-muted transition-colors",
              showUserMenu && "bg-muted",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              JS
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showUserMenu && "rotate-180")} />
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-2xl z-50">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">John Smith</p>
                <p className="text-xs text-muted-foreground">john@acmehvac.com</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button
                  onClick={() => { setShowUserMenu(false); router.push("/login"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
