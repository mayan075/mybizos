"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DATES = ["Mar 23", "Mar 24", "Mar 25", "Mar 26", "Mar 27", "Mar 28", "Mar 29"];

interface Appointment {
  id: string;
  title: string;
  customer: string;
  time: string;
  duration: number; // in hours
  dayIndex: number; // 0 = Mon
  hourStart: number; // 24h format
  status: "scheduled" | "confirmed" | "completed";
  location: string;
}

const appointments: Appointment[] = [
  {
    id: "a1",
    title: "AC Tune-Up",
    customer: "Sarah Johnson",
    time: "10:00 AM - 11:00 AM",
    duration: 1,
    dayIndex: 0,
    hourStart: 10,
    status: "confirmed",
    location: "742 Evergreen Terrace",
  },
  {
    id: "a2",
    title: "Plumbing Inspection",
    customer: "Mike Chen",
    time: "2:00 PM - 3:30 PM",
    duration: 1.5,
    dayIndex: 1,
    hourStart: 14,
    status: "scheduled",
    location: "123 Oak Street",
  },
  {
    id: "a3",
    title: "Furnace Repair",
    customer: "Lisa Wang",
    time: "9:00 AM - 11:00 AM",
    duration: 2,
    dayIndex: 3,
    hourStart: 9,
    status: "scheduled",
    location: "456 Pine Avenue",
  },
  {
    id: "a4",
    title: "Water Heater Install",
    customer: "James Wilson",
    time: "1:00 PM - 4:00 PM",
    duration: 3,
    dayIndex: 2,
    hourStart: 13,
    status: "confirmed",
    location: "789 Maple Drive",
  },
  {
    id: "a5",
    title: "AC Maintenance",
    customer: "Emily Davis",
    time: "11:00 AM - 12:00 PM",
    duration: 1,
    dayIndex: 4,
    hourStart: 11,
    status: "scheduled",
    location: "321 Elm Street",
  },
];

const statusColors = {
  scheduled: "bg-info/10 border-info/30 text-info",
  confirmed: "bg-success/10 border-success/30 text-success",
  completed: "bg-muted border-border text-muted-foreground",
};

const statusDotColors = {
  scheduled: "bg-info",
  confirmed: "bg-success",
  completed: "bg-muted-foreground",
};

export default function SchedulingPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appointments.length} appointments this week
          </p>
        </div>
        <button
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
            March 23 &ndash; 29, 2026
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {weekOffset === 0 ? "This week" : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? "s" : ""} ${weekOffset > 0 ? "ahead" : "ago"}`}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
              <div className="px-3 py-3" /> {/* time column spacer */}
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "px-3 py-3 text-center border-l border-border",
                    i === 0 && weekOffset === 0 && "bg-primary/5",
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {day}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold mt-0.5",
                      i === 0 && weekOffset === 0
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    {DATES[i]}
                  </p>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border last:border-b-0"
              >
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
                      className="relative border-l border-border min-h-[60px] p-1"
                    >
                      {apt && (
                        <div
                          className={cn(
                            "absolute inset-x-1 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-shadow hover:shadow-md",
                            statusColors[apt.status],
                          )}
                          style={{
                            height: `${apt.duration * 60 - 4}px`,
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
                              {apt.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 opacity-80">
                            <User className="h-2.5 w-2.5" />
                            <span className="truncate">{apt.customer}</span>
                          </div>
                          {apt.duration >= 1.5 && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-80">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{apt.time}</span>
                            </div>
                          )}
                          {apt.duration >= 2 && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-80">
                              <MapPin className="h-2.5 w-2.5" />
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
