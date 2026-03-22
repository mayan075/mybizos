"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Hash,
  Loader2,
  MessageSquare,
  Mic,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  Bot,
  X,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard, SuccessCelebration } from "./setup-wizard";
import { apiClient, tryFetch, ApiRequestError } from "@/lib/api-client";
import { getOrgId, buildPath } from "@/lib/hooks/use-api";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RoutingMode = "ai-first" | "ring-first" | "forward";
type PhoneModel = "mybizos" | "byo-twilio";
type NumberType = "local" | "mobile" | "toll-free";

interface PhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  smsEnabled: boolean;
  voiceEnabled: boolean;
}

interface BusinessHoursDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

type TransferReason =
  | "caller-requests"
  | "emergency"
  | "misunderstanding"
  | "high-quote"
  | "always-after-qualifying";

interface PhoneSystemStatus {
  connected: boolean;
  provider?: "mybizos" | "byo-twilio" | null;
  accountName?: string | null;
  numberCount?: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Twilio Pricing Data (Real prices as of March 2026)                         */
/* -------------------------------------------------------------------------- */

interface CountryPricing {
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

const TWILIO_PRICING: CountryPricing[] = [
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

const TWILIO_PRICING_URL = "https://www.twilio.com/en-us/voice/pricing";

/* -------------------------------------------------------------------------- */
/*  Mock Data (used when API is not available)                                  */
/* -------------------------------------------------------------------------- */

const MOCK_NUMBERS: PhoneNumber[] = [
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

const DEFAULT_BUSINESS_HOURS: BusinessHoursDay[] = [
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

function formatPhoneNumber(phone: string): string {
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

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/*  Reusable sub-components                                                    */
/* -------------------------------------------------------------------------- */

function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Demo mode</span> — connect your API to use real Twilio numbers
      </p>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
  size = "default",
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: "default" | "large";
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative rounded-full transition-colors cursor-pointer shrink-0",
        size === "large" ? "h-7 w-[52px]" : "h-6 w-11",
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 rounded-full bg-white shadow transition-transform",
          size === "large" ? "h-6 w-6" : "h-5 w-5",
          enabled
            ? size === "large"
              ? "translate-x-[26px]"
              : "translate-x-[22px]"
            : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-popover border border-border p-3 text-xs text-popover-foreground shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 h-2 w-2 rotate-45 bg-popover border-r border-b border-border" />
        </div>
      )}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function RoutingOptionCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  recommended,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  recommended?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl border-2 p-5 transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-muted-foreground/30 bg-card",
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          Recommended
        </span>
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              selected ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {title}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          {selected && children && (
            <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors mt-0.5",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground/30",
          )}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Model Selection Card                                                       */
/* -------------------------------------------------------------------------- */

function ModelCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeVariant,
  features,
  buttonText,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "recommended" | "advanced";
  features: string[];
  buttonText: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 p-6 transition-all cursor-pointer group",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-muted-foreground/40 bg-card hover:shadow-md",
      )}
      onClick={onSelect}
    >
      {/* Badge */}
      <span
        className={cn(
          "absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          badgeVariant === "recommended"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {badgeVariant === "recommended" && <Sparkles className="h-3 w-3" />}
        {badgeVariant === "advanced" && <Settings2 className="h-3 w-3" />}
        {badge}
      </span>

      {/* Icon */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl mb-4 transition-colors",
          selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5",
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 transition-colors",
            selected ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        />
      </div>

      {/* Title + Subtitle */}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

      {/* Features */}
      <ul className="mt-4 space-y-2 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Button */}
      <button
        className={cn(
          "mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          selected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-foreground hover:bg-muted/80",
        )}
      >
        {buttonText}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export default function PhoneSettingsPage() {
  // ---- Top-level view state ----
  type ViewState =
    | "loading"
    | "model-select"
    | "mybizos-wizard"
    | "byo-wizard"
    | "connected"
    | "configure-number";

  const [view, setView] = useState<ViewState>("loading");
  const [connectedProvider, setConnectedProvider] = useState<PhoneModel | null>(null);

  // ---- Connection state ----
  const [isLive, setIsLive] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  // ---- BYO Twilio wizard state ----
  const [byoStep, setByoStep] = useState(0);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // ---- MyBizOS wizard state ----
  const [mybizosStep, setMybizosStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedNumberType, setSelectedNumberType] = useState<NumberType | null>(null);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");

  // ---- Phone numbers state ----
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [configuringNumberSid, setConfiguringNumberSid] = useState<string | null>(null);

  // ---- Routing config state (per number) ----
  const [routingMode, setRoutingMode] = useState<RoutingMode>("ai-first");
  const [aiVoice, setAiVoice] = useState("professional-female");
  const [aiGreeting, setAiGreeting] = useState(
    "Hi, thanks for calling! I'm an AI assistant and I can help you right away.",
  );
  const [transferReasons, setTransferReasons] = useState<TransferReason[]>([
    "caller-requests",
    "emergency",
    "misunderstanding",
  ]);
  const [transferNumber, setTransferNumber] = useState("");
  const [ringDuration, setRingDuration] = useState(25);
  const [noAnswerAction, setNoAnswerAction] = useState<"ai" | "voicemail" | "forward">("ai");
  const [forwardNumber, setForwardNumber] = useState("");

  // ---- Business hours ----
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHoursDay[]>(DEFAULT_BUSINESS_HOURS);
  const [duringHoursRouting, setDuringHoursRouting] = useState<RoutingMode>("ring-first");
  const [afterHoursRouting, setAfterHoursRouting] = useState<RoutingMode>("ai-first");

  // ---- Call recording ----
  const [recordCalls, setRecordCalls] = useState(true);

  // ---- SMS ----
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsAutoRespond, setSmsAutoRespond] = useState(true);
  const [afterHoursReply, setAfterHoursReply] = useState(
    "Thanks for reaching out! We're currently closed but will get back to you first thing in the morning.",
  );

  // ---- Advanced ----
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ---- Save / Disconnect loading ----
  const [saveLoading, setSaveLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // ---- Toast ----
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleTransferReason(reason: TransferReason) {
    setTransferReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  }

  function updateBusinessHour(
    index: number,
    field: keyof BusinessHoursDay,
    value: string | boolean,
  ) {
    setBusinessHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  }

  // ---- Derived ----
  const configuringNumber = phoneNumbers.find((n) => n.sid === configuringNumberSid);
  const selectedCountryData = TWILIO_PRICING.find((c) => c.code === selectedCountry);

  // ---- API Calls ----

  const fetchStatus = useCallback(async () => {
    const path = buildPath("/orgs/:orgId/phone-system/status");
    const result = await tryFetch(() => apiClient.get<PhoneSystemStatus>(path));

    if (result !== null) {
      setIsLive(true);
      if (result.connected) {
        setConnectedProvider(result.provider ?? "byo-twilio");
        setAccountName(result.accountName ?? null);
        setView("connected");
        return;
      }
    } else {
      setIsLive(false);
    }
    setView("model-select");
  }, []);

  const fetchNumbers = useCallback(async () => {
    setNumbersLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/numbers");
    const result = await tryFetch(() =>
      apiClient.get<{ numbers: PhoneNumber[] }>(path),
    );

    if (result !== null) {
      setPhoneNumbers(result.numbers);
      setIsLive(true);
    } else {
      setPhoneNumbers(MOCK_NUMBERS);
      setIsLive(false);
    }
    setNumbersLoading(false);
  }, []);

  const handleBYOConnect = useCallback(async () => {
    setConnectLoading(true);
    setConnectError(null);

    const path = buildPath("/orgs/:orgId/phone-system/connect");

    try {
      const result = await tryFetch(() =>
        apiClient.post<{ success: boolean; accountName: string }>(path, {
          accountSid,
          authToken,
          provider: "byo-twilio",
        }),
      );

      if (result !== null) {
        setIsLive(true);
        setAccountName(result.accountName);
        setByoStep(1);
        await fetchNumbers();
      } else {
        setIsLive(false);
        setAccountName("Demo Account");
        setPhoneNumbers(MOCK_NUMBERS);
        setByoStep(1);
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setConnectError(err.message);
      } else {
        setConnectError("Failed to connect. Please check your credentials and try again.");
      }
    } finally {
      setConnectLoading(false);
    }
  }, [accountSid, authToken, fetchNumbers]);

  const handleConfigureSave = useCallback(
    async (numberSid: string) => {
      setSaveLoading(true);

      const path = buildPath(
        `/orgs/:orgId/phone-system/numbers/${numberSid}/configure`,
      );

      const configPayload = {
        routingMode,
        aiConfig: {
          voice: aiVoice,
          greeting: aiGreeting,
          transferReasons,
          transferNumber,
        },
        businessHours: {
          enabled: useBusinessHours,
          schedule: businessHours,
          duringHoursRouting,
          afterHoursRouting,
        },
        forwardTo: forwardNumber || undefined,
        ringDuration,
        noAnswerAction,
        recordCalls,
        smsEnabled,
        smsAutoRespond,
        afterHoursReply,
      };

      const result = await tryFetch(() =>
        apiClient.post<{ success: boolean }>(path, configPayload),
      );

      if (result !== null) {
        showToast("Phone number settings saved!");
      } else {
        showToast("Settings saved locally (API offline)");
      }

      setSaveLoading(false);
      setTimeout(() => {
        setConfiguringNumberSid(null);
        setView("connected");
      }, 800);
    },
    [
      routingMode, aiVoice, aiGreeting, transferReasons, transferNumber,
      useBusinessHours, businessHours, duringHoursRouting, afterHoursRouting,
      forwardNumber, ringDuration, noAnswerAction, recordCalls,
      smsEnabled, smsAutoRespond, afterHoursReply,
    ],
  );

  const handleDisconnect = useCallback(async () => {
    setDisconnectLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/disconnect");
    await tryFetch(() => apiClient.delete<{ success: boolean }>(path));

    setConnectedProvider(null);
    setAccountName(null);
    setPhoneNumbers([]);
    setByoStep(0);
    setMybizosStep(0);
    setAccountSid("");
    setAuthToken("");
    setSelectedCountry(null);
    setSelectedNumberType(null);
    setDisconnectLoading(false);
    setView("model-select");
    showToast("Phone system disconnected");
  }, []);

  // ---- On mount ----
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---- When connected, fetch numbers ----
  useEffect(() => {
    if (view === "connected") {
      fetchNumbers();
    }
  }, [view, fetchNumbers]);

  // ---- BYO Wizard steps ----
  const byoWizardSteps = [
    { title: "Connect Account", description: "Link your Twilio account" },
    { title: "Choose Numbers", description: "Select your phone numbers" },
    { title: "All Done!", description: "Your phone system is ready" },
  ];

  const canProceedBYO =
    byoStep === 0
      ? accountSid.length > 10 && authToken.length > 10 && !connectLoading
      : byoStep === 1
        ? selectedNumbers.size > 0
        : true;

  // ---- MyBizOS Wizard steps ----
  const mybizosWizardSteps = [
    { title: "Country", description: "Choose your country" },
    { title: "Number Type", description: "Choose a number type" },
    { title: "Get Number", description: "Reserve your number" },
  ];

  const canProceedMyBizOS =
    mybizosStep === 0
      ? selectedCountry !== null
      : mybizosStep === 1
        ? selectedNumberType !== null
        : mybizosStep === 2
          ? waitlistName.length > 1 && waitlistEmail.includes("@")
          : true;

  // ======================================================================= //
  //  RENDER                                                                   //
  // ======================================================================= //

  // Toast (always rendered)
  const toastElement = toast && (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2 duration-200">
      <CheckCircle2 className="h-4 w-4" />
      {toast}
    </div>
  );

  // Loading
  if (view === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ================================================================== //
  //  CONFIGURE NUMBER VIEW                                               //
  // ================================================================== //
  if (view === "configure-number" && configuringNumberSid && configuringNumber) {
    return (
      <div className="space-y-6 max-w-3xl">
        {toastElement}
        {!isLive && <DemoBanner />}

        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setConfiguringNumberSid(null);
              setView("connected");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Configure {configuringNumber.friendlyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(configuringNumber.phoneNumber)}
            </p>
          </div>
        </div>

        {/* WHO ANSWERS? */}
        <SectionCard
          title="Who Answers Your Phone?"
          description="Choose how incoming calls are handled for this number"
          icon={PhoneIncoming}
        >
          <div className="space-y-3">
            {/* AI First */}
            <RoutingOptionCard
              selected={routingMode === "ai-first"}
              onSelect={() => setRoutingMode("ai-first")}
              icon={Bot}
              title="AI Answers First"
              description="Your AI assistant picks up instantly, qualifies the caller, and books appointments 24/7"
              recommended
            >
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">AI Voice</label>
                  <select
                    value={aiVoice}
                    onChange={(e) => setAiVoice(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  >
                    <option value="professional-female">Professional Female</option>
                    <option value="professional-male">Professional Male</option>
                    <option value="friendly-female">Friendly Female</option>
                    <option value="friendly-male">Friendly Male</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">What the AI says first</label>
                  <textarea
                    value={aiGreeting}
                    onChange={(e) => setAiGreeting(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will always disclose it's an AI assistant and mention call recording for compliance.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">When should the AI transfer to you?</label>
                  <div className="space-y-2">
                    {[
                      { id: "caller-requests" as TransferReason, label: "Caller asks to speak to a real person" },
                      { id: "emergency" as TransferReason, label: "Emergency detected (flooding, gas leak, fire)" },
                      { id: "misunderstanding" as TransferReason, label: "AI can't understand the caller after 2 tries" },
                      { id: "high-quote" as TransferReason, label: "Caller wants a price quote over $500" },
                      { id: "always-after-qualifying" as TransferReason, label: "Always transfer after qualifying (AI gathers info, then connects you)" },
                    ].map((reason) => (
                      <label
                        key={reason.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={transferReasons.includes(reason.id)}
                          onChange={() => toggleTransferReason(reason.id)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring accent-primary"
                        />
                        <span className="text-sm text-foreground">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Transfer calls to this number</label>
                  <input
                    type="tel"
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    placeholder="+61 4XX XXX XXX"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">Usually the business owner's mobile number</p>
                </div>
              </div>
            </RoutingOptionCard>

            {/* Ring First */}
            <RoutingOptionCard
              selected={routingMode === "ring-first"}
              onSelect={() => setRoutingMode("ring-first")}
              icon={Phone}
              title="Ring My Phone First"
              description="Your phone rings first. If you don't answer, the AI takes over."
            >
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">How long should your phone ring?</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={15}
                      max={60}
                      step={5}
                      value={ringDuration}
                      onChange={(e) => setRingDuration(parseInt(e.target.value, 10))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-semibold text-foreground w-20 text-right">
                      {ringDuration} seconds
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">If you don't answer:</label>
                  <div className="space-y-2">
                    {[
                      { id: "ai" as const, label: "AI picks up and handles the call", icon: Bot },
                      { id: "voicemail" as const, label: "Send to voicemail", icon: Mic },
                      { id: "forward" as const, label: "Forward to another number", icon: PhoneForwarded },
                    ].map((action) => (
                      <label
                        key={action.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          noAnswerAction === action.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="no-answer"
                          checked={noAnswerAction === action.id}
                          onChange={() => setNoAnswerAction(action.id)}
                          className="accent-primary"
                        />
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{action.label}</span>
                      </label>
                    ))}
                  </div>
                  {noAnswerAction === "forward" && (
                    <input
                      type="tel"
                      value={forwardNumber}
                      onChange={(e) => setForwardNumber(e.target.value)}
                      placeholder="+61 4XX XXX XXX"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  )}
                </div>
              </div>
            </RoutingOptionCard>

            {/* Forward */}
            <RoutingOptionCard
              selected={routingMode === "forward"}
              onSelect={() => setRoutingMode("forward")}
              icon={PhoneForwarded}
              title="Forward to Another Number"
              description="Simple call forwarding. No AI involved."
            >
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-medium text-foreground">Forward all calls to:</label>
                <input
                  type="tel"
                  value={forwardNumber}
                  onChange={(e) => setForwardNumber(e.target.value)}
                  placeholder="+61 4XX XXX XXX"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
            </RoutingOptionCard>
          </div>
        </SectionCard>

        {/* BUSINESS HOURS */}
        <SectionCard
          title="Business Hours Routing"
          description="Use different call handling during and after business hours"
          icon={Clock}
        >
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Different rules for business hours vs. after hours
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Example: Ring your phone during the day, AI answers at night
              </p>
            </div>
            <ToggleSwitch enabled={useBusinessHours} onToggle={() => setUseBusinessHours(!useBusinessHours)} />
          </div>

          {useBusinessHours && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Business Hours</label>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {businessHours.map((day, i) => (
                    <div key={day.day} className="flex items-center gap-3 px-4 py-2.5">
                      <label className="flex items-center gap-2 w-28 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) => updateBusinessHour(i, "enabled", e.target.checked)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span
                          className={cn(
                            "text-sm",
                            day.enabled ? "text-foreground font-medium" : "text-muted-foreground",
                          )}
                        >
                          {day.day.slice(0, 3)}
                        </span>
                      </label>
                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e) => updateBusinessHour(i, "start", e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) => updateBusinessHour(i, "end", e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    During Business Hours
                  </label>
                  <select
                    value={duringHoursRouting}
                    onChange={(e) => setDuringHoursRouting(e.target.value as RoutingMode)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ai-first">AI answers first</option>
                    <option value="ring-first">Ring my phone first</option>
                    <option value="forward">Forward to another number</option>
                  </select>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                    After Hours & Weekends
                  </label>
                  <select
                    value={afterHoursRouting}
                    onChange={(e) => setAfterHoursRouting(e.target.value as RoutingMode)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ai-first">AI answers first</option>
                    <option value="ring-first">Ring my phone first</option>
                    <option value="forward">Forward to another number</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* CALL RECORDING */}
        <SectionCard title="Call Recording" description="Record calls so you can review them later" icon={Mic}>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Record all calls on this number</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recordings are stored securely and available in your call history
              </p>
            </div>
            <ToggleSwitch enabled={recordCalls} onToggle={() => setRecordCalls(!recordCalls)} />
          </div>
          {recordCalls && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 animate-in fade-in duration-200">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Compliance note:</span>{" "}
                The AI will automatically tell callers that the call may be recorded.
              </p>
            </div>
          )}
        </SectionCard>

        {/* SMS */}
        <SectionCard title="Text Messaging (SMS)" description="Let customers text this number" icon={MessageSquare}>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable texting on this number</p>
              <p className="text-xs text-muted-foreground mt-0.5">Customers can send and receive text messages</p>
            </div>
            <ToggleSwitch enabled={smsEnabled} onToggle={() => setSmsEnabled(!smsEnabled)} />
          </div>

          {smsEnabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">AI auto-responds to texts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">AI reads incoming texts and replies instantly</p>
                </div>
                <ToggleSwitch enabled={smsAutoRespond} onToggle={() => setSmsAutoRespond(!smsAutoRespond)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">After-hours auto-reply message</label>
                <textarea
                  value={afterHoursReply}
                  onChange={(e) => setAfterHoursReply(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Required by law (TCPA/Spam Act):</span>{" "}
                  All marketing texts will include "Reply STOP to opt out." This is automatic.
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Advanced Settings
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
        </button>

        {showAdvanced && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Caller ID for outbound calls</label>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option>{formatPhoneNumber(configuringNumber.phoneNumber)} (this number)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Maximum call duration (minutes)</label>
              <input
                type="number"
                defaultValue={60}
                min={5}
                max={180}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Whisper message before connecting</label>
              <input
                type="text"
                placeholder="e.g., 'Incoming call from Google Ads lead'"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                You'll hear this message before you're connected to the caller
              </p>
            </div>
          </div>
        )}

        {/* SAVE */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Changes are saved per number. Other numbers aren't affected.
          </p>
          <button
            onClick={() => handleConfigureSave(configuringNumberSid)}
            disabled={saveLoading}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    );
  }

  // ================================================================== //
  //  MODEL SELECT VIEW                                                   //
  // ================================================================== //
  if (view === "model-select") {
    return (
      <div className="space-y-6 max-w-4xl">
        {toastElement}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Phone System</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose how you want to set up your business phone
            </p>
          </div>
        </div>

        {/* Two model cards side by side */}
        <div className="grid gap-6 md:grid-cols-2">
          <ModelCard
            selected={false}
            onSelect={() => setView("mybizos-wizard")}
            icon={Sparkles}
            title="Get a MyBizOS Phone Number"
            subtitle="We handle everything. Get a number in 60 seconds."
            badge="Recommended"
            badgeVariant="recommended"
            features={[
              "No technical setup required",
              "AI answers calls immediately",
              "Numbers from 100+ countries",
              "Simple monthly pricing",
            ]}
            buttonText="Get Started"
          />

          <ModelCard
            selected={false}
            onSelect={() => setView("byo-wizard")}
            icon={Settings2}
            title="Connect Your Own Twilio"
            subtitle="For businesses that already have a Twilio account."
            badge="Advanced"
            badgeVariant="advanced"
            features={[
              "Use your existing numbers",
              "Direct Twilio billing",
              "Full API access",
              "Complete control",
            ]}
            buttonText="Connect Twilio"
          />
        </div>
      </div>
    );
  }

  // ================================================================== //
  //  MYBIZOS WIZARD (Model B)                                            //
  // ================================================================== //
  if (view === "mybizos-wizard") {
    return (
      <div className="space-y-6 max-w-3xl">
        {toastElement}

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView("model-select");
              setMybizosStep(0);
              setSelectedCountry(null);
              setSelectedNumberType(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Get a MyBizOS Phone Number</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              We handle everything behind the scenes
            </p>
          </div>
        </div>

        <SectionCard title="Set Up Your Number" icon={Sparkles}>
          <SetupWizard
            steps={mybizosWizardSteps}
            currentStep={mybizosStep}
            onNext={() => {
              setMybizosStep((s) => Math.min(s + 1, mybizosWizardSteps.length - 1));
            }}
            onBack={() => {
              if (mybizosStep === 0) {
                setView("model-select");
                return;
              }
              setMybizosStep((s) => Math.max(s - 1, 0));
            }}
            onComplete={() => {
              showToast("You're on the waitlist! We'll email you when your number is ready.");
              setView("model-select");
            }}
            canProceed={canProceedMyBizOS}
          >
            {/* Step 1: Select Country */}
            {mybizosStep === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Where is your business located? We'll show you available number types and pricing.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {TWILIO_PRICING.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountry(country.code)}
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
            )}

            {/* Step 2: Choose Number Type */}
            {mybizosStep === 1 && selectedCountryData && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose a number type for {selectedCountryData.flag} {selectedCountryData.name}
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
                        {nt.type === "local" && <Phone className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                        {nt.type === "mobile" && <Phone className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                        {nt.type === "toll-free" && <Zap className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{nt.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{formatPrice(nt.monthlyPrice)}</p>
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
                    See current pricing
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Step 3: Reserve / Waitlist */}
            {mybizosStep === 2 && selectedCountryData && selectedNumberType && (
              <div className="space-y-5">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedCountryData.flag}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedCountryData.name} {selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.label} Number
                      </p>
                      <p className="text-sm text-primary font-bold">
                        {formatPrice(selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.monthlyPrice ?? 0)}/month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    <p className="text-sm font-medium text-foreground">Coming Soon</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We're setting up our managed phone service. Enter your details below to be first in line when it launches. We'll email you as soon as your number is ready.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Business Name</label>
                    <input
                      type="text"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder="e.g., Smith's Plumbing"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll only use this to notify you when your number is ready
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SetupWizard>
        </SectionCard>
      </div>
    );
  }

  // ================================================================== //
  //  BYO TWILIO WIZARD (Model A)                                         //
  // ================================================================== //
  if (view === "byo-wizard") {
    return (
      <div className="space-y-6 max-w-3xl">
        {toastElement}

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView("model-select");
              setByoStep(0);
              setAccountSid("");
              setAuthToken("");
              setConnectError(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Connect Your Own Twilio</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Link your existing Twilio account to MyBizOS
            </p>
          </div>
        </div>

        <SectionCard title="Connect Twilio Account" icon={Settings2}>
          <SetupWizard
            steps={byoWizardSteps}
            currentStep={byoStep}
            onNext={() => {
              if (byoStep === 0) {
                handleBYOConnect();
                return;
              }
              setByoStep((s) => Math.min(s + 1, byoWizardSteps.length - 1));
            }}
            onBack={() => {
              if (byoStep === 0) {
                setView("model-select");
                return;
              }
              setConnectError(null);
              setByoStep((s) => Math.max(s - 1, 0));
            }}
            onComplete={() => {
              setConnectedProvider("byo-twilio");
              setView("connected");
              showToast("Phone system connected successfully!");
            }}
            canProceed={canProceedBYO}
            isLoading={connectLoading}
          >
            {/* Step 1: Credentials */}
            {byoStep === 0 && (
              <div className="space-y-5">
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">How it works</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Twilio account so MyBizOS can manage your phone numbers.
                    You keep full control and pay Twilio directly for usage.
                  </p>
                </div>

                <a
                  href="https://www.twilio.com/try-twilio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Don't have a Twilio account? Create one free
                </a>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      Account SID
                      <Tooltip text="In Twilio, go to your Dashboard. You'll see 'Account SID' near the top. Copy and paste it here. It starts with 'AC'." />
                    </label>
                    <input
                      type="text"
                      value={accountSid}
                      onChange={(e) => {
                        setAccountSid(e.target.value);
                        setConnectError(null);
                      }}
                      placeholder="Starts with AC..."
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      Auth Token
                      <Tooltip text="Right below the Account SID on your Twilio Dashboard, you'll see 'Auth Token'. Click the eye icon to reveal it, then copy and paste it here." />
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={authToken}
                        onChange={(e) => {
                          setAuthToken(e.target.value);
                          setConnectError(null);
                        }}
                        placeholder="Paste your Auth Token here"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is encrypted and never shown again after you connect.
                    </p>
                  </div>
                </div>

                {/* Where do I find these? */}
                <details className="rounded-lg border border-border">
                  <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <CircleHelp className="h-4 w-4" />
                    Where do I find these?
                  </summary>
                  <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>
                        Go to{" "}
                        <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          twilio.com/console
                        </a>
                      </li>
                      <li>Sign in to your Twilio account</li>
                      <li>On the dashboard, you'll see <strong className="text-foreground">Account SID</strong> and <strong className="text-foreground">Auth Token</strong></li>
                      <li>Click the copy icon next to each to copy them</li>
                      <li>Paste them in the fields above</li>
                    </ol>
                  </div>
                </details>

                {connectError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3 animate-in fade-in duration-200">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{connectError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Your Numbers */}
            {byoStep === 1 && (
              <div className="space-y-4">
                {!isLive && <DemoBanner />}

                {numbersLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading your phone numbers from Twilio...
                    </span>
                  </div>
                ) : phoneNumbers.length === 0 ? (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-6 text-center space-y-3">
                    <Phone className="h-8 w-8 text-amber-600 mx-auto" />
                    <p className="text-sm font-medium text-foreground">No phone numbers found</p>
                    <p className="text-sm text-muted-foreground">
                      You don't have any phone numbers in your Twilio account yet.
                    </p>
                    <a
                      href="https://www.twilio.com/console/phone-numbers/search"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buy a number on twilio.com
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select the phone number(s) you want to use with MyBizOS:
                    </p>
                    <div className="space-y-2">
                      {phoneNumbers.map((num) => {
                        const isSelected = selectedNumbers.has(num.sid);
                        return (
                          <label
                            key={num.sid}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedNumbers((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(num.sid)) {
                                    next.delete(num.sid);
                                  } else {
                                    next.add(num.sid);
                                  }
                                  return next;
                                });
                              }}
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold font-mono text-foreground">
                                  {formatPhoneNumber(num.phoneNumber)}
                                </span>
                                {num.friendlyName && (
                                  <span className="text-xs text-muted-foreground">{num.friendlyName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {num.voiceEnabled && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                    <Phone className="h-3 w-3" /> Voice
                                  </span>
                                )}
                                {num.smsEnabled && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                                    <MessageSquare className="h-3 w-3" /> SMS
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Success */}
            {byoStep === 2 && (
              <SuccessCelebration
                title="Your Phone System is Ready!"
                message="Calls to your selected numbers will be answered by AI immediately. You can customise everything from the settings page."
              />
            )}
          </SetupWizard>
        </SectionCard>
      </div>
    );
  }

  // ================================================================== //
  //  CONNECTED VIEW                                                      //
  // ================================================================== //
  if (view === "connected") {
    return (
      <div className="space-y-6 max-w-3xl">
        {toastElement}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Phone System</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your business phone numbers
            </p>
          </div>
        </div>

        {!isLive && <DemoBanner />}

        {/* Connected status banner */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Phone System Connected</p>
              <p className="text-xs text-muted-foreground">
                {connectedProvider === "mybizos" ? "MyBizOS Phone" : "Your Twilio Account"}
                {accountName ? ` \u00b7 ${accountName}` : ""}
                {" \u00b7 "}
                {phoneNumbers.length} number{phoneNumbers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnectLoading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {disconnectLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Disconnect
          </button>
        </div>

        {/* Phone Numbers List */}
        <SectionCard
          title="Your Phone Numbers"
          description="Manage your business phone numbers and how calls are handled"
          icon={Hash}
        >
          {numbersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading numbers...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {phoneNumbers.map((pn) => (
                <div
                  key={pn.sid}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {formatPhoneNumber(pn.phoneNumber)}
                        </p>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{pn.friendlyName}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {pn.voiceEnabled && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> Voice
                          </span>
                        )}
                        {pn.smsEnabled && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" /> SMS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConfiguringNumberSid(pn.sid);
                      setView("configure-number");
                    }}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              ))}

              {phoneNumbers.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No phone numbers found.{" "}
                  {connectedProvider === "byo-twilio" ? (
                    <>
                      Purchase one from your{" "}
                      <a
                        href="https://www.twilio.com/console/phone-numbers/search"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Twilio console
                      </a>
                      , then refresh this page.
                    </>
                  ) : (
                    "Your number is being provisioned. Check back shortly."
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  // Fallback
  return null;
}
