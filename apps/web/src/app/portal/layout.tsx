"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Appointments", href: "/portal/appointments", icon: CalendarDays },
  { label: "Invoices", href: "/portal/invoices", icon: FileText },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare },
  { label: "Profile", href: "/portal/profile", icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname.startsWith(href);
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          {/* Business branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">
                Precision HVAC & Plumbing
              </p>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: customer name + logout + mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                S
              </div>
              <span className="text-sm font-medium text-gray-700">Sarah</span>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <nav className="border-t border-gray-200 bg-white px-4 pb-3 pt-2 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Precision HVAC & Plumbing
              </p>
              <p className="text-xs text-gray-500">
                (555) 234-5678 &middot; service@precisionhvac.com
              </p>
              <p className="text-xs text-gray-500">
                123 Main Street, Suite 100, Anytown, TX 75001
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Powered by{" "}
              <span className="font-semibold text-gray-500">MyBizOS</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
