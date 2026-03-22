"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard, SuccessCelebration } from "./setup-wizard";
import { apiClient, tryFetch, ApiRequestError } from "@/lib/api-client";
import { getOrgId, buildPath } from "@/lib/hooks/use-api";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RoutingMode = "ai-first" | "ring-first" | "forward";

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
  accountName?: string | null;
  numberCount?: number | null;
}

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

/**
 * Format an international phone number for display.
 * Handles Australian (+61), US (+1), and other formats.
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");

  // Australian numbers: +61 X XXXX XXXX
  if (cleaned.startsWith("+61") && cleaned.length === 12) {
    const local = cleaned.slice(3); // e.g. "291234567"
    return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
  }

  // Australian mobile: +61 4XX XXX XXX
  if (cleaned.startsWith("+614") && cleaned.length === 12) {
    const local = cleaned.slice(3);
    return `+61 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  // US/CA numbers: +1 (XXX) XXX-XXXX
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    const digits = cleaned.slice(2);
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // UK numbers: +44 XXXX XXXXXX
  if (cleaned.startsWith("+44") && cleaned.length >= 13) {
    const local = cleaned.slice(3);
    return `+44 ${local.slice(0, 4)} ${local.slice(4)}`;
  }

  // Fallback: insert space after country code
  if (cleaned.startsWith("+")) {
    // Try to find a natural break after 1-3 digit country code
    const match = cleaned.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      const [, cc, rest] = match;
      // Chunk the rest into groups of 4
      const chunks = rest.match(/.{1,4}/g) ?? [rest];
      return `${cc} ${chunks.join(" ")}`;
    }
  }

  return phone;
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
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export default function PhoneSettingsPage() {
  // ---- Connection state ----
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

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

  // ---- Save loading ----
  const [saveLoading, setSaveLoading] = useState(false);

  // ---- Disconnect loading ----
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // ---- Toast ----
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleTransferReason(reason: TransferReason) {
    setTransferReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
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

  // ---- API Calls ----

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/status");
    const result = await tryFetch(() => apiClient.get<PhoneSystemStatus>(path));

    if (result !== null) {
      setIsLive(true);
      setIsConnected(result.connected);
      setAccountName(result.accountName ?? null);
      if (result.connected) {
        setSetupComplete(true);
      }
    } else {
      // API unreachable -- demo mode
      setIsLive(false);
      setIsConnected(false);
    }
    setStatusLoading(false);
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
      // Fallback to mock data
      setPhoneNumbers(MOCK_NUMBERS);
      setIsLive(false);
    }
    setNumbersLoading(false);
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectLoading(true);
    setConnectError(null);

    const path = buildPath("/orgs/:orgId/phone-system/connect");

    try {
      const result = await tryFetch(() =>
        apiClient.post<{ success: boolean; accountName: string }>(path, {
          accountSid,
          authToken,
        }),
      );

      if (result !== null) {
        setIsConnected(true);
        setIsLive(true);
        setAccountName(result.accountName);
        setWizardStep(1);
        // Fetch real numbers immediately
        await fetchNumbers();
      } else {
        // API not reachable: simulate success for demo mode
        setIsConnected(true);
        setIsLive(false);
        setAccountName("Demo Account");
        setPhoneNumbers(MOCK_NUMBERS);
        setWizardStep(1);
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
      setTimeout(() => setConfiguringNumberSid(null), 800);
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

    setIsConnected(false);
    setSetupComplete(false);
    setAccountName(null);
    setPhoneNumbers([]);
    setWizardStep(0);
    setAccountSid("");
    setAuthToken("");
    setDisconnectLoading(false);
    showToast("Twilio account disconnected");
  }, []);

  // ---- On mount: check connection status ----
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---- When connected, fetch numbers ----
  useEffect(() => {
    if (isConnected && setupComplete) {
      fetchNumbers();
    }
  }, [isConnected, setupComplete, fetchNumbers]);

  const configuringNumber = phoneNumbers.find((n) => n.sid === configuringNumberSid);

  // ---- Wizard steps ----
  const wizardSteps = [
    { title: "Connect Account", description: "Link your Twilio account" },
    { title: "Choose Number", description: "Select your phone numbers" },
    { title: "All Done!", description: "Your phone system is ready" },
  ];

  const canProceedWizard =
    wizardStep === 0
      ? accountSid.length > 10 && authToken.length > 10 && !connectLoading
      : wizardStep === 1
        ? selectedNumbers.size > 0
        : true;

  // ======================================================================= //
  //  RENDER                                                                   //
  // ======================================================================= //

  // Loading state
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If we're configuring a specific number, show the routing config panel
  if (configuringNumberSid && configuringNumber) {
    return (
      <div className="space-y-6 max-w-3xl">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </div>
        )}

        {!isLive && <DemoBanner />}

        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfiguringNumberSid(null)}
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

        {/* ================================================================ */}
        {/*  WHO ANSWERS?                                                     */}
        {/* ================================================================ */}
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
              {/* AI sub-options */}
              <div className="space-y-4 border-t border-border pt-4">
                {/* Voice */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    AI Voice
                  </label>
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

                {/* Greeting */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    What the AI says first
                  </label>
                  <textarea
                    value={aiGreeting}
                    onChange={(e) => setAiGreeting(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will always disclose it's an AI assistant and mention
                    call recording for compliance.
                  </p>
                </div>

                {/* Transfer reasons */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    When should the AI transfer to you?
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: "caller-requests" as TransferReason,
                        label: "Caller asks to speak to a real person",
                      },
                      {
                        id: "emergency" as TransferReason,
                        label: "Emergency detected (flooding, gas leak, fire)",
                      },
                      {
                        id: "misunderstanding" as TransferReason,
                        label: "AI can't understand the caller after 2 tries",
                      },
                      {
                        id: "high-quote" as TransferReason,
                        label: "Caller wants a price quote over $500",
                      },
                      {
                        id: "always-after-qualifying" as TransferReason,
                        label: "Always transfer after qualifying (AI gathers info, then connects you)",
                      },
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
                        <span className="text-sm text-foreground">
                          {reason.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transfer to */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Transfer calls to this number
                  </label>
                  <input
                    type="tel"
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    placeholder="+61 4XX XXX XXX"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually the business owner's mobile number
                  </p>
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
                {/* Ring duration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    How long should your phone ring?
                  </label>
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

                {/* No answer action */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    If you don't answer:
                  </label>
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

            {/* Simple Forward */}
            <RoutingOptionCard
              selected={routingMode === "forward"}
              onSelect={() => setRoutingMode("forward")}
              icon={PhoneForwarded}
              title="Forward to Another Number"
              description="Simple call forwarding. No AI involved."
            >
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-medium text-foreground">
                  Forward all calls to:
                </label>
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

        {/* ================================================================ */}
        {/*  BUSINESS HOURS                                                    */}
        {/* ================================================================ */}
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
            <ToggleSwitch
              enabled={useBusinessHours}
              onToggle={() => setUseBusinessHours(!useBusinessHours)}
            />
          </div>

          {useBusinessHours && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Hours grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Your Business Hours
                </label>
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

              {/* During / After routing */}
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

        {/* ================================================================ */}
        {/*  CALL RECORDING                                                    */}
        {/* ================================================================ */}
        <SectionCard
          title="Call Recording"
          description="Record calls so you can review them later"
          icon={Mic}
        >
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Record all calls on this number
              </p>
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
                The AI will automatically tell callers that the call may be
                recorded. This is required by law in most jurisdictions.
              </p>
            </div>
          )}
        </SectionCard>

        {/* ================================================================ */}
        {/*  SMS SETTINGS                                                      */}
        {/* ================================================================ */}
        <SectionCard
          title="Text Messaging (SMS)"
          description="Let customers text this number"
          icon={MessageSquare}
        >
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable texting on this number</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers can send and receive text messages
              </p>
            </div>
            <ToggleSwitch enabled={smsEnabled} onToggle={() => setSmsEnabled(!smsEnabled)} />
          </div>

          {smsEnabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">AI auto-responds to texts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI reads incoming texts and replies instantly
                  </p>
                </div>
                <ToggleSwitch
                  enabled={smsAutoRespond}
                  onToggle={() => setSmsAutoRespond(!smsAutoRespond)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  After-hours auto-reply message
                </label>
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
                  All marketing texts will include "Reply STOP to opt out." This
                  is automatic and cannot be removed.
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Advanced accordion */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Advanced Settings
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
          />
        </button>

        {showAdvanced && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Caller ID for outbound calls
              </label>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option>
                  {formatPhoneNumber(configuringNumber.phoneNumber)} (this number)
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Maximum call duration (minutes)
              </label>
              <input
                type="number"
                defaultValue={60}
                min={5}
                max={180}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Whisper message before connecting
              </label>
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
            {saveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    );
  }

  // ==================================================================== //
  //  MAIN VIEW (not configuring a specific number)                        //
  // ==================================================================== //

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}

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
            Set up and manage your business phone numbers
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  SECTION 1: TWILIO CONNECTION / SETUP WIZARD                      */}
      {/* ================================================================ */}
      {!isConnected && !setupComplete ? (
        <SectionCard
          title="Connect Your Phone System"
          description="Get set up in under 5 minutes. No technical skills needed."
          icon={Phone}
        >
          <SetupWizard
            steps={wizardSteps}
            currentStep={wizardStep}
            onNext={() => {
              if (wizardStep === 0) {
                // Trigger connect API call
                handleConnect();
                return; // Don't advance step yet; handleConnect does it on success
              }
              setWizardStep((s) => Math.min(s + 1, wizardSteps.length - 1));
            }}
            onBack={() => {
              setConnectError(null);
              setWizardStep((s) => Math.max(s - 1, 0));
            }}
            onComplete={() => {
              setSetupComplete(true);
              setIsConnected(true);
              showToast("Phone system connected successfully!");
            }}
            canProceed={canProceedWizard}
            isLoading={connectLoading}
          >
            {/* Step 1: Connect Twilio */}
            {wizardStep === 0 && (
              <div className="space-y-5">
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    What is Twilio?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Twilio powers your phone system behind the scenes. It costs
                    about <strong>$1/month per phone number</strong> and{" "}
                    <strong>$0.01 per text message</strong>. You pay Twilio
                    directly for usage.
                  </p>
                </div>

                <a
                  href="https://www.twilio.com/try-twilio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Create Free Twilio Account (opens in new tab)
                </a>

                <div className="space-y-4 pt-2">
                  {/* Account SID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      Your Account Identifier
                      <Tooltip text="In Twilio, go to your Dashboard. You'll see 'Account SID' near the top. Copy and paste it here. It looks like a long string starting with 'AC'." />
                    </label>
                    <input
                      type="text"
                      value={accountSid}
                      onChange={(e) => {
                        setAccountSid(e.target.value);
                        setConnectError(null);
                      }}
                      placeholder="Paste your Account SID here (starts with AC...)"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                    />
                  </div>

                  {/* Auth Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      Your Secret Key
                      <Tooltip text="Right below the Account SID on your Twilio Dashboard, you'll see 'Auth Token'. Click the eye icon to reveal it, then copy and paste it here. Keep this secret!" />
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

                {/* Connection error */}
                {connectError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3 animate-in fade-in duration-200">
                    <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {connectError}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Choose Number */}
            {wizardStep === 1 && (
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
                    <p className="text-sm font-medium text-foreground">
                      No phone numbers found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You don't have any phone numbers in your Twilio account yet.
                      Purchase one from the Twilio console.
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
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50",
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
                                  <span className="text-xs text-muted-foreground">
                                    {num.friendlyName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {num.voiceEnabled && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                    <Phone className="h-3 w-3" />
                                    Voice
                                  </span>
                                )}
                                {num.smsEnabled && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                                    <MessageSquare className="h-3 w-3" />
                                    SMS
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
            {wizardStep === 2 && (
              <SuccessCelebration
                title="Your Phone System is Ready!"
                message="Calls to your selected numbers will be answered by AI immediately. You can customise everything from this settings page."
              />
            )}
          </SetupWizard>
        </SectionCard>
      ) : (
        <>
          {!isLive && <DemoBanner />}

          {/* Connected status banner */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Phone System Connected
                </p>
                <p className="text-xs text-muted-foreground">
                  {accountName ? `${accountName} \u00b7 ` : "Twilio account linked \u00b7 "}
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

          {/* ============================================================ */}
          {/*  SECTION 2: YOUR PHONE NUMBERS                                */}
          {/* ============================================================ */}
          <SectionCard
            title="Your Phone Numbers"
            description="Manage your business phone numbers and how calls are handled"
            icon={Hash}
          >
            {numbersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading numbers...
                </span>
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pn.friendlyName}
                        </p>
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
                      onClick={() => setConfiguringNumberSid(pn.sid)}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Configure
                    </button>
                  </div>
                ))}

                {phoneNumbers.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No phone numbers found. Purchase one from your{" "}
                    <a
                      href="https://www.twilio.com/console/phone-numbers/search"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Twilio console
                    </a>
                    , then refresh this page.
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
