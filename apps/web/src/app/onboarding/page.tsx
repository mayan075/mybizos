"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  MapPin,
  Briefcase,
  Clock,
  Phone,
  Zap,
  Wrench,
  Flame,
  Trash2,
  Truck,
  Hammer,
  Sparkles,
  Car,
  Scissors,
  Heart,
  TreePine,
  Plus,
  X,
  ChevronDown,
  Rocket,
  MessageSquare,
  Bot,
  CalendarPlus,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { getUser } from "@/lib/auth";
import {
  type OnboardingData,
  type OnboardingService,
  type BusinessHours,
  type DayOfWeek,
  type PhoneSetupMode,
  VERTICALS,
  COUNTRIES,
  TIMEZONES,
  DEFAULT_BUSINESS_HOURS,
  saveOnboardingData,
  isOnboardingComplete,
  getServicesForVertical,
  detectTimezone,
  slugify,
} from "@/lib/onboarding";

// ---------------------------------------------------------------------------
// Icon mapping for verticals
// ---------------------------------------------------------------------------

const verticalIconMap: Record<string, React.ElementType> = {
  Wrench,
  Flame,
  Zap,
  Trash2,
  Truck,
  Hammer,
  Sparkles,
  Trees: TreePine,
  Car,
  Scissors,
  Heart,
  Building2,
};

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Your business", icon: Building2 },
  { label: "Location", icon: MapPin },
  { label: "Services", icon: Briefcase },
  { label: "Hours", icon: Clock },
  { label: "Phone", icon: Phone },
  { label: "All set!", icon: Rocket },
];

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const ROLES = ["Owner", "Manager", "Admin"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  usePageTitle("Setup");
  const router = useRouter();

  // Redirect if already complete
  useEffect(() => {
    if (isOnboardingComplete()) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Pre-fill from registration token
  const user = useMemo(() => getUser(), []);

  // Step state
  const [step, setStep] = useState(0);

  // Step 1
  const [businessName, setBusinessName] = useState(user?.orgName ?? "");
  const [vertical, setVertical] = useState("");
  const [role, setRole] = useState<string>("Owner");

  // Step 2
  const [country, setCountry] = useState("AU");
  const [city, setCity] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [timezone, setTimezone] = useState(() => detectTimezone());

  // Step 3
  const [services, setServices] = useState<OnboardingService[]>([]);
  const [newServiceName, setNewServiceName] = useState("");

  // Step 4
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);

  // Step 5
  const [phoneMode, setPhoneMode] = useState<PhoneSetupMode>("skip");
  const [phoneCountry, setPhoneCountry] = useState("AU");
  const [numberType, setNumberType] = useState("local");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");

  // Step 6 confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Load services when vertical changes
  useEffect(() => {
    if (vertical) {
      setServices(getServicesForVertical(vertical));
    }
  }, [vertical]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 0:
        return businessName.trim().length > 0 && vertical.length > 0;
      case 1:
        return country.length > 0 && city.trim().length > 0;
      case 2:
        return services.some((s) => s.enabled);
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  }, [step, businessName, vertical, country, city, services]);

  function handleNext() {
    if (!canAdvance()) return;
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === STEPS.length - 1) {
        handleFinish();
      }
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleSkip() {
    const skipData: OnboardingData = {
      businessName: businessName.trim() || "My Business",
      vertical: vertical || "other",
      role: role || "Owner",
      country: country || "US",
      city: city.trim() || "New York",
      serviceArea: "",
      timezone: detectTimezone(),
      services: getServicesForVertical(vertical || "other").filter((s) => s.enabled),
      businessHours: DEFAULT_BUSINESS_HOURS,
      phoneSetup: { mode: "skip" },
      completedAt: new Date().toISOString(),
    };
    saveOnboardingData(skipData);
    router.push("/dashboard");
  }

  function handleFinish() {
    const data: OnboardingData = {
      businessName: businessName.trim(),
      vertical,
      role,
      country,
      city: city.trim(),
      serviceArea: serviceArea.trim(),
      timezone,
      services: services.filter((s) => s.enabled),
      businessHours: hours,
      phoneSetup: {
        mode: phoneMode,
        country: phoneMode === "mybizos" ? phoneCountry : undefined,
        numberType: phoneMode === "mybizos" ? numberType : undefined,
        twilioSid: phoneMode === "twilio" ? twilioSid : undefined,
        twilioToken: phoneMode === "twilio" ? twilioToken : undefined,
      },
      completedAt: new Date().toISOString(),
    };
    saveOnboardingData(data);
    setShowConfetti(true);
  }

  // -----------------------------------------------------------------------
  // Service helpers
  // -----------------------------------------------------------------------

  function toggleService(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function updateServiceName(id: string, name: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s)),
    );
  }

  function updateServicePrice(id: string, field: "priceMin" | "priceMax", value: number) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  function addCustomService() {
    if (!newServiceName.trim()) return;
    const id = `custom-${Date.now()}`;
    setServices((prev) => [
      ...prev,
      {
        id,
        name: newServiceName.trim(),
        enabled: true,
        priceMin: 0,
        priceMax: 0,
        custom: true,
      },
    ]);
    setNewServiceName("");
  }

  function removeService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  // -----------------------------------------------------------------------
  // Hours helpers
  // -----------------------------------------------------------------------

  function toggleDay(day: DayOfWeek) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open },
    }));
  }

  function updateHour(day: DayOfWeek, field: "start" | "end", value: string) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  // -----------------------------------------------------------------------
  // Render steps
  // -----------------------------------------------------------------------

  function renderStep1() {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Tell us about your business
          </h2>
          <p className="text-muted-foreground">
            We'll use this to customize your dashboard and AI agent.
          </p>
        </div>

        {/* Business name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Business name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Sydney Rubbish Removals"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {/* Vertical selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            What type of business?
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {VERTICALS.map((v) => {
              const Icon = verticalIconMap[v.icon] ?? Building2;
              const isSelected = vertical === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVertical(v.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Your role
          </label>
          <div className="flex gap-3">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                  role === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Where are you located?
          </h2>
          <p className="text-muted-foreground">
            This helps us set up your timezone and local phone number.
          </p>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Country</label>
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.flag}  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            City / Suburb
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Sydney, Bondi Beach"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {/* Service area */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Service area description
            <span className="text-muted-foreground font-normal"> (optional)</span>
          </label>
          <input
            type="text"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder="e.g. We service all of Sydney metro area"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Timezone
          </label>
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground">
            Auto-detected from your browser. Change if needed.
          </p>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const enabledCount = services.filter((s) => s.enabled).length;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Your services</h2>
          <p className="text-muted-foreground">
            We pre-filled these based on your business type. Toggle, edit, or add your own.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {enabledCount} service{enabledCount !== 1 ? "s" : ""} selected
        </p>

        {/* Services list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 p-4 transition-all",
                service.enabled
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card opacity-60",
              )}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleService(service.id)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  service.enabled
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30",
                )}
              >
                {service.enabled && <Check className="h-3.5 w-3.5" />}
              </button>

              {/* Name */}
              <input
                type="text"
                value={service.name}
                onChange={(e) => updateServiceName(service.id, e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none"
              />

              {/* Price range */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  value={service.priceMin || ""}
                  onChange={(e) =>
                    updateServicePrice(service.id, "priceMin", Number(e.target.value))
                  }
                  placeholder="Min"
                  className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <input
                  type="number"
                  value={service.priceMax || ""}
                  onChange={(e) =>
                    updateServicePrice(service.id, "priceMax", Number(e.target.value))
                  }
                  placeholder="Max"
                  className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Remove (custom only) */}
              {service.custom && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add custom */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomService()}
            placeholder="Add a custom service..."
            className="flex-1 h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
          <button
            type="button"
            onClick={addCustomService}
            disabled={!newServiceName.trim()}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border border-primary bg-primary/10 px-4 text-sm font-medium text-primary transition-all",
              "hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Business hours</h2>
          <p className="text-muted-foreground">
            When can customers book appointments? Your AI agent will use these too.
          </p>
        </div>

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = hours[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-4 rounded-xl border-2 p-4 transition-all",
                  day.open
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card",
                )}
              >
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={cn(
                    "relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                    day.open ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute h-5 w-5 rounded-full bg-white shadow transition-transform",
                      day.open ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>

                {/* Day name */}
                <span
                  className={cn(
                    "w-28 text-sm font-medium",
                    day.open ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>

                {/* Time pickers */}
                {day.open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={day.start}
                      onChange={(e) => updateHour(key, "start", e.target.value)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={(e) => updateHour(key, "end", e.target.value)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    Closed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Get your phone number
          </h2>
          <p className="text-muted-foreground">
            Your AI agent needs a number to answer calls and send SMS. You can always set this up later.
          </p>
        </div>

        {/* Mode selector */}
        <div className="space-y-4">
          {/* MyBizOS number */}
          <button
            type="button"
            onClick={() => setPhoneMode("mybizos")}
            className={cn(
              "w-full rounded-xl border-2 p-5 text-left transition-all",
              phoneMode === "mybizos"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Get a MyBizOS number
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We provision a local number for you. From $2/mo + usage.
                </p>
              </div>
            </div>
          </button>

          {phoneMode === "mybizos" && (
            <div className="ml-4 space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Country</label>
                  <select
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.flag} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Number type</label>
                  <select
                    value={numberType}
                    onChange={(e) => setNumberType(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="local">Local ($2/mo)</option>
                    <option value="tollfree">Toll-Free ($5/mo)</option>
                    <option value="mobile">Mobile ($3/mo)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Twilio */}
          <button
            type="button"
            onClick={() => setPhoneMode("twilio")}
            className={cn(
              "w-full rounded-xl border-2 p-5 text-left transition-all",
              phoneMode === "twilio"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <Phone className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Connect my Twilio
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Already have a Twilio account? Bring your own number.
                </p>
              </div>
            </div>
          </button>

          {phoneMode === "twilio" && (
            <div className="ml-4 space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Account SID</label>
                <input
                  type="text"
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Auth Token</label>
                <input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Your Twilio auth token"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Skip */}
          <button
            type="button"
            onClick={() => setPhoneMode("skip")}
            className={cn(
              "w-full rounded-xl border-2 p-5 text-left transition-all",
              phoneMode === "skip"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Skip for now
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You can set up a phone number later in Settings.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  function renderStep6() {
    const enabledServices = services.filter((s) => s.enabled);
    const openDays = DAYS.filter(({ key }) => hours[key].open);
    const verticalLabel = VERTICALS.find((v) => v.value === vertical)?.label ?? vertical;
    const bookingSlug = slugify(businessName);

    return (
      <div className="space-y-8">
        {/* Celebration */}
        <div className="text-center space-y-4">
          {showConfetti && (
            <div className="relative mx-auto mb-4">
              <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-success/10 animate-[scale-in_0.5s_ease-out]">
                <Check className="h-10 w-10 text-success" />
              </div>
              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"][i % 7],
                      animation: `confetti-${i % 4} 1s ease-out forwards`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <h2 className="text-3xl font-bold text-foreground">
            You're all set!
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            <span className="font-semibold text-foreground">{businessName}</span> is
            ready to go. Your AI agent will be customized for your{" "}
            {verticalLabel.toLowerCase()} business.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <div className="flex items-center gap-3 px-5 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{businessName}</p>
              <p className="text-xs text-muted-foreground">
                {verticalLabel} &middot; {city}, {COUNTRIES.find((c) => c.value === country)?.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Briefcase className="h-5 w-5 text-primary" />
            <p className="text-sm text-foreground">
              {enabledServices.length} service{enabledServices.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Clock className="h-5 w-5 text-primary" />
            <p className="text-sm text-foreground">
              Open {openDays.length} day{openDays.length !== 1 ? "s" : ""} a week
            </p>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Phone className="h-5 w-5 text-primary" />
            <p className="text-sm text-foreground">
              {phoneMode === "mybizos"
                ? "MyBizOS number (provisioning...)"
                : phoneMode === "twilio"
                  ? "Twilio connected"
                  : "Phone setup skipped"}
            </p>
          </div>
        </div>

        {/* Go to dashboard */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Rocket className="h-5 w-5" />
          Go to Dashboard
        </button>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/inbox")}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-info" />
            <span className="text-sm font-medium text-foreground">
              Send your first SMS
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings/phone")}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <Bot className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-foreground">
              Set up AI phone agent
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/book/${bookingSlug}`)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <CalendarPlus className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-foreground">
              Create booking page
            </span>
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Confetti keyframes */}
      <style jsx global>{`
        @keyframes confetti-0 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-60px, -100px) rotate(360deg); opacity: 0; }
        }
        @keyframes confetti-1 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(70px, -80px) rotate(-360deg); opacity: 0; }
        }
        @keyframes confetti-2 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-40px, -120px) rotate(180deg); opacity: 0; }
        }
        @keyframes confetti-3 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(50px, -90px) rotate(-180deg); opacity: 0; }
        }
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Top bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm">MyBizOS</span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Step {step + 1} of {STEPS.length}
        </p>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      {!isLastStep && (
        <div className="flex items-center justify-center gap-2 py-6 px-4">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : isDone
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden md:inline",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-6 md:w-10",
                      i < step ? "bg-success" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 pb-32">
        <div className="w-full max-w-2xl py-4">
          {stepRenderers[step]?.()}
        </div>
      </div>

      {/* Bottom navigation */}
      {!isLastStep && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-medium transition-all",
                step === 0
                  ? "invisible"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="flex h-11 items-center gap-1 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all",
                  "hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed",
                  "shadow-lg shadow-primary/20",
                )}
              >
                {step === STEPS.length - 2 ? "Finish setup" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
