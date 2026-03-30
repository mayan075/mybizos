"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  User,
  Plus,
  RotateCcw,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled" | "scheduled";

interface Appointment {
  id: string;
  title: string;
  contactName: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  location?: string;
  assignedTo?: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  confirmed: {
    label: "Confirmed",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle2,
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    icon: CalendarDays,
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: XIcon,
  },
};

type FilterTab = "upcoming" | "past";

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const orgId = getOrgId();
      const data = await tryFetch(() => apiClient.get<Appointment[]>(`/orgs/${orgId}/appointments`));
      setAppointments(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime);
    const isPast = aptDate < now || apt.status === "completed" || apt.status === "cancelled";
    return activeTab === "upcoming" ? !isPast : isPast;
  });

  const upcomingCount = appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= now && apt.status !== "completed" && apt.status !== "cancelled";
  }).length;
  const pastCount = appointments.length - upcomingCount;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(startStr: string, endStr: string) {
    const fmt = (d: string) =>
      new Date(d).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    return `${fmt(startStr)} - ${fmt(endStr)}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your service appointments
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Book New Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["upcoming", "past"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab} ({tab === "upcoming" ? upcomingCount : pastCount})
          </button>
        ))}
      </div>

      {/* Appointment list */}
      <div className="space-y-3">
        {filteredAppointments.map((apt) => {
          const config = statusConfig[apt.status] ?? statusConfig["scheduled"]!;
          const StatusIcon = config.icon;
          const isPast = new Date(apt.startTime) < now;
          return (
            <div
              key={apt.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {apt.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        config.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(apt.startTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(apt.startTime, apt.endTime)}
                    </span>
                    {apt.assignedTo && (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {apt.assignedTo}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {isPast ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Book Again
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/50"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/5"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAppointments.length === 0 && (
        <div className="py-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No {activeTab} appointments
          </p>
        </div>
      )}
    </div>
  );
}
