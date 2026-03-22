"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquare,
  Mic,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  Save,
  Settings2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBanner, ToggleSwitch, SectionCard, RoutingOptionCard } from "./shared-ui";
import {
  DEFAULT_BUSINESS_HOURS,
  formatPhoneNumber,
  type BusinessHoursDay,
  type PhoneNumber,
  type RoutingMode,
  type TransferReason,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface NumberConfigPayload {
  routingMode: RoutingMode;
  aiConfig: {
    voice: string;
    greeting: string;
    transferReasons: TransferReason[];
    transferNumber: string;
  };
  businessHours: {
    enabled: boolean;
    schedule: BusinessHoursDay[];
    duringHoursRouting: RoutingMode;
    afterHoursRouting: RoutingMode;
  };
  forwardTo?: string;
  ringDuration: number;
  noAnswerAction: "ai" | "voicemail" | "forward";
  recordCalls: boolean;
  smsEnabled: boolean;
  smsAutoRespond: boolean;
  afterHoursReply: string;
}

/* -------------------------------------------------------------------------- */
/*  Number Config                                                              */
/* -------------------------------------------------------------------------- */

interface NumberConfigProps {
  number: PhoneNumber;
  isLive: boolean;
  saveLoading: boolean;
  onSave: (config: NumberConfigPayload) => void;
  onBack: () => void;
}

export function NumberConfig({ number, isLive, saveLoading, onSave, onBack }: NumberConfigProps) {
  const [routingMode, setRoutingMode] = useState<RoutingMode>("ai-first");
  const [aiVoice, setAiVoice] = useState("professional-female");
  const [aiGreeting, setAiGreeting] = useState("Hi, thanks for calling! I'm an AI assistant and I can help you right away.");
  const [transferReasons, setTransferReasons] = useState<TransferReason[]>(["caller-requests", "emergency", "misunderstanding"]);
  const [transferNumber, setTransferNumber] = useState("");
  const [ringDuration, setRingDuration] = useState(25);
  const [noAnswerAction, setNoAnswerAction] = useState<"ai" | "voicemail" | "forward">("ai");
  const [forwardNumber, setForwardNumber] = useState("");
  const [useBusinessHours, setUseBusinessHours] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHoursDay[]>(DEFAULT_BUSINESS_HOURS);
  const [duringHoursRouting, setDuringHoursRouting] = useState<RoutingMode>("ring-first");
  const [afterHoursRouting, setAfterHoursRouting] = useState<RoutingMode>("ai-first");
  const [recordCalls, setRecordCalls] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsAutoRespond, setSmsAutoRespond] = useState(true);
  const [afterHoursReply, setAfterHoursReply] = useState("Thanks for reaching out! We're currently closed but will get back to you first thing in the morning.");
  const [showAdvanced, setShowAdvanced] = useState(false);

  function toggleTransferReason(reason: TransferReason) {
    setTransferReasons((prev) => prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]);
  }

  function updateBusinessHour(index: number, field: keyof BusinessHoursDay, value: string | boolean) {
    setBusinessHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  function handleSave() {
    onSave({ routingMode, aiConfig: { voice: aiVoice, greeting: aiGreeting, transferReasons, transferNumber }, businessHours: { enabled: useBusinessHours, schedule: businessHours, duringHoursRouting, afterHoursRouting }, forwardTo: forwardNumber || undefined, ringDuration, noAnswerAction, recordCalls, smsEnabled, smsAutoRespond, afterHoursReply });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {!isLive && <DemoBanner />}

      {/* Back header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Configure {number.friendlyName}</h1>
          <p className="text-sm text-muted-foreground">{formatPhoneNumber(number.phoneNumber)}</p>
        </div>
      </div>

      {/* WHO ANSWERS? */}
      <SectionCard title="Who Answers Your Phone?" description="Choose how incoming calls are handled for this number" icon={PhoneIncoming}>
        <div className="space-y-3">
          <RoutingOptionCard selected={routingMode === "ai-first"} onSelect={() => setRoutingMode("ai-first")} icon={Bot} title="AI Answers First" description="Your AI assistant picks up instantly, qualifies the caller, and books appointments 24/7" recommended>
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">AI Voice</label>
                <select value={aiVoice} onChange={(e) => setAiVoice(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
                  <option value="professional-female">Professional Female</option>
                  <option value="professional-male">Professional Male</option>
                  <option value="friendly-female">Friendly Female</option>
                  <option value="friendly-male">Friendly Male</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What the AI says first</label>
                <textarea value={aiGreeting} onChange={(e) => setAiGreeting(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none" />
                <p className="text-xs text-muted-foreground">The AI will always disclose it's an AI assistant and mention call recording for compliance.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">When should the AI transfer to you?</label>
                <div className="space-y-2">
                  {([
                    { id: "caller-requests" as TransferReason, label: "Caller asks to speak to a real person" },
                    { id: "emergency" as TransferReason, label: "Emergency detected (flooding, gas leak, fire)" },
                    { id: "misunderstanding" as TransferReason, label: "AI can't understand the caller after 2 tries" },
                    { id: "high-quote" as TransferReason, label: "Caller wants a price quote over $500" },
                    { id: "always-after-qualifying" as TransferReason, label: "Always transfer after qualifying (AI gathers info, then connects you)" },
                  ]).map((reason) => (
                    <label key={reason.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <input type="checkbox" checked={transferReasons.includes(reason.id)} onChange={() => toggleTransferReason(reason.id)} className="h-4 w-4 rounded border-input text-primary focus:ring-ring accent-primary" />
                      <span className="text-sm text-foreground">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Transfer calls to this number</label>
                <input type="tel" value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} placeholder="+61 4XX XXX XXX" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                <p className="text-xs text-muted-foreground">Usually the business owner's mobile number</p>
              </div>
            </div>
          </RoutingOptionCard>

          <RoutingOptionCard selected={routingMode === "ring-first"} onSelect={() => setRoutingMode("ring-first")} icon={Phone} title="Ring My Phone First" description="Your phone rings first. If you don't answer, the AI takes over.">
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">How long should your phone ring?</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={15} max={60} step={5} value={ringDuration} onChange={(e) => setRingDuration(parseInt(e.target.value, 10))} className="flex-1 accent-primary" />
                  <span className="text-sm font-semibold text-foreground w-20 text-right">{ringDuration} seconds</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">If you don't answer:</label>
                <div className="space-y-2">
                  {([
                    { id: "ai" as const, label: "AI picks up and handles the call", icon: Bot },
                    { id: "voicemail" as const, label: "Send to voicemail", icon: Mic },
                    { id: "forward" as const, label: "Forward to another number", icon: PhoneForwarded },
                  ]).map((action) => (
                    <label key={action.id} className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors", noAnswerAction === action.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                      <input type="radio" name="no-answer" checked={noAnswerAction === action.id} onChange={() => setNoAnswerAction(action.id)} className="accent-primary" />
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{action.label}</span>
                    </label>
                  ))}
                </div>
                {noAnswerAction === "forward" && (
                  <input type="tel" value={forwardNumber} onChange={(e) => setForwardNumber(e.target.value)} placeholder="+61 4XX XXX XXX" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                )}
              </div>
            </div>
          </RoutingOptionCard>

          <RoutingOptionCard selected={routingMode === "forward"} onSelect={() => setRoutingMode("forward")} icon={PhoneForwarded} title="Forward to Another Number" description="Simple call forwarding. No AI involved.">
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground">Forward all calls to:</label>
              <input type="tel" value={forwardNumber} onChange={(e) => setForwardNumber(e.target.value)} placeholder="+61 4XX XXX XXX" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
            </div>
          </RoutingOptionCard>
        </div>
      </SectionCard>

      {/* BUSINESS HOURS */}
      <SectionCard title="Business Hours Routing" description="Use different call handling during and after business hours" icon={Clock}>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Different rules for business hours vs. after hours</p>
            <p className="text-xs text-muted-foreground mt-0.5">Example: Ring your phone during the day, AI answers at night</p>
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
                      <input type="checkbox" checked={day.enabled} onChange={(e) => updateBusinessHour(i, "enabled", e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
                      <span className={cn("text-sm", day.enabled ? "text-foreground font-medium" : "text-muted-foreground")}>{day.day.slice(0, 3)}</span>
                    </label>
                    {day.enabled ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={day.start} onChange={(e) => updateBusinessHour(i, "start", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        <span className="text-xs text-muted-foreground">to</span>
                        <input type="time" value={day.end} onChange={(e) => updateBusinessHour(i, "end", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    ) : <span className="text-sm text-muted-foreground">Closed</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border p-4">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2"><span className="flex h-2 w-2 rounded-full bg-emerald-500" />During Business Hours</label>
                <select value={duringHoursRouting} onChange={(e) => setDuringHoursRouting(e.target.value as RoutingMode)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="ai-first">AI answers first</option><option value="ring-first">Ring my phone first</option><option value="forward">Forward to another number</option>
                </select>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-4">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2"><span className="flex h-2 w-2 rounded-full bg-amber-500" />After Hours & Weekends</label>
                <select value={afterHoursRouting} onChange={(e) => setAfterHoursRouting(e.target.value as RoutingMode)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="ai-first">AI answers first</option><option value="ring-first">Ring my phone first</option><option value="forward">Forward to another number</option>
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
            <p className="text-xs text-muted-foreground mt-0.5">Recordings are stored securely and available in your call history</p>
          </div>
          <ToggleSwitch enabled={recordCalls} onToggle={() => setRecordCalls(!recordCalls)} />
        </div>
        {recordCalls && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 animate-in fade-in duration-200">
            <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Compliance note:</span> The AI will automatically tell callers that the call may be recorded.</p>
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
              <textarea value={afterHoursReply} onChange={(e) => setAfterHoursReply(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none" />
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
              <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Required by law (TCPA/Spam Act):</span> All marketing texts will include "Reply STOP to opt out." This is automatic.</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Advanced */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Advanced Settings</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
      </button>
      {showAdvanced && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Caller ID for outbound calls</label>
            <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option>{formatPhoneNumber(number.phoneNumber)} (this number)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Maximum call duration (minutes)</label>
            <input type="number" defaultValue={60} min={5} max={180} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Whisper message before connecting</label>
            <input type="text" placeholder="e.g., 'Incoming call from Google Ads lead'" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
            <p className="text-xs text-muted-foreground">You'll hear this message before you're connected to the caller</p>
          </div>
        </div>
      )}

      {/* SAVE */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
        <p className="text-sm text-muted-foreground">Changes are saved per number. Other numbers aren't affected.</p>
        <button onClick={handleSave} disabled={saveLoading} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLoading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
