"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  Clock,
  Phone,
  Mail,
  MapPin,
  Bot,
  Bell,
  Shield,
  Users,
  CreditCard,
  Save,
  Plug,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "general", label: "General", icon: Building2 },
  { id: "phone", label: "Phone System", icon: PhoneCall },
  { id: "ai-agent", label: "AI Agent", icon: Bot },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [toast, setToast] = useState<string | null>(null);

  // Toggle states for AI agent
  const [autoBook, setAutoBook] = useState(true);
  const [emergencyEscalation, setEmergencyEscalation] = useState(true);
  const [priceQuoting, setPriceQuoting] = useState(true);
  const [answerCalls, setAnswerCalls] = useState(true);
  const [autoRespondSms, setAutoRespondSms] = useState(true);
  const [leadScoring, setLeadScoring] = useState(true);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors cursor-pointer",
          enabled ? "bg-primary" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            enabled ? "right-0.5" : "left-0.5",
          )}
        />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 max-w-2xl">
          {/* ===== GENERAL TAB ===== */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  Business Information
                </h2>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Business Name
                    </label>
                    <input
                      defaultValue="Acme HVAC & Plumbing"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone
                      </label>
                      <input
                        defaultValue="(555) 123-4567"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </label>
                      <input
                        defaultValue="info@acmehvac.com"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Address
                    </label>
                    <input
                      defaultValue="100 Main Street, Springfield, IL 62701"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Service Area
                    </label>
                    <input
                      defaultValue="Springfield, IL and surrounding 30 miles"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Timezone
                      </label>
                      <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
                        <option>America/Chicago</option>
                        <option>America/New_York</option>
                        <option>America/Denver</option>
                        <option>America/Los_Angeles</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Business Hours
                      </label>
                      <input
                        defaultValue="Mon-Fri 8AM-6PM, Sat 9AM-2PM"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => showToast("Settings saved successfully")}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-4",
                      "bg-primary text-primary-foreground text-sm font-medium",
                      "hover:bg-primary/90 transition-colors",
                    )}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== PHONE SYSTEM TAB ===== */}
          {activeTab === "phone" && (
            <div className="space-y-4">
              {/* Status card */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <PhoneCall className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Phone System
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        2 numbers active, AI answering
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Numbers</p>
                    <p className="text-lg font-semibold text-foreground">2</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Calls Today</p>
                    <p className="text-lg font-semibold text-foreground">7</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">AI Handled</p>
                    <p className="text-lg font-semibold text-foreground">5</p>
                  </div>
                </div>

                <Link
                  href="/dashboard/settings/phone"
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-lg",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                  )}
                >
                  <Hash className="h-4 w-4" />
                  Manage Phone Numbers & Routing
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Quick summary of numbers */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Your Numbers
                </h3>
                {[
                  { num: "+1 (704) 555-0001", name: "Main Business Line", routing: "AI answers, forwards to Jim" },
                  { num: "+1 (704) 555-0002", name: "Marketing / Google Ads", routing: "AI answers, books appointments" },
                ].map((n) => (
                  <div
                    key={n.num}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{n.num}</p>
                      <p className="text-xs text-muted-foreground">{n.name} &middot; {n.routing}</p>
                    </div>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== AI AGENT TAB ===== */}
          {activeTab === "ai-agent" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">
                AI Phone Agent Configuration
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure how your AI agent handles inbound calls and messages.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Agent Name
                  </label>
                  <input
                    defaultValue="Acme HVAC Assistant"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Voice Selection
                  </label>
                  <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
                    <option>Alloy (Neutral, Professional)</option>
                    <option>Echo (Warm, Friendly)</option>
                    <option>Fable (Clear, Authoritative)</option>
                    <option>Nova (Energetic, Upbeat)</option>
                    <option>Onyx (Deep, Calm)</option>
                    <option>Shimmer (Gentle, Reassuring)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Greeting Message
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Hi, this is Acme HVAC's AI assistant. This call may be recorded. How can I help you today?"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must include AI disclosure and recording notice per
                    compliance rules.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Answer calls
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI agent answers inbound phone calls automatically
                    </p>
                  </div>
                  <ToggleSwitch enabled={answerCalls} onToggle={() => setAnswerCalls(!answerCalls)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Auto-respond SMS
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI responds to incoming text messages automatically
                    </p>
                  </div>
                  <ToggleSwitch enabled={autoRespondSms} onToggle={() => setAutoRespondSms(!autoRespondSms)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Lead scoring
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI automatically scores leads based on conversation analysis
                    </p>
                  </div>
                  <ToggleSwitch enabled={leadScoring} onToggle={() => setLeadScoring(!leadScoring)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Auto-book appointments
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow AI to book appointments without human approval
                    </p>
                  </div>
                  <ToggleSwitch enabled={autoBook} onToggle={() => setAutoBook(!autoBook)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Emergency escalation
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instantly alert owner for emergency keywords (flooding,
                      gas leak, fire)
                    </p>
                  </div>
                  <ToggleSwitch enabled={emergencyEscalation} onToggle={() => setEmergencyEscalation(!emergencyEscalation)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Price quoting
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI provides price ranges only (never exact pricing)
                    </p>
                  </div>
                  <ToggleSwitch enabled={priceQuoting} onToggle={() => setPriceQuoting(!priceQuoting)} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => showToast("AI agent configuration saved")}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {/* ===== INTEGRATIONS TAB ===== */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  Integrations
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connect your tools and services to MyBizOS.
                </p>
              </div>

              {[
                { name: "Twilio", desc: "SMS and voice calls", connected: false, icon: Phone, configUrl: "/dashboard/settings/phone" },
                { name: "Vapi.ai", desc: "AI voice agent platform", connected: false, icon: Bot, configUrl: "" },
                { name: "Stripe", desc: "Payment processing", connected: false, icon: CreditCard, configUrl: "" },
                { name: "Google Calendar", desc: "Calendar sync", connected: false, icon: Clock, configUrl: "" },
                { name: "Postmark", desc: "Transactional email", connected: false, icon: Mail, configUrl: "" },
                { name: "QuickBooks", desc: "Accounting & invoicing", connected: false, icon: Globe, configUrl: "" },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <integration.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.connected ? (
                      <>
                        <span className="flex items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                        </span>
                        <button
                          onClick={() => integration.configUrl ? window.location.href = integration.configUrl : showToast(`${integration.name} settings — coming soon`)}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Configure
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => integration.configUrl ? window.location.href = integration.configUrl : showToast(`${integration.name} — setup coming soon`)}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Set Up
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== BILLING TAB ===== */}
          {activeTab === "billing" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">
                Billing & Subscription
              </h2>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pro Plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">$199/month per location</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">AI Minutes Used</p>
                    <p className="text-sm font-semibold text-foreground">847 / 2,000</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SMS Sent</p>
                    <p className="text-sm font-semibold text-foreground">1,234 / 5,000</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Billing</p>
                    <p className="text-sm font-semibold text-foreground">Apr 1, 2026</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Payment Method</h3>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">Visa ending in 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2027</p>
                    </div>
                  </div>
                  <button
                    onClick={() => showToast("Payment method update — redirecting to Stripe portal")}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Recent Invoices</h3>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {[
                    { date: "Mar 1, 2026", amount: "$199.00", status: "Paid" },
                    { date: "Feb 1, 2026", amount: "$199.00", status: "Paid" },
                    { date: "Jan 1, 2026", amount: "$199.00", status: "Paid" },
                  ].map((inv) => (
                    <div key={inv.date} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-foreground">{inv.date}</p>
                        <p className="text-sm font-medium text-foreground">{inv.amount}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-success">{inv.status}</span>
                        <button
                          onClick={() => showToast("Invoice download started")}
                          className="text-xs text-primary hover:underline"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
