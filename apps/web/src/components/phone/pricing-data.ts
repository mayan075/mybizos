/* -------------------------------------------------------------------------- */
/*  Shared Types for Phone Settings                                           */
/* -------------------------------------------------------------------------- */

export type RoutingMode = "ai-first" | "ring-first" | "forward";
export type PhoneModel = "mybizos" | "byo-twilio";
export type NumberType = "local" | "mobile" | "toll-free";

export interface PhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  smsEnabled: boolean;
  voiceEnabled: boolean;
}

export interface BusinessHoursDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export type TransferReason =
  | "caller-requests"
  | "emergency"
  | "misunderstanding"
  | "high-quote"
  | "always-after-qualifying";

export interface PhoneSystemStatus {
  connected: boolean;
  provider?: "mybizos" | "byo-twilio" | null;
  accountName?: string | null;
  numberCount?: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Twilio Pricing Data (Real prices as of March 2026)                         */
/* -------------------------------------------------------------------------- */

export interface CountryPricing {
  code: string;
  flag: string;
  name: string;
  numberTypes: {
    type: NumberType;
    label: string;
    monthlyPrice: number;
    available: boolean;
  }[];
}

export const TWILIO_PRICING: CountryPricing[] = [
  {
    code: "AU",
    flag: "\u{1F1E6}\u{1F1FA}",
    name: "Australia",
    numberTypes: [
      { type: "local", label: "Local", monthlyPrice: 3.0, available: true },
      { type: "mobile", label: "Mobile", monthlyPrice: 6.5, available: true },
      { type: "toll-free", label: "Toll-Free", monthlyPrice: 16.0, available: true },
    ],
  },
  {
    code: "US",
    flag: "\u{1F1FA}\u{1F1F8}",
    name: "United States",
    numberTypes: [
      { type: "local", label: "Local", monthlyPrice: 1.15, available: true },
      { type: "mobile", label: "Mobile", monthlyPrice: 1.15, available: true },
      { type: "toll-free", label: "Toll-Free", monthlyPrice: 2.15, available: true },
    ],
  },
  {
    code: "GB",
    flag: "\u{1F1EC}\u{1F1E7}",
    name: "United Kingdom",
    numberTypes: [
      { type: "local", label: "Local", monthlyPrice: 1.0, available: true },
      { type: "mobile", label: "Mobile", monthlyPrice: 1.0, available: true },
      { type: "toll-free", label: "Toll-Free", monthlyPrice: 2.0, available: true },
    ],
  },
  {
    code: "CA",
    flag: "\u{1F1E8}\u{1F1E6}",
    name: "Canada",
    numberTypes: [
      { type: "local", label: "Local", monthlyPrice: 1.0, available: true },
      { type: "mobile", label: "Mobile", monthlyPrice: 1.0, available: true },
      { type: "toll-free", label: "Toll-Free", monthlyPrice: 2.15, available: true },
    ],
  },
  {
    code: "NZ",
    flag: "\u{1F1F3}\u{1F1FF}",
    name: "New Zealand",
    numberTypes: [
      { type: "local", label: "Local", monthlyPrice: 3.0, available: true },
      { type: "mobile", label: "Mobile", monthlyPrice: 6.0, available: true },
      { type: "toll-free", label: "Toll-Free", monthlyPrice: 12.0, available: true },
    ],
  },
];

export const TWILIO_PRICING_URL = "https://www.twilio.com/en-us/voice/pricing";

export const PRICING_DISCLAIMER =
  "Prices from Twilio as of March 2026. Actual prices may vary.";

/* -------------------------------------------------------------------------- */
/*  Mock Data (used when API is not available)                                  */
/* -------------------------------------------------------------------------- */

export const MOCK_NUMBERS: PhoneNumber[] = [
  {
    sid: "PN-demo-001",
    phoneNumber: "+61291234567",
    friendlyName: "Main Business Line",
    smsEnabled: true,
    voiceEnabled: true,
  },
  {
    sid: "PN-demo-002",
    phoneNumber: "+61291234568",
    friendlyName: "Marketing / Google Ads",
    smsEnabled: true,
    voiceEnabled: true,
  },
];

export const DEFAULT_BUSINESS_HOURS: BusinessHoursDay[] = [
  { day: "Monday", enabled: true, start: "08:00", end: "18:00" },
  { day: "Tuesday", enabled: true, start: "08:00", end: "18:00" },
  { day: "Wednesday", enabled: true, start: "08:00", end: "18:00" },
  { day: "Thursday", enabled: true, start: "08:00", end: "18:00" },
  { day: "Friday", enabled: true, start: "08:00", end: "18:00" },
  { day: "Saturday", enabled: true, start: "09:00", end: "14:00" },
  { day: "Sunday", enabled: false, start: "09:00", end: "14:00" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");

  if (cleaned.startsWith("+61") && cleaned.length === 12) {
    const local = cleaned.slice(3);
    return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
  }

  if (cleaned.startsWith("+614") && cleaned.length === 12) {
    const local = cleaned.slice(3);
    return `+61 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    const digits = cleaned.slice(2);
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (cleaned.startsWith("+44") && cleaned.length >= 13) {
    const local = cleaned.slice(3);
    return `+44 ${local.slice(0, 4)} ${local.slice(4)}`;
  }

  if (cleaned.startsWith("+")) {
    const match = cleaned.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      const [, cc, rest] = match;
      const chunks = rest.match(/.{1,4}/g) ?? [rest];
      return `${cc} ${chunks.join(" ")}`;
    }
  }

  return phone;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
