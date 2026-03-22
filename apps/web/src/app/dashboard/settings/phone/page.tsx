"use client";

import { useState } from "react";
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
  MessageSquare,
  Mic,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  Plus,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  Bot,
  X,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard, SuccessCelebration } from "./setup-wizard";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RoutingMode = "ai-first" | "ring-first" | "forward";

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName: string;
  active: boolean;
  routingSummary: string;
  monthlyCost: string;
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

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_NUMBERS: PhoneNumber[] = [
  {
    id: "pn-1",
    number: "+17045550001",
    friendlyName: "Main Business Line",
    active: true,
    routingSummary: "AI answers, then forwards to Jim",
    monthlyCost: "$1.00",
  },
  {
    id: "pn-2",
    number: "+17045550002",
    friendlyName: "Marketing / Google Ads",
    active: true,
    routingSummary: "AI answers, books appointments",
    monthlyCost: "$1.00",
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
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/* -------------------------------------------------------------------------- */
/*  Reusable sub-components                                                    */
/* -------------------------------------------------------------------------- */

function ToggleSwitch({
  enabled,
  onToggle,
  size = "default",
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: "default" | "large";
}) {
  const h = size === "large" ? "h-7 w-13" : "h-6 w-11";
  const dot = size === "large" ? "h-5.5 w-5.5" : "h-5 w-5";

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
  const [wizardStep, setWizardStep] = useState(0);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [selectedNewNumber, setSelectedNewNumber] = useState<string | null>(null);
  const [numberOption, setNumberOption] = useState<"new" | "existing" | "port">("new");
  const [areaCode, setAreaCode] = useState("");
  const [existingNumber, setExistingNumber] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);

  // ---- Phone numbers state ----
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(MOCK_NUMBERS);
  const [configuringNumberId, setConfiguringNumberId] = useState<string | null>(null);

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
  const [transferNumber, setTransferNumber] = useState("(555) 123-4567");
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

  // Mock available numbers for "Get New Number"
  const mockAvailableNumbers = areaCode.length >= 3
    ? [
        `+1${areaCode}5550101`,
        `+1${areaCode}5550202`,
        `+1${areaCode}5550303`,
        `+1${areaCode}5550404`,
      ]
    : [];

  const configuringNumber = phoneNumbers.find((n) => n.id === configuringNumberId);

  // ---- Wizard steps ----
  const wizardSteps = [
    { title: "Connect Account", description: "Link your Twilio account" },
    { title: "Get a Number", description: "Choose your business number" },
    { title: "All Done!", description: "Your phone system is ready" },
  ];

  const canProceedWizard =
    wizardStep === 0
      ? accountSid.length > 10 && authToken.length > 10
      : wizardStep === 1
        ? numberOption === "new"
          ? selectedNewNumber !== null
          : numberOption === "existing"
            ? existingNumber.length >= 10
            : true
        : true;

  // ======================================================================= //
  //  RENDER                                                                   //
  // ======================================================================= //

  // If we're configuring a specific number, show the routing config panel
  if (configuringNumberId && configuringNumber) {
    return (
      <div className="space-y-6 max-w-3xl">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </div>
        )}

        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfiguringNumberId(null)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Configure {configuringNumber.friendlyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(configuringNumber.number)}
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
                    <option value="professional-female">
                      Professional Female
                    </option>
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
                        label:
                          "Emergency detected (flooding, gas leak, fire)",
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
                        label:
                          "Always transfer after qualifying (AI gathers info, then connects you)",
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
                    placeholder="(555) 123-4567"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually the business owner's cell phone
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
                      onChange={(e) =>
                        setRingDuration(parseInt(e.target.value, 10))
                      }
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
                      {
                        id: "ai" as const,
                        label: "AI picks up and handles the call",
                        icon: Bot,
                      },
                      {
                        id: "voicemail" as const,
                        label: "Send to voicemail",
                        icon: Mic,
                      },
                      {
                        id: "forward" as const,
                        label: "Forward to another number",
                        icon: PhoneForwarded,
                      },
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
                        <span className="text-sm text-foreground">
                          {action.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {noAnswerAction === "forward" && (
                    <input
                      type="tel"
                      value={forwardNumber}
                      onChange={(e) => setForwardNumber(e.target.value)}
                      placeholder="(555) 987-6543"
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
                  placeholder="(555) 987-6543"
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
                    <div
                      key={day.day}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <label className="flex items-center gap-2 w-28 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) =>
                            updateBusinessHour(i, "enabled", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span
                          className={cn(
                            "text-sm",
                            day.enabled
                              ? "text-foreground font-medium"
                              : "text-muted-foreground",
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
                            onChange={(e) =>
                              updateBusinessHour(i, "start", e.target.value)
                            }
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="text-xs text-muted-foreground">
                            to
                          </span>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) =>
                              updateBusinessHour(i, "end", e.target.value)
                            }
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Closed
                        </span>
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
                    onChange={(e) =>
                      setDuringHoursRouting(e.target.value as RoutingMode)
                    }
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
                    onChange={(e) =>
                      setAfterHoursRouting(e.target.value as RoutingMode)
                    }
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
            <ToggleSwitch
              enabled={recordCalls}
              onToggle={() => setRecordCalls(!recordCalls)}
            />
          </div>
          {recordCalls && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 animate-in fade-in duration-200">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Compliance note:
                </span>{" "}
                The AI will automatically tell callers that the call may be
                recorded. This is required by law in most states.
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
              <p className="text-sm font-medium text-foreground">
                Enable texting on this number
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers can send and receive text messages
              </p>
            </div>
            <ToggleSwitch
              enabled={smsEnabled}
              onToggle={() => setSmsEnabled(!smsEnabled)}
            />
          </div>

          {smsEnabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    AI auto-responds to texts
                  </p>
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
                  <span className="font-medium text-foreground">
                    Required by law (TCPA):
                  </span>{" "}
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
            className={cn(
              "h-4 w-4 transition-transform",
              showAdvanced && "rotate-180",
            )}
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
                  {formatPhoneNumber(configuringNumber.number)} (this number)
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
            onClick={() => {
              showToast("Phone number settings saved!");
              setTimeout(() => setConfiguringNumberId(null), 1000);
            }}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Settings
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
                setIsConnected(true);
              }
              setWizardStep((s) => Math.min(s + 1, wizardSteps.length - 1));
            }}
            onBack={() => setWizardStep((s) => Math.max(s - 1, 0))}
            onComplete={() => {
              setSetupComplete(true);
              setIsConnected(true);
              showToast("Phone system connected successfully!");
            }}
            canProceed={canProceedWizard}
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
                      onChange={(e) => setAccountSid(e.target.value)}
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
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="Paste your Auth Token here"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is encrypted and never shown again after you connect.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Choose Number */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pick how you want to get your business phone number:
                </p>

                {/* Option tabs */}
                <div className="flex gap-2">
                  {[
                    { id: "new" as const, label: "Get a New Number" },
                    { id: "existing" as const, label: "Use Existing Number" },
                    { id: "port" as const, label: "Port My Number" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setNumberOption(opt.id)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        numberOption === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* New number flow */}
                {numberOption === "new" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        What area code do you want?
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={areaCode}
                        onChange={(e) =>
                          setAreaCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="e.g., 704"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                    </div>

                    {mockAvailableNumbers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Available numbers ($1.00/month each):
                        </label>
                        <div className="space-y-1.5">
                          {mockAvailableNumbers.map((num) => (
                            <label
                              key={num}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                selectedNewNumber === num
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted/50",
                              )}
                            >
                              <input
                                type="radio"
                                name="new-number"
                                checked={selectedNewNumber === num}
                                onChange={() => setSelectedNewNumber(num)}
                                className="accent-primary"
                              />
                              <span className="text-sm font-mono text-foreground">
                                {formatPhoneNumber(num)}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                $1.00/mo
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing number */}
                {numberOption === "existing" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Enter your Twilio phone number
                    </label>
                    <input
                      type="tel"
                      value={existingNumber}
                      onChange={(e) => setExistingNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">
                      This must be a number you already own in your Twilio
                      account.
                    </p>
                  </div>
                )}

                {/* Port number */}
                {numberOption === "port" && (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Keep your current business number
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Porting transfers your existing phone number to Twilio so
                      it works with our system. The process takes 1-2 weeks and
                      your number stays active during the transfer.
                    </p>
                    <a
                      href="https://www.twilio.com/docs/phone-numbers/porting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
                    >
                      Learn more about porting
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Success */}
            {wizardStep === 2 && (
              <SuccessCelebration
                title="Your Phone System is Ready!"
                message="Calls to your new number will be answered by AI immediately. You can customize everything from this settings page."
              />
            )}
          </SetupWizard>
        </SectionCard>
      ) : (
        <>
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
                  Twilio account linked &middot; {phoneNumbers.length} number
                  {phoneNumbers.length !== 1 ? "s" : ""} active
                </p>
              </div>
            </div>
            <button
              onClick={() => showToast("Twilio account settings opened")}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Account
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
            <div className="space-y-3">
              {phoneNumbers.map((pn) => (
                <div
                  key={pn.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        pn.active ? "bg-emerald-500/10" : "bg-muted",
                      )}
                    >
                      <Phone
                        className={cn(
                          "h-5 w-5",
                          pn.active
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {formatPhoneNumber(pn.number)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            pn.active
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {pn.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pn.friendlyName}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          {pn.routingSummary}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pn.monthlyCost}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfiguringNumberId(pn.id)}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </button>
                </div>
              ))}

              {/* Add another number */}
              <button
                onClick={() => showToast("Add number flow would open here")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Another Number
              </button>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
