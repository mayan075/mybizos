"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  User,
  Plus,
  RotateCcw,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled";

interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  technician: string;
  status: AppointmentStatus;
  isPast: boolean;
}

const appointments: Appointment[] = [
  {
    id: "apt-1",
    service: "Full Load Pickup",
    date: "Mar 28, 2026",
    time: "10:00 AM - 11:30 AM",
    technician: "Mike Rodriguez",
    status: "confirmed",
    isPast: false,
  },
  {
    id: "apt-2",
    service: "Single Item Removal",
    date: "Apr 5, 2026",
    time: "2:00 PM - 3:00 PM",
    technician: "James Chen",
    status: "pending",
    isPast: false,
  },
  {
    id: "apt-3",
    service: "Partial Load Pickup",
    date: "Mar 10, 2026",
    time: "9:00 AM - 11:00 AM",
    technician: "Mike Rodriguez",
    status: "completed",
    isPast: true,
  },
  {
    id: "apt-4",
    service: "Kitchen Faucet Installation",
    date: "Feb 22, 2026",
    time: "1:00 PM - 3:00 PM",
    technician: "James Chen",
    status: "completed",
    isPast: true,
  },
  {
    id: "apt-5",
    service: "AC Filter Replacement",
    date: "Jan 15, 2026",
    time: "11:00 AM - 12:00 PM",
    technician: "Mike Rodriguez",
    status: "completed",
    isPast: true,
  },
  {
    id: "apt-6",
    service: "Emergency Pipe Repair",
    date: "Dec 28, 2025",
    time: "3:00 PM - 5:30 PM",
    technician: "James Chen",
    status: "completed",
    isPast: true,
  },
];

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  confirmed: {
    label: "Confirmed",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle2,
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

  const filteredAppointments = appointments.filter((apt) =>
    activeTab === "upcoming" ? !apt.isPast : apt.isPast
  );

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
            {tab} (
            {appointments.filter((a) => (tab === "upcoming" ? !a.isPast : a.isPast)).length}
            )
          </button>
        ))}
      </div>

      {/* Appointment list */}
      <div className="space-y-3">
        {filteredAppointments.map((apt) => {
          const config = statusConfig[apt.status];
          const StatusIcon = config.icon;
          return (
            <div
              key={apt.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {apt.service}
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
                      {apt.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {apt.time}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {apt.technician}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 gap-2">
                  {apt.isPast ? (
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
