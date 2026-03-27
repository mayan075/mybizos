"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MapPin,
  X,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAppointments, useCreateAppointment } from "@/lib/hooks/use-appointments";
import { type MockAppointment } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/empty-state";
import { SchedulingSkeleton } from "@/components/skeletons/scheduling-skeleton";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM to 6 PM — wider range for early/late jobs
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusColors: Record<string, string> = {
  scheduled: "bg-info/10 border-info/30 text-info",
  confirmed: "bg-success/10 border-success/30 text-success",
  completed: "bg-muted border-border text-muted-foreground",
};

const statusDotColors: Record<string, string> = {
  scheduled: "bg-info",
  confirmed: "bg-success",
  completed: "bg-muted-foreground",
};

function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

function getTodayIndex(weekOffset: number): number {
  if (weekOffset !== 0) return -1;
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getWeekLabel(weekOffset: number): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mStr = monday.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const sStr = sunday.toLocaleDateString("en-US", { day: "numeric", year: "numeric" });
  return `${mStr} - ${sStr}`;
}

/** Get the current time as a fractional position within the HOURS grid (0-1 scale per hour row) */
function getCurrentTimePosition(): { hourIndex: number; minuteFraction: number } | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if current time falls within our grid
  const firstHour = HOURS[0];
  const lastHour = HOURS[HOURS.length - 1];
  if (firstHour === undefined || lastHour === undefined) return null;
  if (currentHour < firstHour || currentHour > lastHour) return null;

  const hourIndex = currentHour - firstHour;
  const minuteFraction = currentMinute / 60;
  return { hourIndex, minuteFraction };
}

export default function SchedulingPage() {
  usePageTitle("Scheduling");
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState<{ dayIndex: number; hour: number } | null>(null);
  const [newTitle, setNewTitle] = useState("General Service");
  const [newCustomer, setNewCustomer] = useState("");

  // Current time indicator — update every minute
  const [currentTimePos, setCurrentTimePos] = useState(getCurrentTimePosition);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  // Hook: fetches from API, falls back to mock data
  const { data: apiAppointments, isLive, isLoading } = useAppointments();
  const { mutate: createAppointmentApi } = useCreateAppointment();

  // Local additions for optimistic UI
  const [localAppointments, setLocalAppointments] = useState<MockAppointment[]>([]);

  // Merge API/mock data with local additions
  const appointments = useMemo(() => {
    if (isLoading) return [];
    return [...apiAppointments, ...localAppointments];
  }, [apiAppointments, isLoading, localAppointments]);

  const dates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayIndex = getTodayIndex(weekOffset);
  const weekLabel = useMemo(() => getWeekLabel(weekOffset), [weekOffset]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const goToToday = useCallback(() => setWeekOffset(0), []);

  function handleSlotClick(dayIndex: number, hour: number) {
    const existing = appointments.find(
      (a) => a.dayIndex === dayIndex && a.hourStart === hour,
    );
    if (existing) {
      showToast(`${existing.title} with ${existing.customer} \u2014 ${existing.status}`);
      return;
    }
    setShowBooking({ dayIndex, hour });
  }

  async function handleBook() {
    if (!showBooking || !newCustomer.trim()) return;
    const hourLabel = showBooking.hour > 12
      ? `${showBooking.hour - 12}:00 PM`
      : showBooking.hour === 12
        ? "12:00 PM"
        : `${showBooking.hour}:00 AM`;
    const endHour = showBooking.hour + 1;
    const endLabel = endHour > 12
      ? `${endHour - 12}:00 PM`
      : endHour === 12
        ? "12:00 PM"
        : `${endHour}:00 AM`;

    const newApt: MockAppointment = {
      id: `a-${Date.now()}`,
      title: newTitle,
      customer: newCustomer.trim(),
      time: `${hourLabel} - ${endLabel}`,
      duration: 1,
      dayIndex: showBooking.dayIndex,
      hourStart: showBooking.hour,
      status: "scheduled",
      location: "TBD",
    };

    // Optimistic add
    setLocalAppointments((prev) => [...prev, newApt]);

    // Build ISO dates for API
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
    const aptDate = new Date(monday);
    aptDate.setDate(monday.getDate() + showBooking.dayIndex);
    aptDate.setHours(showBooking.hour, 0, 0, 0);
    const endDate = new Date(aptDate);
    endDate.setHours(showBooking.hour + 1);

    // Try to persist via API
    await createAppointmentApi({
      contactId: "",
      contactName: newApt.customer,
      title: newApt.title,
      startTime: aptDate.toISOString(),
      endTime: endDate.toISOString(),
      location: newApt.location,
      bookedBy: "manual",
    });

    setShowBooking(null);
    setNewCustomer("");
    setNewTitle("General Service");
    showToast(`Appointment booked: ${newApt.title} with ${newApt.customer}`);
  }

  // Loading state — show skeleton while initial fetch is in progress
  if (isLoading) {
    return <SchedulingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBooking(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">Book Appointment</h2>
              <button onClick={() => setShowBooking(null)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {DAYS[showBooking.dayIndex]}, {dates[showBooking.dayIndex]} at{" "}
              {showBooking.hour > 12
                ? `${showBooking.hour - 12}:00 PM`
                : showBooking.hour === 12
                  ? "12:00 PM"
                  : `${showBooking.hour}:00 AM`}
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. AC Tune-Up, Plumbing Inspection..."
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Customer Name *</label>
                <input
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Customer name"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowBooking(null)} className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={!newCustomer.trim()}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  newCustomer.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Plus className="h-4 w-4" />
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appointments.length} appointments this week
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Always-visible Today button */}
          <button
            onClick={goToToday}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              weekOffset === 0
                ? "bg-muted text-muted-foreground cursor-default"
                : "border border-input text-foreground hover:bg-muted",
            )}
            disabled={weekOffset === 0}
          >
            <CalendarCheck className="h-4 w-4" />
            Today
          </button>
          <button
            onClick={() => setShowBooking({ dayIndex: todayIndex >= 0 ? todayIndex : 0, hour: 10 })}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4",
              "bg-primary text-primary-foreground text-sm font-medium",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            <Plus className="h-4 w-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
        <button
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-foreground">
            {weekLabel}
          </h2>
          {weekOffset !== 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {Math.abs(weekOffset)} week{Math.abs(weekOffset) > 1 ? "s" : ""}{" "}
              {weekOffset > 0 ? "ahead" : "ago"}
            </p>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Empty state when no appointments */}
      {appointments.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No appointments scheduled"
          description="Set up your booking page so customers can schedule with you. Your AI agent can also book appointments automatically when customers call."
          actionLabel="Book Your First Appointment"
          onAction={() => setShowBooking({ dayIndex: todayIndex >= 0 ? todayIndex : 0, hour: 10 })}
          className="rounded-xl border border-border bg-card"
        />
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
              <div className="px-3 py-3" />
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "px-3 py-3 text-center border-l border-border",
                    i === todayIndex && "bg-primary/5",
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {day}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold mt-0.5",
                      i === todayIndex
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    {dates[i]}
                    {i === todayIndex && (
                      <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {HOURS.map((hour, hourIdx) => (
              <div
                key={hour}
                className="relative grid grid-cols-[80px_repeat(7,1fr)] border-b border-border last:border-b-0"
              >
                {/* Current time red line */}
                {weekOffset === 0 && currentTimePos && currentTimePos.hourIndex === hourIdx && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimePos.minuteFraction * 100}%` }}
                  >
                    <div className="flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0 -ml-[5px]" />
                      <div className="flex-1 h-[2px] bg-destructive" />
                    </div>
                  </div>
                )}

                <div className="px-3 py-2 text-right">
                  <span className="text-xs text-muted-foreground">
                    {hour > 12
                      ? `${hour - 12} PM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour} AM`}
                  </span>
                </div>
                {DAYS.map((day, dayIdx) => {
                  const apt = appointments.find(
                    (a) => a.dayIndex === dayIdx && a.hourStart === hour,
                  );
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cn(
                        "relative border-l border-border min-h-[60px] p-1 cursor-pointer transition-colors",
                        dayIdx === todayIndex && "bg-primary/[0.02]",
                        !apt && "hover:bg-muted/30",
                      )}
                      onClick={() => handleSlotClick(dayIdx, hour)}
                    >
                      {apt && (
                        <div
                          className={cn(
                            "absolute inset-x-1 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-shadow hover:shadow-md z-10",
                            statusColors[apt.status],
                          )}
                          style={{
                            height: `${apt.duration * 60 - 4}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast(`${apt.title} \u2014 ${apt.customer} \u2014 ${apt.location}`);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                statusDotColors[apt.status],
                              )}
                            />
                            <span className="font-semibold truncate">
                              {apt.customer}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 opacity-80">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{apt.title}</span>
                          </div>
                          {apt.duration >= 1.5 && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-80">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              <span>{apt.time}</span>
                            </div>
                          )}
                          {apt.duration >= 2 && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-80">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{apt.location}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
