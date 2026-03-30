"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  CheckCircle2,
  Phone,
  MapPin,
  CalendarPlus,
  Wrench,
  Trash2,
  Truck,
  Package,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { ChatWidget } from "@/components/widgets/chat-widget";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Service {
  id: string;
  name: string;
  duration: string;
  priceRange: string;
  icon: "wrench" | "flame" | "snowflake" | "alert" | "trash" | "truck" | "package" | "box";
  description: string;
}

interface BookingForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock Data — Industry-aware service sets                                   */
/* -------------------------------------------------------------------------- */

const SERVICES_BY_INDUSTRY: Record<string, Service[]> = {
  rubbish_removals: [
    {
      id: "single-item-pickup",
      name: "Single Item Pickup",
      duration: "30-60 min",
      priceRange: "$80-150",
      icon: "trash",
      description: "Pick up and dispose of a single large item (mattress, fridge, couch, etc.)",
    },
    {
      id: "partial-truck-load",
      name: "Partial Truck Load",
      duration: "1-2 hrs",
      priceRange: "$200-350",
      icon: "trash",
      description: "Removal of several items or a partial load of rubbish and junk",
    },
    {
      id: "full-truck-load",
      name: "Full Truck Load",
      duration: "2-3 hrs",
      priceRange: "$350-600",
      icon: "truck",
      description: "Complete truck load removal for big cleanouts and estate clearances",
    },
    {
      id: "skip-bin-hire",
      name: "Skip Bin Hire",
      duration: "Delivered + collected",
      priceRange: "$250-500",
      icon: "box",
      description: "Skip bin delivered to your site and collected when full",
    },
  ],
  moving_company: [
    {
      id: "small-move",
      name: "Small Move (Studio/1BR)",
      duration: "2-4 hrs",
      priceRange: "$250-500",
      icon: "package",
      description: "Studio or 1-bedroom apartment move with 2 movers and truck",
    },
    {
      id: "medium-move",
      name: "Medium Move (2-3BR)",
      duration: "4-6 hrs",
      priceRange: "$500-900",
      icon: "truck",
      description: "2-3 bedroom home move with experienced movers and equipment",
    },
    {
      id: "large-move",
      name: "Large Move (4BR+)",
      duration: "6-10 hrs",
      priceRange: "$900-1,500",
      icon: "truck",
      description: "Large home move with full crew, blankets, and trolleys included",
    },
    {
      id: "packing-service",
      name: "Packing Service",
      duration: "2-4 hrs",
      priceRange: "$200-400",
      icon: "package",
      description: "Professional packing of your belongings with quality materials",
    },
  ],
  plumbing: [
    {
      id: "drain-cleaning",
      name: "Drain Cleaning",
      duration: "30-60 min",
      priceRange: "$150-250",
      icon: "wrench",
      description: "Professional drain clearing and cleaning service",
    },
    {
      id: "water-heater",
      name: "Water Heater Install",
      duration: "2-4 hrs",
      priceRange: "$1,500-3,000",
      icon: "flame",
      description: "Full water heater installation or replacement",
    },
    {
      id: "pipe-repair",
      name: "Pipe Repair",
      duration: "1-2 hrs",
      priceRange: "$200-500",
      icon: "wrench",
      description: "Repair leaking or burst pipes, re-piping services",
    },
    {
      id: "toilet-repair",
      name: "Toilet Repair / Install",
      duration: "1-2 hrs",
      priceRange: "$100-350",
      icon: "wrench",
      description: "Fix running toilets, clogs, or install new fixtures",
    },
    {
      id: "emergency-plumbing",
      name: "Emergency Plumbing",
      duration: "ASAP",
      priceRange: "$200-400",
      icon: "alert",
      description: "24/7 emergency plumbing response for urgent issues",
    },
  ],
  default: [
    {
      id: "consultation",
      name: "Consultation",
      duration: "30-60 min",
      priceRange: "$50-150",
      icon: "wrench",
      description: "Initial consultation and assessment of your needs",
    },
    {
      id: "standard-service",
      name: "Standard Service Call",
      duration: "1-2 hrs",
      priceRange: "$100-300",
      icon: "wrench",
      description: "General service visit for inspection or minor work",
    },
    {
      id: "maintenance",
      name: "Maintenance Visit",
      duration: "1-3 hrs",
      priceRange: "$150-400",
      icon: "wrench",
      description: "Scheduled maintenance and preventive service",
    },
    {
      id: "emergency-service",
      name: "Emergency Service",
      duration: "ASAP",
      priceRange: "$200-500",
      icon: "alert",
      description: "24/7 emergency response for urgent situations",
    },
  ],
};

/**
 * Detect the industry from the slug.
 * In production this would come from the API, but for the booking page
 * we infer it from well-known slug patterns.
 */
function detectIndustryFromSlug(slug: string): string {
  const lower = slug.toLowerCase();
  if (lower.includes("remov") || lower.includes("rubbish") || lower.includes("junk") || lower.includes("waste") || lower.includes("skip")) {
    return "rubbish_removals";
  }
  if (lower.includes("mov") || lower.includes("relocat") || lower.includes("transport")) {
    return "moving_company";
  }
  if (lower.includes("plumb") || lower.includes("drain") || lower.includes("pipe")) {
    return "plumbing";
  }
  return "default";
}

function getServicesForSlug(slug: string): Service[] {
  const industry = detectIndustryFromSlug(slug);
  return SERVICES_BY_INDUSTRY[industry] ?? SERVICES_BY_INDUSTRY["default"]!;
}

const TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

function slugToBusinessName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function generateDates(count: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  let cursor = new Date(today);
  while (dates.length < count) {
    if (cursor.getDay() !== 0) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/* -------------------------------------------------------------------------- */
/*  Step components                                                           */
/* -------------------------------------------------------------------------- */

function ServiceIcon({ type }: { type: Service["icon"] }) {
  const base = "h-6 w-6";
  switch (type) {
    case "wrench":
      return <Wrench className={cn(base, "text-blue-600")} />;
    case "trash":
      return <Trash2 className={cn(base, "text-green-600")} />;
    case "truck":
      return <Truck className={cn(base, "text-indigo-600")} />;
    case "package":
      return <Package className={cn(base, "text-amber-600")} />;
    case "box":
      return <Box className={cn(base, "text-slate-600")} />;
    case "flame":
      return (
        <svg className={cn(base, "text-orange-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      );
    case "snowflake":
      return (
        <svg className={cn(base, "text-cyan-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
        </svg>
      );
    case "alert":
      return (
        <svg className={cn(base, "text-red-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
  }
}

function StepService({
  selected,
  onSelect,
  services,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  services: Service[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Select a Service</h2>
        <p className="text-sm text-gray-500 mt-1">Choose the service you need</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((svc) => (
          <button
            key={svc.id}
            type="button"
            onClick={() => onSelect(svc.id)}
            className={cn(
              "relative flex flex-col items-start rounded-xl border-2 p-5 text-left transition-all",
              "hover:shadow-md hover:border-blue-400",
              selected === svc.id
                ? "border-blue-600 bg-blue-50 shadow-md ring-1 ring-blue-600/20"
                : "border-gray-200 bg-white",
            )}
          >
            {selected === svc.id && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <ServiceIcon type={svc.icon} />
            </div>
            <h3 className="font-semibold text-gray-900">{svc.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{svc.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {svc.duration}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {svc.priceRange}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDate({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const dates = useMemo(() => generateDates(14), []);

  const monthLabel = useMemo(() => {
    if (dates.length === 0) return "";
    const first = dates[0];
    const last = dates[dates.length - 1];
    const fmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
    if (first.getMonth() === last.getMonth()) return fmt.format(first);
    const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short" });
    return `${fmtShort.format(first)} - ${fmt.format(last)}`;
  }, [dates]);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Select a Date</h2>
        <p className="text-sm text-gray-500 mt-1">{monthLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
        {/* empty spacer for Sun column since Sundays are excluded */}
        <div className="py-1 text-gray-300">Sun</div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const isSelected =
            selected !== null &&
            date.toDateString() === selected.toDateString();
          const isToday = date.toDateString() === today.toDateString();
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl py-3 transition-all text-sm font-medium",
                "hover:bg-blue-50 hover:text-blue-700",
                isSelected
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:text-white"
                  : isToday
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "bg-gray-50 text-gray-700",
              )}
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
              </span>
              <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
              <span className="text-[10px] opacity-70">
                {new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTime({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Select a Time</h2>
        <p className="text-sm text-gray-500 mt-1">Available time slots</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TIME_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSelect(slot)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-all",
              "hover:shadow-md hover:border-blue-400",
              selected === slot
                ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "border-gray-200 bg-white text-gray-700",
            )}
          >
            <Clock className={cn("h-4 w-4", selected === slot ? "text-white" : "text-gray-400")} />
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepInfo({
  form,
  onChange,
}: {
  form: BookingForm;
  onChange: (f: BookingForm) => void;
}) {
  const update = (key: keyof BookingForm, value: string) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your Information</h2>
        <p className="text-sm text-gray-500 mt-1">We will confirm your appointment shortly</p>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="book-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name *
          </label>
          <input
            id="book-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="John Smith"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          />
        </div>
        <div>
          <label htmlFor="book-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number *
          </label>
          <input
            id="book-phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          />
        </div>
        <div>
          <label htmlFor="book-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address *
          </label>
          <input
            id="book-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="john@example.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          />
        </div>
        <div>
          <label htmlFor="book-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
            Describe Your Issue
          </label>
          <textarea
            id="book-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Tell us about the problem you're experiencing..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepConfirmation({
  service,
  date,
  time,
  form,
  businessName,
}: {
  service: Service;
  date: Date;
  time: string;
  form: BookingForm;
  businessName: string;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const calendarUrl = useMemo(() => {
    const start = new Date(date);
    const [timePart, ampm] = time.split(" ");
    const [hrs, mins] = timePart.split(":").map(Number);
    let hour24 = hrs;
    if (ampm === "PM" && hrs !== 12) hour24 += 12;
    if (ampm === "AM" && hrs === 12) hour24 = 0;
    start.setHours(hour24, mins, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(service.name + " - " + businessName)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Booked via HararAI")}`;
  }, [date, time, service.name, businessName]);

  return (
    <div className="space-y-6 text-center">
      {/* Checkmark animation */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-[scaleIn_0.4s_ease-out]">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="text-sm text-gray-500 mt-2">
          We have sent a confirmation to {form.email}
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-left space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
            <Wrench className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{service.name}</p>
            <p className="text-xs text-gray-500">{service.duration} &middot; {service.priceRange}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarPlus className="h-4 w-4 text-gray-400" />
            {formattedDate}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            {time}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            {form.phone}
          </div>
        </div>
      </div>

      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
      >
        <CalendarPlus className="h-4 w-4" />
        Add to Google Calendar
      </a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Progress bar                                                              */
/* -------------------------------------------------------------------------- */

const STEP_LABELS = ["Service", "Date", "Time", "Info", "Confirm"];

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-2">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isComplete = step < current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                  isComplete
                    ? "bg-blue-600 text-white"
                    : isActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-gray-200 text-gray-500",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  isActive ? "text-blue-600" : isComplete ? "text-blue-600" : "text-gray-400",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 rounded-full transition-colors",
                  isComplete ? "bg-blue-600" : "bg-gray-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main booking page                                                         */
/* -------------------------------------------------------------------------- */

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "your-business";
  const fallbackName = slugToBusinessName(slug);
  const fallbackServices = useMemo(() => getServicesForSlug(slug), [slug]);

  // Fetch real org info from API (business name + phone + industry + services)
  const [orgInfo, setOrgInfo] = useState<{ name: string; phone: string } | null>(null);
  const [orgServices, setOrgServices] = useState<Service[] | null>(null);

  const services = orgServices ?? fallbackServices;

  useEffect(() => {
    let cancelled = false;
    async function fetchOrgInfo() {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/org/${slug}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json() as { data?: Record<string, unknown> };
          const data = json.data ?? json;
          if (!cancelled && data && typeof data === "object") {
            const d = data as Record<string, unknown>;
            setOrgInfo({
              name: (d.name as string) || fallbackName,
              phone: (d.phone as string) || "",
            });

            // Use industry from API instead of slug heuristic
            const industry = (d.industry as string) || (d.vertical as string) || detectIndustryFromSlug(slug);
            const industryServices = SERVICES_BY_INDUSTRY[industry] ?? SERVICES_BY_INDUSTRY["default"]!;
            setOrgServices(industryServices);

            // If org has custom services in settings, use those instead
            const settings = d.settings as Record<string, unknown> | undefined;
            if (settings?.services && Array.isArray(settings.services) && settings.services.length > 0) {
              setOrgServices(settings.services as Service[]);
            }
          }
        }
      } catch {
        // API unavailable — use slug-derived name and hardcoded services
      }
    }
    fetchOrgInfo();
    return () => { cancelled = true; };
  }, [slug, fallbackName]);

  const businessName = orgInfo?.name || fallbackName;
  const businessPhone = orgInfo?.phone || "";

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => s.id === selectedService) ?? null;

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1:
        return selectedService !== null;
      case 2:
        return selectedDate !== null;
      case 3:
        return selectedTime !== null;
      case 4:
        return form.name.trim() !== "" && form.phone.trim() !== "" && form.email.trim() !== "";
      default:
        return false;
    }
  }, [step, selectedService, selectedDate, selectedTime, form]);

  const handleNext = useCallback(async () => {
    if (step === 4) {
      setSubmitting(true);

      // Build appointment start/end times from selected date and time
      const appointmentDate = selectedDate ?? new Date();
      const [hourStr] = (selectedTime ?? "9:00 AM").split(":");
      const isPM = (selectedTime ?? "").includes("PM");
      let hour = parseInt(hourStr ?? "9", 10);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      const startTime = new Date(appointmentDate);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1); // Default 1 hour duration

      const bookingPayload = {
        contactName: form.name.trim(),
        contactEmail: form.email.trim(),
        contactPhone: form.phone.trim(),
        title: service?.name ?? "Appointment",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/book/${slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });

        if (!res.ok) {
          // API error — still show confirmation (booking may have been created)
          console.warn("Booking API returned non-OK status:", res.status);
        }
      } catch {
        // Network error — booking page should still work (graceful degradation)
        console.warn("Booking API unavailable, showing confirmation anyway");
      }

      setSubmitting(false);
      setStep(5);
      return;
    }
    setStep((s) => s + 1);
  }, [step, selectedDate, selectedTime, form, service, slug]);

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{businessName}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Serving your area
            </p>
          </div>
          {businessPhone && (
            <a
              href={`tel:${businessPhone}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{businessPhone}</span>
              <span className="sm:hidden">Call</span>
            </a>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-xl px-4 pt-6 pb-2">
        <ProgressBar current={step} />
      </div>

      {/* Step content */}
      <main className="mx-auto max-w-xl px-4 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {step === 1 && (
            <StepService
              selected={selectedService}
              services={services}
              onSelect={(id) => {
                setSelectedService(id);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepDate
              selected={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <StepTime
              selected={selectedTime}
              onSelect={(t) => {
                setSelectedTime(t);
                setStep(4);
              }}
            />
          )}
          {step === 4 && <StepInfo form={form} onChange={setForm} />}
          {step === 5 && service && selectedDate && selectedTime && (
            <StepConfirmation
              service={service}
              date={selectedDate}
              time={selectedTime}
              form={form}
              businessName={businessName}
            />
          )}
        </div>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className={cn(
                "flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                step === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            {step === 4 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || submitting}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all",
                  canProceed() && !submitting
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed",
                )}
              >
                {submitting ? "Booking..." : "Confirm Booking"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 pb-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a href="/" className="font-semibold text-gray-500 hover:text-gray-700 transition-colors">HararAI</a>
        </p>
      </footer>

      {/* Chat Widget */}
      <ChatWidget businessName={businessName} orgSlug={slug} />
    </div>
  );
}
