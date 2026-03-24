"use client";

import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ExternalLink,
  Globe,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard, SuccessCelebration } from "@/app/dashboard/settings/phone/setup-wizard";
import { SectionCard } from "./shared-ui";
import {
  TWILIO_PRICING,
  TWILIO_PRICING_URL,
  formatPrice,
  formatPhoneNumber,
  type NumberType,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface PurchasedNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

/* -------------------------------------------------------------------------- */
/*  API Helpers                                                                */
/* -------------------------------------------------------------------------- */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/orgs/demo/phone-system${path}`, {
      headers: {
        "Content-Type": "application/json",
        // In production, auth middleware extracts orgId from session.
        // For now we pass a demo header so the API doesn't reject us.
        "x-org-id": "demo",
        "Authorization": "Bearer demo-token",
      },
      ...options,
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error ?? `Request failed (${res.status})` };
    }

    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "Cannot reach the API server. Make sure it is running on port 3001." };
  }
}

/* -------------------------------------------------------------------------- */
/*  Country → Twilio type mapping                                              */
/* -------------------------------------------------------------------------- */

function toTwilioType(type: NumberType): "local" | "mobile" | "tollFree" {
  switch (type) {
    case "local":
      return "local";
    case "mobile":
      return "mobile";
    case "toll-free":
      return "tollFree";
  }
}

/* -------------------------------------------------------------------------- */
/*  MyBizOS Wizard (Model B — Real Provisioning)                               */
/* -------------------------------------------------------------------------- */

interface MyBizOSWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MyBizOSWizard({ onComplete, onBack }: MyBizOSWizardProps) {
  // Wizard state
  const [step, setStep] = useState(0);

  // Step 0: Country
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Step 1: Browse numbers
  const [selectedNumberType, setSelectedNumberType] = useState<NumberType | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);
  const [areaCodeFilter, setAreaCodeFilter] = useState("");

  // Step 2: Confirm & purchase
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Step 3: Success
  const [purchasedNumber, setPurchasedNumber] = useState<PurchasedNumber | null>(null);

  // API not available fallback
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const selectedCountryData = TWILIO_PRICING.find((c) => c.code === selectedCountry);

  const wizardSteps = [
    { title: "Country", description: "Choose your country" },
    { title: "Choose Number", description: "Pick a phone number" },
    { title: "Confirm", description: "Activate your number" },
    { title: "Done", description: "Number is live" },
  ];

  // ── Search for available numbers ─────────────────────────────────────────

  const searchNumbers = useCallback(
    async (country: string, type: NumberType, areaCode?: string) => {
      setIsSearching(true);
      setSearchError(null);
      setAvailableNumbers([]);
      setSelectedNumber(null);

      const params = new URLSearchParams({
        countryCode: country,
        type: toTwilioType(type),
      });
      if (areaCode) {
        params.set("areaCode", areaCode);
      }

      const { data, error } = await apiFetch<{ numbers: AvailableNumber[]; message?: string }>(
        `/mybizos/available-numbers?${params.toString()}`,
      );

      setIsSearching(false);

      if (error) {
        if (error.includes("Cannot reach")) {
          setApiUnavailable(true);
        }
        setSearchError(error);
        return;
      }

      if (data) {
        setAvailableNumbers(data.numbers);
        if (data.numbers.length === 0) {
          setSearchError(
            data.message ?? "No numbers available. Try a different type or area code.",
          );
        }
      }
    },
    [],
  );

  // ── Purchase the selected number ─────────────────────────────────────────

  const purchaseSelectedNumber = useCallback(async () => {
    if (!selectedNumber) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    const { data, error } = await apiFetch<{ success: boolean; number: PurchasedNumber }>(
      "/mybizos/purchase",
      {
        method: "POST",
        body: JSON.stringify({ phoneNumber: selectedNumber.phoneNumber }),
      },
    );

    setIsPurchasing(false);

    if (error) {
      setPurchaseError(error);
      return;
    }

    if (data?.success && data.number) {
      setPurchasedNumber(data.number);
      setStep(3);
    } else {
      setPurchaseError("Purchase failed. Please try again.");
    }
  }, [selectedNumber]);

  // ── Step navigation ──────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 0 && selectedCountry && selectedNumberType) {
      // Moving to step 1 triggers a number search
      searchNumbers(selectedCountry, selectedNumberType);
      setStep(1);
    } else if (step === 1 && selectedNumber) {
      setStep(2);
    } else if (step === 2) {
      purchaseSelectedNumber();
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onBack();
      return;
    }
    if (step === 2) {
      setPurchaseError(null);
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const canProceed =
    step === 0
      ? selectedCountry !== null && selectedNumberType !== null
      : step === 1
        ? selectedNumber !== null
        : step === 2
          ? !isPurchasing
          : true;

  // ── API unavailable fallback ─────────────────────────────────────────────

  if (apiUnavailable) {
    return <WaitlistFallback onBack={onBack} />;
  }

  // ── Step 3: Success — render outside the wizard chrome ───────────────────

  if (step === 3 && purchasedNumber) {
    return (
      <SectionCard title="Your Number Is Active" icon={Sparkles}>
        <SuccessCelebration
          title="Your Number Is Live!"
          message={`${formatPhoneNumber(purchasedNumber.phoneNumber)} is now active and ready to receive calls and SMS.`}
        />
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatPhoneNumber(purchasedNumber.phoneNumber)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {purchasedNumber.capabilities.voice && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        <Phone className="h-3 w-3" /> Voice
                      </span>
                    )}
                    {purchasedNumber.capabilities.sms && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                        SMS
                      </span>
                    )}
                    {purchasedNumber.capabilities.mms && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                        MMS
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onComplete}
              className="flex-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Configure Call Routing
            </button>
          </div>
        </div>
      </SectionCard>
    );
  }

  // ── Main wizard ──────────────────────────────────────────────────────────

  return (
    <SectionCard title="Get a Phone Number" icon={Sparkles}>
      <SetupWizard
        steps={wizardSteps}
        currentStep={step}
        onNext={handleNext}
        onBack={handleBack}
        onComplete={onComplete}
        canProceed={canProceed}
        isLoading={isPurchasing}
      >
        {/* ── Step 0: Select Country + Number Type ─────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Country selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Where is your business located?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TWILIO_PRICING.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => {
                      setSelectedCountry(country.code);
                      setSelectedNumberType(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      selectedCountry === country.code
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <span className="text-3xl">{country.flag}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{country.name}</p>
                      <p className="text-xs text-muted-foreground">
                        From {formatPrice(Math.min(...country.numberTypes.map((t) => t.monthlyPrice)))}/mo
                      </p>
                    </div>
                    {selectedCountry === country.code && (
                      <Check className="h-5 w-5 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors pt-1">
                <Globe className="h-4 w-4" />
                More countries coming soon
              </button>
            </div>

            {/* Number type selection (shows after country picked) */}
            {selectedCountryData && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-medium text-foreground">
                  What type of number do you need?
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedCountryData.numberTypes.map((nt) => (
                    <button
                      key={nt.type}
                      onClick={() => setSelectedNumberType(nt.type)}
                      disabled={!nt.available}
                      className={cn(
                        "relative flex flex-col items-center rounded-xl border-2 p-5 text-center transition-all",
                        selectedNumberType === nt.type
                          ? "border-primary bg-primary/5 shadow-sm"
                          : nt.available
                            ? "border-border hover:border-muted-foreground/30"
                            : "border-border opacity-50 cursor-not-allowed",
                      )}
                    >
                      {nt.type === "local" && (
                        <span className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Popular
                        </span>
                      )}
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full mb-3",
                          selectedNumberType === nt.type ? "bg-primary/10" : "bg-muted",
                        )}
                      >
                        {nt.type === "toll-free" ? (
                          <Zap
                            className={cn(
                              "h-5 w-5",
                              selectedNumberType === nt.type
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        ) : (
                          <Phone
                            className={cn(
                              "h-5 w-5",
                              selectedNumberType === nt.type
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{nt.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatPrice(nt.monthlyPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">per month</p>
                      {selectedNumberType === nt.type && (
                        <div className="absolute top-3 left-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <span>Prices from Twilio as of March 2026. Actual prices may vary.</span>
                  <a
                    href={TWILIO_PRICING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
                  >
                    See current pricing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Browse & Choose a Number ──────────────────────────── */}
        {step === 1 && selectedCountryData && selectedNumberType && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Available{" "}
                {selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.label}{" "}
                numbers in {selectedCountryData.flag} {selectedCountryData.name}
              </p>
              <button
                onClick={() =>
                  searchNumbers(selectedCountry!, selectedNumberType, areaCodeFilter || undefined)
                }
                disabled={isSearching}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isSearching && "animate-spin")} />
                Refresh
              </button>
            </div>

            {/* Area code filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={areaCodeFilter}
                  onChange={(e) => setAreaCodeFilter(e.target.value)}
                  placeholder="Filter by area code (e.g., 02, 415)"
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <button
                onClick={() =>
                  searchNumbers(selectedCountry!, selectedNumberType, areaCodeFilter || undefined)
                }
                disabled={isSearching}
                className="flex h-10 items-center gap-2 rounded-lg bg-muted px-4 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Loading state */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Searching available numbers...</p>
              </div>
            )}

            {/* Error state */}
            {searchError && !isSearching && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-foreground font-medium">No Numbers Found</p>
                </div>
                <p className="text-sm text-muted-foreground">{searchError}</p>
                <button
                  onClick={() =>
                    searchNumbers(selectedCountry!, selectedNumberType)
                  }
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Try searching without area code
                </button>
              </div>
            )}

            {/* Number list */}
            {!isSearching && availableNumbers.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {availableNumbers.map((num) => (
                  <button
                    key={num.phoneNumber}
                    onClick={() => setSelectedNumber(num)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                      selectedNumber?.phoneNumber === num.phoneNumber
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Phone
                        className={cn(
                          "h-5 w-5",
                          selectedNumber?.phoneNumber === num.phoneNumber
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground font-mono">
                        {formatPhoneNumber(num.phoneNumber)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {num.locality && (
                          <span className="text-xs text-muted-foreground">{num.locality}</span>
                        )}
                        {num.region && (
                          <span className="text-xs text-muted-foreground">
                            {num.locality ? ", " : ""}
                            {num.region}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {num.capabilities.voice && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Voice
                        </span>
                      )}
                      {num.capabilities.sms && (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                          SMS
                        </span>
                      )}
                    </div>
                    {selectedNumber?.phoneNumber === num.phoneNumber && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Count indicator */}
            {!isSearching && availableNumbers.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing {availableNumbers.length} available numbers
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Confirm Purchase ──────────────────────────────────── */}
        {step === 2 && selectedNumber && selectedCountryData && selectedNumberType && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Review your selection and activate this number.
            </p>

            {/* Selected number card */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground font-mono">
                    {formatPhoneNumber(selectedNumber.phoneNumber)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCountryData.flag} {selectedCountryData.name} -{" "}
                    {selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.label}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="flex items-center gap-3">
                {selectedNumber.capabilities.voice && (
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Voice Calls
                  </div>
                )}
                {selectedNumber.capabilities.sms && (
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    SMS
                  </div>
                )}
                {selectedNumber.capabilities.mms && (
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    MMS
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                <span className="text-sm text-muted-foreground">Monthly cost</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(
                    selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)
                      ?.monthlyPrice ?? 0,
                  )}
                  /mo
                </span>
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">What happens when you activate:</p>
              <ul className="space-y-1.5">
                {[
                  "Number is provisioned and assigned to your account",
                  "Inbound calls and SMS are routed to your MyBizOS AI agent",
                  "You can configure call routing, business hours, and greetings",
                  "Cancel anytime — the number will be released",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Purchase error */}
            {purchaseError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{purchaseError}</p>
                </div>
              </div>
            )}

            {/* Activate button (replaces the wizard's default Continue) */}
            <button
              onClick={purchaseSelectedNumber}
              disabled={isPurchasing}
              className={cn(
                "w-full flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
                isPurchasing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
              )}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Activating Number...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Activate This Number
                </>
              )}
            </button>
          </div>
        )}
      </SetupWizard>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Waitlist Fallback (when API is not running)                                */
/* -------------------------------------------------------------------------- */

function WaitlistFallback({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // In reality this would call POST /phone-system/waitlist
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SectionCard title="You're on the List!" icon={Sparkles}>
        <SuccessCelebration
          title="You're on the Waitlist!"
          message="We'll email you as soon as managed phone numbers are available."
        />
        <button
          onClick={onBack}
          className="w-full flex h-10 items-center justify-center rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
          Back to Phone Settings
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Set Up Your Number" icon={Sparkles}>
      <div className="space-y-5">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-foreground">API Server Not Running</p>
          </div>
          <p className="text-sm text-muted-foreground">
            The phone provisioning API is not reachable. To use real number provisioning, start the
            API server with <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">TWILIO_ACCOUNT_SID</code> and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">TWILIO_AUTH_TOKEN</code> environment
            variables set.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Want to be notified when managed phone numbers are ready? Join the waitlist.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Smith's Plumbing"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={name.length < 2 || !email.includes("@")}
            className={cn(
              "flex-1 flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
              name.length >= 2 && email.includes("@")
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
