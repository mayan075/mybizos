"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Megaphone,
  GitBranch,
  Inbox,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      { label: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: "3" },
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
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, badge: null },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, badge: null },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground text-sm">
              MyBizOS
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "transition-colors",
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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={cn(sectionIdx > 0 && "mt-4")}>
            {section.title && !collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted-foreground">
                {section.title}
              </p>
            )}
            {section.title && collapsed && (
              <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
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
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            JS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                John Smith
              </p>
              <p className="truncate text-xs text-sidebar-muted-foreground">
                Acme HVAC
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
