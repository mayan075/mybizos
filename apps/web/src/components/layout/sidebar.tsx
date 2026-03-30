"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Megaphone,
  GitBranch,
  Inbox,
  Phone,
  CalendarDays,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Receipt,
  FileText,
  BarChart3,
  Star,
  Share2,
  UsersRound,
  FileInput,
  Activity,
  Shield,
  AlertCircle,
  HeartPulse,
  Plug,
  Sun,
  Moon,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/use-theme";
import { getUser } from "@/lib/auth";
import { getOnboardingData } from "@/lib/onboarding";
import { tryFetch, apiClient } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge: string | null;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
      { label: "Contacts", href: "/dashboard/contacts", icon: Users, badge: null },
      { label: "Pipeline", href: "/dashboard/pipeline", icon: Kanban, badge: null },
      { label: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: null },
      { label: "Calls", href: "/dashboard/calls", icon: Phone, badge: null },
      { label: "Scheduling", href: "/dashboard/scheduling", icon: CalendarDays, badge: null },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone, badge: null },
      { label: "Sequences", href: "/dashboard/sequences", icon: GitBranch, badge: null },
      { label: "Automations", href: "/dashboard/automations", icon: Zap, badge: null },
      { label: "Reviews", href: "/dashboard/reviews", icon: Star, badge: null },
      { label: "Social", href: "/dashboard/social", icon: Share2, badge: null },
      { label: "Forms", href: "/dashboard/forms", icon: FileInput, badge: null },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Invoices", href: "/dashboard/invoices", icon: Receipt, badge: null },
      { label: "Estimates", href: "/dashboard/estimates", icon: FileText, badge: null },
    ],
  },
  {
    title: null,
    items: [
      { label: "Team", href: "/dashboard/team", icon: UsersRound, badge: null },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, badge: null },
      { label: "Activity", href: "/dashboard/activity", icon: Activity, badge: null },
      { label: "Integrations", href: "/dashboard/integrations", icon: Plug, badge: null },
      { label: "AI Agents", href: "/dashboard/settings/ai-agents", icon: Bot, badge: null },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, badge: null },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Platform Settings", href: "/dashboard/admin/settings", icon: Shield, badge: null },
      { label: "Issues", href: "/dashboard/admin/issues", icon: AlertCircle, badge: null },
      { label: "System Health", href: "/dashboard/admin/health", icon: HeartPulse, badge: null },
    ],
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${(parts[0]?.[0] ?? "").toUpperCase()}${(parts[parts.length - 1]?.[0] ?? "").toUpperCase()}`;
  }
  return (parts[0]?.substring(0, 2) ?? "DU").toUpperCase();
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const user = useMemo(() => getUser(), []);
  const onboarding = useMemo(() => getOnboardingData(), []);
  const userName = user?.name ?? "User";

  // Resolve business name from multiple sources (priority order):
  // 1. JWT token orgName
  // 2. Onboarding data businessName
  // 3. localStorage settings businessName
  // 4. "My Business" as last resort
  const orgName = useMemo(() => {
    if (user?.orgName && user.orgName !== "My Business") return user.orgName;
    if (onboarding?.businessName) return onboarding.businessName;
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

  // Fetch real unread conversation count from API
  useEffect(() => {
    let cancelled = false;
    async function fetchUnread() {
      try {
        const orgId = getOrgId();
        const result = await tryFetch(() =>
          apiClient.get<{ data: { count: number } }>(`/orgs/${orgId}/conversations/unread-count`),
        );
        if (!cancelled && result) {
          const data = typeof result === "object" && result !== null && "data" in result
            ? (result as { data: { count: number } }).data
            : null;
          if (data && typeof data.count === "number" && data.count > 0) {
            setUnreadCount(data.count);
          } else {
            setUnreadCount(null);
          }
        }
      } catch {
        // API unavailable — show no badge (not a fake number)
        if (!cancelled) setUnreadCount(null);
      }
    }
    fetchUnread();
    // Poll every 30 seconds for updated count
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Only show Admin section to platform admins
  const PLATFORM_ADMIN_EMAILS = ["mayan@northernremovals.com.au", "mayan0750@gmail.com"];
  const isAdmin = user?.email ? PLATFORM_ADMIN_EMAILS.includes(user.email) : false;

  // Build nav sections with real unread count injected into Inbox badge
  const dynamicNavSections = useMemo(() => {
    return navSections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.label === "Inbox" && unreadCount !== null && unreadCount > 0) {
          return { ...item, badge: String(unreadCount) };
        }
        return item;
      }),
    }));
  }, [unreadCount]);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar transition-all duration-300 relative",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
      style={{
        backgroundImage: "linear-gradient(180deg, var(--color-sidebar) 0%, var(--color-sidebar-accent) 100%)",
      }}
    >
      {/* Subtle right edge shadow instead of hard border */}
      <div className="absolute inset-y-0 right-0 w-px bg-sidebar-border/60" />

      {/* Logo area */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" prefetch={true} className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-accent shadow-sm transition-transform duration-200 group-hover:scale-[1.05]">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground text-sm tracking-tight">
              HararAI
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            "text-sidebar-muted-foreground hover:text-sidebar-foreground",
            "hover:bg-sidebar-accent/60",
            "transition-all duration-200",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {dynamicNavSections.filter(s => s.title !== "Admin" || isAdmin).map((section, sectionIdx) => (
          <div key={sectionIdx} className={cn(sectionIdx > 0 && "mt-5")}>
            {section.title && !collapsed && (
              <p className="section-label px-3 mb-2">
                {section.title}
              </p>
            )}
            {section.title && collapsed && (
              <div className="mx-auto my-3 h-px w-5 bg-sidebar-border/50" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                // Exact match for dashboard; for other items, match prefix but
                // ensure a more-specific sibling doesn't steal the highlight
                // (e.g. /dashboard/settings vs /dashboard/settings/ai-agents).
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : (pathname === item.href || pathname.startsWith(item.href + "/")) &&
                      // If another nav item is a longer (more specific) prefix match, defer to it
                      !section.items.some(
                        (other) =>
                          other.href !== item.href &&
                          other.href.startsWith(item.href + "/") &&
                          (pathname === other.href || pathname.startsWith(other.href + "/")),
                      );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator — left accent bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full gradient-accent" />
                    )}

                    <item.icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                      isActive ? "text-primary" : "text-sidebar-muted-foreground group-hover:text-sidebar-foreground",
                    )} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full gradient-accent px-1.5 text-[10px] font-bold text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full gradient-accent px-1 text-[9px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3">
        <div className="h-px bg-sidebar-border/40 mb-3 mx-2" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium w-full",
            "text-sidebar-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
            "transition-all duration-200",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : undefined}
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          )}
        </button>

        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sidebar-accent/40 transition-all duration-200 cursor-pointer",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-accent text-primary-foreground text-xs font-bold shadow-sm">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground tracking-tight">
                {userName}
              </p>
              <p className="truncate text-[11px] text-sidebar-muted-foreground">
                {orgName}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
