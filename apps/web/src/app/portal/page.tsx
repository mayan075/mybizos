"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  MessageSquare,
  ArrowRight,
  Clock,
  Gift,
  Star,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";
import { getUser } from "@/lib/auth";

interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  technician: string;
  status: "confirmed" | "pending";
}

interface Invoice {
  id: string;
  service: string;
  date: string;
  amount: number;
  status: "paid" | "unpaid";
}

const quickActions = [
  {
    title: "Book Appointment",
    description: "Schedule your next service visit",
    href: "/portal/appointments",
    icon: CalendarDays,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Pay Invoice",
    description: "View and pay outstanding invoices",
    href: "/portal/invoices",
    icon: FileText,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Message Us",
    description: "Chat with our team directly",
    href: "/portal/messages",
    icon: MessageSquare,
    color: "bg-purple-50 text-purple-600",
  },
] as const;

function StatusBadge({
  status,
}: {
  status: "confirmed" | "pending" | "paid" | "unpaid";
}) {
  const styles: Record<string, string> = {
    confirmed: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    paid: "bg-green-50 text-green-700",
    unpaid: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

export default function PortalDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const user = getUser();
    if (user?.name) {
      setUserName(user.name);
    }

    async function load() {
      try {
        const orgId = getOrgId();
        const [aptsRes, invsRes] = await Promise.all([
          tryFetch(() =>
            apiClient.get<{ data: Appointment[] }>(
              `/orgs/${orgId}/appointments`
            )
          ),
          tryFetch(() =>
            apiClient.get<{ data: Invoice[] }>(`/orgs/${orgId}/invoices`)
          ),
        ]);
        if (aptsRes?.data) setAppointments(aptsRes.data);
        if (invsRes?.data) setInvoices(invsRes.data);
      } catch {
        // Silently handle — empty states will show
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s a quick overview of your account.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  action.color
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {action.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
            </Link>
          );
        })}
      </div>

      {/* Loyalty Points */}
      <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Gift className="h-6 w-6 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              Loyalty Rewards
            </p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                />
              ))}
              <Star className="h-3 w-3 text-amber-300" />
            </div>
          </div>
          <p className="mt-0.5 text-sm text-gray-700">
            You have{" "}
            <span className="font-bold text-amber-700">450 points</span> —{" "}
            <span className="font-semibold text-green-700">
              $45 off your next service!
            </span>
          </p>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Appointments
          </h2>
          <Link
            href="/portal/appointments"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No upcoming appointments
              </p>
            </div>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {apt.service}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {apt.date} &middot; {apt.time}
                    </p>
                    <p className="text-xs text-gray-500">
                      Technician: {apt.technician}
                    </p>
                  </div>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Invoices */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Invoices
          </h2>
          <Link
            href="/portal/invoices"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No invoices</p>
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {inv.id}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{inv.service}</p>
                  <p className="text-xs text-gray-400">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(inv.amount)}
                  </p>
                  {inv.status === "unpaid" && (
                    <Link
                      href="/portal/invoices"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Pay Now
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
