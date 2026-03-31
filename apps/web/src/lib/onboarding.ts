/**
 * Onboarding data management.
 * Stores wizard state in localStorage so the dashboard can read it
 * instead of showing hardcoded mock / "Jim's Plumbing" placeholders.
 */

import { env } from "./env";
import type { PricingMode, PricingUnit } from "@hararai/shared";
export type { PricingMode, PricingUnit } from "@hararai/shared";
export { PRICING_MODE_LABELS, PRICING_UNIT_LABELS, PRICING_UNIT_SUFFIX } from "@hararai/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingService {
  id: string;
  name: string;
  enabled: boolean;
  priceMin: number;
  priceMax: number;
  pricingMode: PricingMode;
  pricingUnit: PricingUnit;
  custom: boolean;
}

export interface BusinessHoursDay {
  open: boolean;
  start: string;
  end: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BusinessHours = Record<DayOfWeek, BusinessHoursDay>;

export type PhoneSetupMode = "managed" | "existing" | "skip";

export interface PhoneSetup {
  mode: PhoneSetupMode;
  /** HararAI provisioned number */
  country?: string;
  numberType?: string;
  selectedNumber?: string;
  /** Existing number the customer already has */
  existingNumber?: string;
}

export interface AiReceptionistConfig {
  greeting: string;
  transferWhen: {
    emergency: boolean;
    customerRequestsHuman: boolean;
    highValueQuote: boolean;
  };
  personalPhone: string;
}

export interface OnboardingData {
  /** Step 1 */
  businessName: string;
  industry: string;
  role: string;

  /** Step 2 */
  country: string;
  city: string;
  serviceArea: string;
  timezone: string;

  /** Step 3 */
  services: OnboardingService[];

  /** Step 4 */
  businessHours: BusinessHours;

  /** Step 5 — AI receptionist config */
  aiReceptionist: AiReceptionistConfig;

  /** Step 6 — Phone number */
  phoneSetup: PhoneSetup;

  /** Metadata */
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "hararai_onboarding";

export const INDUSTRIES = [
  { value: "rubbish_removals", label: "Rubbish Removals", icon: "Trash2" },
  { value: "moving_company", label: "Moving Company", icon: "Truck" },
  { value: "plumbing", label: "Plumbing", icon: "Wrench" },
  { value: "hvac", label: "HVAC", icon: "Flame" },
  { value: "electrical", label: "Electrical", icon: "Zap" },
  { value: "general_contractor", label: "General Contractor", icon: "Hammer" },
  { value: "cleaning", label: "Cleaning", icon: "Sparkles" },
  { value: "landscaping", label: "Landscaping", icon: "Trees" },
  { value: "auto_repair", label: "Auto Repair", icon: "Car" },
  { value: "salon_spa", label: "Salon / Spa", icon: "Scissors" },
  { value: "dental", label: "Dental", icon: "Heart" },
  { value: "other", label: "Other", icon: "Building2" },
] as const;

export const INDUSTRY_SERVICES: Record<string, Omit<OnboardingService, "enabled" | "custom">[]> = {
  rubbish_removals: [
    { id: "single-item", name: "Single Item Pickup", priceMin: 50, priceMax: 120, pricingMode: "range", pricingUnit: "unit" },
    { id: "partial-load", name: "Partial Load", priceMin: 150, priceMax: 300, pricingMode: "range", pricingUnit: "unit" },
    { id: "full-load", name: "Full Load", priceMin: 300, priceMax: 600, pricingMode: "range", pricingUnit: "unit" },
    { id: "skip-bin", name: "Skip Bin Hire", priceMin: 250, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "green-waste", name: "Green Waste", priceMin: 100, priceMax: 250, pricingMode: "range", pricingUnit: "unit" },
    { id: "hard-rubbish", name: "Hard Rubbish", priceMin: 120, priceMax: 350, pricingMode: "range", pricingUnit: "unit" },
    { id: "commercial-waste", name: "Commercial Waste", priceMin: 300, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
  ],
  moving_company: [
    { id: "studio-1br", name: "Studio / 1BR Move", priceMin: 300, priceMax: 600, pricingMode: "range", pricingUnit: "job" },
    { id: "2-3br", name: "2-3BR Move", priceMin: 500, priceMax: 1200, pricingMode: "range", pricingUnit: "job" },
    { id: "4br-plus", name: "4BR+ Move", priceMin: 1000, priceMax: 2500, pricingMode: "range", pricingUnit: "job" },
    { id: "packing", name: "Packing Service", priceMin: 200, priceMax: 600, pricingMode: "range", pricingUnit: "job" },
    { id: "piano", name: "Piano Moving", priceMin: 300, priceMax: 800, pricingMode: "range", pricingUnit: "job" },
    { id: "office", name: "Office Move", priceMin: 800, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
  ],
  plumbing: [
    { id: "drain-cleaning", name: "Drain Cleaning", priceMin: 150, priceMax: 250, pricingMode: "range", pricingUnit: "job" },
    { id: "water-heater", name: "Water Heater Install", priceMin: 1500, priceMax: 3000, pricingMode: "range", pricingUnit: "job" },
    { id: "pipe-repair", name: "Pipe Repair", priceMin: 200, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "bathroom-reno", name: "Bathroom Renovation", priceMin: 5000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "leak-detection", name: "Leak Detection", priceMin: 100, priceMax: 300, pricingMode: "range", pricingUnit: "job" },
    { id: "toilet-repair", name: "Toilet Repair", priceMin: 100, priceMax: 250, pricingMode: "range", pricingUnit: "job" },
    { id: "faucet-install", name: "Faucet Installation", priceMin: 150, priceMax: 350, pricingMode: "range", pricingUnit: "job" },
  ],
  hvac: [
    { id: "ac-install", name: "AC Installation", priceMin: 3000, priceMax: 7000, pricingMode: "range", pricingUnit: "job" },
    { id: "ac-repair", name: "AC Repair", priceMin: 150, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "ac-tuneup", name: "AC Tune-Up", priceMin: 80, priceMax: 150, pricingMode: "fixed", pricingUnit: "job" },
    { id: "furnace-install", name: "Furnace Installation", priceMin: 3000, priceMax: 6000, pricingMode: "range", pricingUnit: "job" },
    { id: "furnace-repair", name: "Furnace Repair", priceMin: 150, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "duct-cleaning", name: "Duct Cleaning", priceMin: 300, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "thermostat", name: "Thermostat Install", priceMin: 100, priceMax: 300, pricingMode: "range", pricingUnit: "job" },
  ],
  electrical: [
    { id: "panel-upgrade", name: "Panel Upgrade", priceMin: 1500, priceMax: 3000, pricingMode: "range", pricingUnit: "job" },
    { id: "outlet-install", name: "Outlet Installation", priceMin: 100, priceMax: 250, pricingMode: "range", pricingUnit: "job" },
    { id: "wiring", name: "Rewiring", priceMin: 2000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "lighting", name: "Lighting Install", priceMin: 100, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "ev-charger", name: "EV Charger Install", priceMin: 500, priceMax: 2000, pricingMode: "range", pricingUnit: "job" },
    { id: "ceiling-fan", name: "Ceiling Fan Install", priceMin: 150, priceMax: 350, pricingMode: "range", pricingUnit: "job" },
  ],
  cleaning: [
    { id: "standard-clean", name: "Standard Clean", priceMin: 100, priceMax: 200, pricingMode: "range", pricingUnit: "visit" },
    { id: "deep-clean", name: "Deep Clean", priceMin: 200, priceMax: 400, pricingMode: "range", pricingUnit: "visit" },
    { id: "move-in-out", name: "Move In/Out Clean", priceMin: 250, priceMax: 500, pricingMode: "range", pricingUnit: "job" },
    { id: "carpet-clean", name: "Carpet Cleaning", priceMin: 3, priceMax: 5, pricingMode: "range", pricingUnit: "sqm" },
    { id: "window-clean", name: "Window Cleaning", priceMin: 100, priceMax: 250, pricingMode: "range", pricingUnit: "visit" },
    { id: "office-clean", name: "Office Cleaning", priceMin: 150, priceMax: 400, pricingMode: "range", pricingUnit: "visit" },
  ],
  landscaping: [
    { id: "lawn-mowing", name: "Lawn Mowing", priceMin: 50, priceMax: 150, pricingMode: "range", pricingUnit: "visit" },
    { id: "garden-design", name: "Garden Design", priceMin: 500, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "tree-trimming", name: "Tree Trimming", priceMin: 200, priceMax: 800, pricingMode: "range", pricingUnit: "job" },
    { id: "irrigation", name: "Irrigation Install", priceMin: 500, priceMax: 2000, pricingMode: "range", pricingUnit: "job" },
    { id: "hardscaping", name: "Hardscaping", priceMin: 1000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "mulching", name: "Mulching", priceMin: 100, priceMax: 300, pricingMode: "range", pricingUnit: "visit" },
  ],
  general_contractor: [
    { id: "kitchen-reno", name: "Kitchen Renovation", priceMin: 10000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "bathroom-reno", name: "Bathroom Renovation", priceMin: 5000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "deck-build", name: "Deck Building", priceMin: 3000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "room-addition", name: "Room Addition", priceMin: 20000, priceMax: 0, pricingMode: "from", pricingUnit: "job" },
    { id: "drywall", name: "Drywall Repair", priceMin: 200, priceMax: 800, pricingMode: "range", pricingUnit: "job" },
    { id: "painting", name: "Interior Painting", priceMin: 15, priceMax: 35, pricingMode: "range", pricingUnit: "sqm" },
  ],
  auto_repair: [
    { id: "oil-change", name: "Oil Change", priceMin: 50, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "brake-service", name: "Brake Service", priceMin: 150, priceMax: 400, pricingMode: "range", pricingUnit: "job" },
    { id: "tire-rotation", name: "Tire Rotation", priceMin: 40, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "engine-diag", name: "Engine Diagnostics", priceMin: 100, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "transmission", name: "Transmission Service", priceMin: 500, priceMax: 2000, pricingMode: "range", pricingUnit: "job" },
    { id: "ac-recharge", name: "AC Recharge", priceMin: 150, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
  ],
  salon_spa: [
    { id: "haircut", name: "Haircut & Style", priceMin: 45, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "color", name: "Hair Color", priceMin: 80, priceMax: 200, pricingMode: "range", pricingUnit: "job" },
    { id: "manicure", name: "Manicure", priceMin: 35, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "pedicure", name: "Pedicure", priceMin: 45, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "facial", name: "Facial Treatment", priceMin: 80, priceMax: 150, pricingMode: "range", pricingUnit: "job" },
    { id: "massage", name: "Massage", priceMin: 80, priceMax: 0, pricingMode: "fixed", pricingUnit: "hour" },
  ],
  dental: [
    { id: "cleaning", name: "Dental Cleaning", priceMin: 150, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "filling", name: "Dental Filling", priceMin: 150, priceMax: 400, pricingMode: "range", pricingUnit: "job" },
    { id: "crown", name: "Crown", priceMin: 800, priceMax: 1500, pricingMode: "range", pricingUnit: "job" },
    { id: "root-canal", name: "Root Canal", priceMin: 700, priceMax: 1400, pricingMode: "range", pricingUnit: "job" },
    { id: "whitening", name: "Teeth Whitening", priceMin: 300, priceMax: 0, pricingMode: "fixed", pricingUnit: "job" },
    { id: "extraction", name: "Tooth Extraction", priceMin: 100, priceMax: 300, pricingMode: "range", pricingUnit: "job" },
  ],
  other: [
    { id: "consultation", name: "Consultation", priceMin: 50, priceMax: 150, pricingMode: "range", pricingUnit: "hour" },
    { id: "service-call", name: "Service Call", priceMin: 80, priceMax: 200, pricingMode: "range", pricingUnit: "job" },
    { id: "maintenance", name: "Maintenance", priceMin: 100, priceMax: 300, pricingMode: "range", pricingUnit: "visit" },
  ],
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: true, start: "08:00", end: "17:00" },
  tuesday: { open: true, start: "08:00", end: "17:00" },
  wednesday: { open: true, start: "08:00", end: "17:00" },
  thursday: { open: true, start: "08:00", end: "17:00" },
  friday: { open: true, start: "08:00", end: "17:00" },
  saturday: { open: true, start: "09:00", end: "13:00" },
  sunday: { open: false, start: "09:00", end: "17:00" },
};

export const COUNTRIES = [
  { value: "AU", label: "Australia", flag: "\uD83C\uDDE6\uD83C\uDDFA" },
  { value: "US", label: "United States", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { value: "GB", label: "United Kingdom", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { value: "CA", label: "Canada", flag: "\uD83C\uDDE8\uD83C\uDDE6" },
  { value: "NZ", label: "New Zealand", flag: "\uD83C\uDDF3\uD83C\uDDFF" },
  { value: "IE", label: "Ireland", flag: "\uD83C\uDDEE\uD83C\uDDEA" },
  { value: "ZA", label: "South Africa", flag: "\uD83C\uDDFF\uD83C\uDDE6" },
  { value: "IN", label: "India", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { value: "SG", label: "Singapore", flag: "\uD83C\uDDF8\uD83C\uDDEC" },
  { value: "AE", label: "UAE", flag: "\uD83C\uDDE6\uD83C\uDDEA" },
] as const;

export const TIMEZONES = [
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Vancouver", label: "Vancouver (PST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Dublin", label: "Dublin (GMT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve saved onboarding data or null. */
export function getOnboardingData(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

/** Check whether the user has finished onboarding. */
export function isOnboardingComplete(): boolean {
  const data = getOnboardingData();
  return data !== null && Boolean(data.completedAt);
}

/** Persist onboarding data to localStorage and API. */
export function saveOnboardingData(data: OnboardingData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Also persist to API so data survives device switches
  persistOnboardingToApi(data).catch(() => {
    // Silently fail — localStorage is the primary store during onboarding,
    // and the final "complete" call will retry API persistence.
  });
}

/** Fire-and-forget POST of onboarding data to the API. */
async function persistOnboardingToApi(data: OnboardingData): Promise<void> {
  const API_BASE = env.NEXT_PUBLIC_API_URL;
  const token = localStorage.getItem("hararai_token");
  if (!token || !API_BASE) return;

  // Decode orgId from token
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { orgId?: string };
    if (!payload.orgId) return;

    await fetch(`${API_BASE}/orgs/${payload.orgId}/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch {
    // API unavailable — data is still safe in localStorage
  }
}

/**
 * Try to load onboarding data from the API if localStorage is empty.
 * This handles the case where a user switches devices.
 */
export async function loadOnboardingFromApi(orgId: string): Promise<OnboardingData | null> {
  if (typeof window === "undefined") return null;
  // If we already have local data, use it
  const local = getOnboardingData();
  if (local) return local;

  // Try API
  try {
    const API_BASE = env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("hararai_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/orgs/${orgId}/settings`, { headers });
    if (res.ok) {
      const json = await res.json() as { data?: { onboarding?: OnboardingData } };
      const onboarding = json?.data?.onboarding;
      if (onboarding && onboarding.completedAt) {
        // Cache locally for future use
        saveOnboardingData(onboarding);
        return onboarding;
      }
    }
  } catch {
    // API unavailable
  }
  return null;
}

/** Clear onboarding data (for dev/testing). */
export function clearOnboardingData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Try to auto-detect the user's IANA timezone. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

/** Build initial services list from an industry. */
export function getServicesForIndustry(industry: string): OnboardingService[] {
  const defs = INDUSTRY_SERVICES[industry] ?? INDUSTRY_SERVICES["other"] ?? [];
  return defs.map((s) => ({ ...s, enabled: true, custom: false }));
}

/** Generate a URL-safe slug from a business name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
