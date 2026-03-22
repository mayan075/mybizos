/**
 * Onboarding data management.
 * Stores wizard state in localStorage so the dashboard can read it
 * instead of showing hardcoded mock / "Jim's Plumbing" placeholders.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingService {
  id: string;
  name: string;
  enabled: boolean;
  priceMin: number;
  priceMax: number;
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

export type PhoneSetupMode = "mybizos" | "twilio" | "skip";

export interface PhoneSetup {
  mode: PhoneSetupMode;
  /** MyBizOS number fields */
  country?: string;
  numberType?: string;
  /** Twilio fields */
  twilioSid?: string;
  twilioToken?: string;
}

export interface OnboardingData {
  /** Step 1 */
  businessName: string;
  vertical: string;
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

  /** Step 5 */
  phoneSetup: PhoneSetup;

  /** Metadata */
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mybizos_onboarding";

export const VERTICALS = [
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

export const VERTICAL_SERVICES: Record<string, Omit<OnboardingService, "enabled" | "custom">[]> = {
  rubbish_removals: [
    { id: "single-item", name: "Single Item Pickup", priceMin: 50, priceMax: 120 },
    { id: "partial-load", name: "Partial Load", priceMin: 150, priceMax: 300 },
    { id: "full-load", name: "Full Load", priceMin: 300, priceMax: 600 },
    { id: "skip-bin", name: "Skip Bin Hire", priceMin: 250, priceMax: 500 },
    { id: "green-waste", name: "Green Waste", priceMin: 100, priceMax: 250 },
    { id: "hard-rubbish", name: "Hard Rubbish", priceMin: 120, priceMax: 350 },
    { id: "commercial-waste", name: "Commercial Waste", priceMin: 300, priceMax: 800 },
  ],
  moving_company: [
    { id: "studio-1br", name: "Studio / 1BR Move", priceMin: 300, priceMax: 600 },
    { id: "2-3br", name: "2-3BR Move", priceMin: 500, priceMax: 1200 },
    { id: "4br-plus", name: "4BR+ Move", priceMin: 1000, priceMax: 2500 },
    { id: "packing", name: "Packing Service", priceMin: 200, priceMax: 600 },
    { id: "piano", name: "Piano Moving", priceMin: 300, priceMax: 800 },
    { id: "office", name: "Office Move", priceMin: 800, priceMax: 3000 },
  ],
  plumbing: [
    { id: "drain-cleaning", name: "Drain Cleaning", priceMin: 150, priceMax: 250 },
    { id: "water-heater", name: "Water Heater Install", priceMin: 1500, priceMax: 3000 },
    { id: "pipe-repair", name: "Pipe Repair", priceMin: 200, priceMax: 500 },
    { id: "bathroom-reno", name: "Bathroom Renovation", priceMin: 5000, priceMax: 15000 },
    { id: "leak-detection", name: "Leak Detection", priceMin: 100, priceMax: 300 },
    { id: "toilet-repair", name: "Toilet Repair", priceMin: 100, priceMax: 250 },
    { id: "faucet-install", name: "Faucet Installation", priceMin: 150, priceMax: 350 },
  ],
  hvac: [
    { id: "ac-install", name: "AC Installation", priceMin: 3000, priceMax: 7000 },
    { id: "ac-repair", name: "AC Repair", priceMin: 150, priceMax: 500 },
    { id: "ac-tuneup", name: "AC Tune-Up", priceMin: 80, priceMax: 150 },
    { id: "furnace-install", name: "Furnace Installation", priceMin: 3000, priceMax: 6000 },
    { id: "furnace-repair", name: "Furnace Repair", priceMin: 150, priceMax: 500 },
    { id: "duct-cleaning", name: "Duct Cleaning", priceMin: 300, priceMax: 500 },
    { id: "thermostat", name: "Thermostat Install", priceMin: 100, priceMax: 300 },
  ],
  electrical: [
    { id: "panel-upgrade", name: "Panel Upgrade", priceMin: 1500, priceMax: 3000 },
    { id: "outlet-install", name: "Outlet Installation", priceMin: 100, priceMax: 250 },
    { id: "wiring", name: "Rewiring", priceMin: 2000, priceMax: 8000 },
    { id: "lighting", name: "Lighting Install", priceMin: 100, priceMax: 500 },
    { id: "ev-charger", name: "EV Charger Install", priceMin: 500, priceMax: 2000 },
    { id: "ceiling-fan", name: "Ceiling Fan Install", priceMin: 150, priceMax: 350 },
  ],
  cleaning: [
    { id: "standard-clean", name: "Standard Clean", priceMin: 100, priceMax: 200 },
    { id: "deep-clean", name: "Deep Clean", priceMin: 200, priceMax: 400 },
    { id: "move-in-out", name: "Move In/Out Clean", priceMin: 250, priceMax: 500 },
    { id: "carpet-clean", name: "Carpet Cleaning", priceMin: 100, priceMax: 300 },
    { id: "window-clean", name: "Window Cleaning", priceMin: 100, priceMax: 250 },
    { id: "office-clean", name: "Office Cleaning", priceMin: 150, priceMax: 400 },
  ],
  landscaping: [
    { id: "lawn-mowing", name: "Lawn Mowing", priceMin: 50, priceMax: 150 },
    { id: "garden-design", name: "Garden Design", priceMin: 500, priceMax: 3000 },
    { id: "tree-trimming", name: "Tree Trimming", priceMin: 200, priceMax: 800 },
    { id: "irrigation", name: "Irrigation Install", priceMin: 500, priceMax: 2000 },
    { id: "hardscaping", name: "Hardscaping", priceMin: 1000, priceMax: 5000 },
    { id: "mulching", name: "Mulching", priceMin: 100, priceMax: 300 },
  ],
  general_contractor: [
    { id: "kitchen-reno", name: "Kitchen Renovation", priceMin: 10000, priceMax: 50000 },
    { id: "bathroom-reno", name: "Bathroom Renovation", priceMin: 5000, priceMax: 25000 },
    { id: "deck-build", name: "Deck Building", priceMin: 3000, priceMax: 15000 },
    { id: "room-addition", name: "Room Addition", priceMin: 20000, priceMax: 80000 },
    { id: "drywall", name: "Drywall Repair", priceMin: 200, priceMax: 800 },
    { id: "painting", name: "Interior Painting", priceMin: 500, priceMax: 3000 },
  ],
  auto_repair: [
    { id: "oil-change", name: "Oil Change", priceMin: 30, priceMax: 80 },
    { id: "brake-service", name: "Brake Service", priceMin: 150, priceMax: 400 },
    { id: "tire-rotation", name: "Tire Rotation", priceMin: 30, priceMax: 60 },
    { id: "engine-diag", name: "Engine Diagnostics", priceMin: 80, priceMax: 150 },
    { id: "transmission", name: "Transmission Service", priceMin: 500, priceMax: 2000 },
    { id: "ac-recharge", name: "AC Recharge", priceMin: 100, priceMax: 250 },
  ],
  salon_spa: [
    { id: "haircut", name: "Haircut & Style", priceMin: 30, priceMax: 80 },
    { id: "color", name: "Hair Color", priceMin: 80, priceMax: 200 },
    { id: "manicure", name: "Manicure", priceMin: 25, priceMax: 60 },
    { id: "pedicure", name: "Pedicure", priceMin: 35, priceMax: 70 },
    { id: "facial", name: "Facial Treatment", priceMin: 60, priceMax: 150 },
    { id: "massage", name: "Massage", priceMin: 60, priceMax: 150 },
  ],
  dental: [
    { id: "cleaning", name: "Dental Cleaning", priceMin: 100, priceMax: 250 },
    { id: "filling", name: "Dental Filling", priceMin: 150, priceMax: 400 },
    { id: "crown", name: "Crown", priceMin: 800, priceMax: 1500 },
    { id: "root-canal", name: "Root Canal", priceMin: 700, priceMax: 1400 },
    { id: "whitening", name: "Teeth Whitening", priceMin: 200, priceMax: 500 },
    { id: "extraction", name: "Tooth Extraction", priceMin: 100, priceMax: 300 },
  ],
  other: [
    { id: "consultation", name: "Consultation", priceMin: 50, priceMax: 150 },
    { id: "service-call", name: "Service Call", priceMin: 80, priceMax: 200 },
    { id: "maintenance", name: "Maintenance", priceMin: 100, priceMax: 300 },
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

/** Persist onboarding data to localStorage. */
export function saveOnboardingData(data: OnboardingData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

/** Build initial services list from a vertical. */
export function getServicesForVertical(vertical: string): OnboardingService[] {
  const defs = VERTICAL_SERVICES[vertical] ?? VERTICAL_SERVICES["other"] ?? [];
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
