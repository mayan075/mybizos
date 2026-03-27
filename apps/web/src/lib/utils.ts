import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Map a country code to its currency code.
 * Falls back to "USD" for unknown countries.
 */
export function getCurrencyForCountry(countryCode: string): string {
  const map: Record<string, string> = {
    AU: "AUD",
    US: "USD",
    GB: "GBP",
    CA: "CAD",
    NZ: "NZD",
    IE: "EUR",
    ZA: "ZAR",
    IN: "INR",
    SG: "SGD",
    AE: "AED",
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
  };
  return map[countryCode?.toUpperCase()] ?? "USD";
}

/**
 * Map a country code to the locale for formatting.
 */
function getLocaleForCountry(countryCode: string): string {
  const map: Record<string, string> = {
    AU: "en-AU",
    US: "en-US",
    GB: "en-GB",
    CA: "en-CA",
    NZ: "en-NZ",
    IE: "en-IE",
    ZA: "en-ZA",
    IN: "en-IN",
    SG: "en-SG",
    AE: "ar-AE",
  };
  return map[countryCode?.toUpperCase()] ?? "en-US";
}

/**
 * Get the user's country from onboarding data.
 * Falls back to "US" if not set.
 */
export function getUserCountry(): string {
  if (typeof window === "undefined") return "US";
  try {
    const raw = localStorage.getItem("mybizos_onboarding");
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.country) return data.country;
    }
  } catch {
    // ignore
  }
  return "US";
}

/**
 * Format a number as currency.
 *
 * Accepts either the legacy country-override string or an options object:
 *   - `currency`  — use an explicit ISO 4217 code (AUD, USD, GBP …)
 *   - `country`   — derive currency from country code (legacy behaviour)
 *
 * Falls back to the user's onboarding country → "USD".
 */
export function formatCurrency(
  amount: number,
  options?: string | { currency?: string; country?: string },
): string {
  let currencyCode: string;
  let locale: string;

  if (typeof options === "string") {
    // Legacy usage: formatCurrency(amount, "AU")
    currencyCode = getCurrencyForCountry(options);
    locale = getLocaleForCountry(options);
  } else if (options?.currency) {
    // Direct currency code supplied — pick a sensible locale
    currencyCode = options.currency;
    const country = options.country ?? getUserCountry();
    locale = getLocaleForCountry(country);
  } else {
    const country = options?.country ?? getUserCountry();
    currencyCode = getCurrencyForCountry(country);
    locale = getLocaleForCountry(country);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
