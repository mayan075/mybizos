/**
 * Phone number formatting, country detection, and validation utilities.
 *
 * Supports international numbers with smart auto-detection based on digits typed.
 * Used by both the main calls page dialer and the floating dialer.
 */

/* -------------------------------------------------------------------------- */
/*  Country Definitions                                                       */
/* -------------------------------------------------------------------------- */

export interface CountryInfo {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

/**
 * Countries we recognise, ordered by specificity (longer dial codes first
 * so that e.g. +61 matches before +6).
 */
const COUNTRIES: CountryInfo[] = [
  { code: "AU", dialCode: "61", flag: "\u{1F1E6}\u{1F1FA}", name: "Australia" },
  { code: "NZ", dialCode: "64", flag: "\u{1F1F3}\u{1F1FF}", name: "New Zealand" },
  { code: "US", dialCode: "1", flag: "\u{1F1FA}\u{1F1F8}", name: "United States" },
  { code: "CA", dialCode: "1", flag: "\u{1F1E8}\u{1F1E6}", name: "Canada" },
  { code: "GB", dialCode: "44", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom" },
  { code: "IE", dialCode: "353", flag: "\u{1F1EE}\u{1F1EA}", name: "Ireland" },
  { code: "IN", dialCode: "91", flag: "\u{1F1EE}\u{1F1F3}", name: "India" },
  { code: "SG", dialCode: "65", flag: "\u{1F1F8}\u{1F1EC}", name: "Singapore" },
  { code: "PH", dialCode: "63", flag: "\u{1F1F5}\u{1F1ED}", name: "Philippines" },
  { code: "DE", dialCode: "49", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany" },
  { code: "FR", dialCode: "33", flag: "\u{1F1EB}\u{1F1F7}", name: "France" },
  { code: "JP", dialCode: "81", flag: "\u{1F1EF}\u{1F1F5}", name: "Japan" },
  { code: "CN", dialCode: "86", flag: "\u{1F1E8}\u{1F1F3}", name: "China" },
  { code: "BR", dialCode: "55", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil" },
  { code: "ZA", dialCode: "27", flag: "\u{1F1FF}\u{1F1E6}", name: "South Africa" },
  { code: "AE", dialCode: "971", flag: "\u{1F1E6}\u{1F1EA}", name: "UAE" },
  { code: "MX", dialCode: "52", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico" },
  { code: "IT", dialCode: "39", flag: "\u{1F1EE}\u{1F1F9}", name: "Italy" },
  { code: "ES", dialCode: "34", flag: "\u{1F1EA}\u{1F1F8}", name: "Spain" },
  { code: "KR", dialCode: "82", flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea" },
  { code: "ID", dialCode: "62", flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesia" },
];

const UNKNOWN_COUNTRY: CountryInfo = {
  code: "INTL",
  dialCode: "",
  flag: "\u{1F30D}",
  name: "International",
};

/* -------------------------------------------------------------------------- */
/*  Strip raw input to digits only                                            */
/* -------------------------------------------------------------------------- */

/** Remove everything except digits from a string. */
export function stripToDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/* -------------------------------------------------------------------------- */
/*  Detect country from raw digits                                            */
/* -------------------------------------------------------------------------- */

/**
 * Detect the country based on the raw digit string the user has typed.
 *
 * Handles both:
 * - Local-format shortcuts (04... = AU mobile, 02/03/07/08 = AU landline, etc.)
 * - E.164 / international format (digits starting with a country code)
 */
export function detectCountry(digits: string): CountryInfo {
  if (digits.length === 0) return UNKNOWN_COUNTRY;

  // --- Australian local shortcuts ---
  if (digits.startsWith("04") || digits.startsWith("05")) {
    return COUNTRIES.find((c) => c.code === "AU")!;
  }
  if (
    digits.startsWith("02") ||
    digits.startsWith("03") ||
    digits.startsWith("07") ||
    digits.startsWith("08")
  ) {
    return COUNTRIES.find((c) => c.code === "AU")!;
  }

  // --- International: match longest dial code first ---
  // Sort by dial-code length descending so 353 matches before 3.
  const sorted = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  for (const country of sorted) {
    if (digits.startsWith(country.dialCode)) {
      return country;
    }
  }

  return UNKNOWN_COUNTRY;
}

/* -------------------------------------------------------------------------- */
/*  Format phone number for display                                           */
/* -------------------------------------------------------------------------- */

/**
 * Australian mobile:  04XX XXX XXX  (local)  or  +61 4XX XXX XXX
 * Australian landline: 02 XXXX XXXX (local) or  +61 2 XXXX XXXX
 * US/CA:              +1 (XXX) XXX-XXXX
 * UK:                 +44 XXXX XXXXXX
 * Generic:            +CC XXXXXXXXX
 */
export function formatPhoneNumber(digits: string): string {
  if (digits.length === 0) return "";

  const country = detectCountry(digits);

  // --- Australian local-format shortcuts ---
  if (country.code === "AU" && digits.startsWith("0")) {
    // Mobile: 04XX XXX XXX
    if (digits.startsWith("04") || digits.startsWith("05")) {
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    }
    // Landline: 0X XXXX XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  }

  // --- International format (starts with country code digits) ---
  const dc = country.dialCode;

  if (country.code === "AU") {
    // +61 4XX XXX XXX (mobile) or +61 2 XXXX XXXX (landline)
    const national = digits.slice(dc.length);
    if (national.startsWith("4") || national.startsWith("5")) {
      // mobile
      if (national.length <= 3) return `+${dc} ${national}`;
      if (national.length <= 6)
        return `+${dc} ${national.slice(0, 3)} ${national.slice(3)}`;
      return `+${dc} ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 9)}`;
    }
    // landline
    if (national.length <= 1) return `+${dc} ${national}`;
    if (national.length <= 5)
      return `+${dc} ${national.slice(0, 1)} ${national.slice(1)}`;
    return `+${dc} ${national.slice(0, 1)} ${national.slice(1, 5)} ${national.slice(5, 9)}`;
  }

  if (country.code === "US" || country.code === "CA") {
    const national = digits.slice(dc.length);
    if (national.length === 0) return `+${dc}`;
    if (national.length <= 3) return `+${dc} (${national}`;
    if (national.length <= 6)
      return `+${dc} (${national.slice(0, 3)}) ${national.slice(3)}`;
    return `+${dc} (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
  }

  if (country.code === "GB") {
    const national = digits.slice(dc.length);
    if (national.length <= 4) return `+${dc} ${national}`;
    return `+${dc} ${national.slice(0, 4)} ${national.slice(4, 10)}`;
  }

  // --- Generic international fallback ---
  if (dc.length > 0) {
    const national = digits.slice(dc.length);
    if (national.length === 0) return `+${dc}`;
    return `+${dc} ${national}`;
  }

  // If we couldn't detect anything, just show + prefix
  return `+${digits}`;
}

/* -------------------------------------------------------------------------- */
/*  Convert to E.164                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Convert raw digits to E.164 format: +CCNNNNNNNNN
 *
 * Handles local Australian shortcuts (04... -> +614...).
 */
export function toE164(digits: string): string {
  if (digits.length === 0) return "";

  const country = detectCountry(digits);

  // Australian local -> international
  if (country.code === "AU" && digits.startsWith("0")) {
    return `+61${digits.slice(1)}`;
  }

  // Already has country code
  return `+${digits}`;
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Validates whether the digits look like a plausible phone number.
 * Not a full ITU validation — just enough to enable/disable the Call button.
 */
export function isValidNumber(digits: string): boolean {
  if (digits.length === 0) return false;

  const country = detectCountry(digits);

  // Australian local mobile: 04XX XXX XXX = 10 digits
  if (country.code === "AU" && digits.startsWith("0")) {
    if (digits.startsWith("04") || digits.startsWith("05")) return digits.length === 10;
    // landline 0X XXXX XXXX = 10 digits
    return digits.length === 10;
  }

  // AU international: 61 + 9 digits = 11
  if (country.code === "AU" && digits.startsWith("61")) {
    return digits.length === 11;
  }

  // US/CA: 1 + 10 digits = 11
  if ((country.code === "US" || country.code === "CA") && digits.startsWith("1")) {
    return digits.length === 11;
  }

  // UK: 44 + 10 digits = 12
  if (country.code === "GB" && digits.startsWith("44")) {
    return digits.length === 12;
  }

  // Generic: at least 8 digits (shortest valid international numbers)
  // and at most 15 (E.164 max)
  return digits.length >= 8 && digits.length <= 15;
}

/* -------------------------------------------------------------------------- */
/*  Format existing E.164 numbers for display                                 */
/* -------------------------------------------------------------------------- */

/**
 * Format an E.164 number (e.g. "+17045551234") for pretty display.
 * This is for displaying stored numbers, not for keypad input.
 */
export function formatE164ForDisplay(e164: string): string {
  const digits = stripToDigits(e164);
  return formatPhoneNumber(digits);
}

/* -------------------------------------------------------------------------- */
/*  Max digit limit per country                                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns the maximum raw digits allowed for a number being typed,
 * so the keypad stops accepting input once the number is complete.
 */
export function maxDigitsForCountry(digits: string): number {
  const country = detectCountry(digits);

  // Local AU: 10 digits
  if (country.code === "AU" && digits.startsWith("0")) return 10;
  // AU international: 11
  if (country.code === "AU") return 11;
  // US/CA: 11
  if (country.code === "US" || country.code === "CA") return 11;
  // UK: 12
  if (country.code === "GB") return 12;
  // E.164 max
  return 15;
}
