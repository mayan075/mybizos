"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "general", label: "General", icon: Building2 },
  { id: "ai-agent", label: "AI Agent", icon: Bot },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div className="space-y-6">
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
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Website
                    </label>
                    <input
                      defaultValue="https://acmehvac.com"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
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
                </div>

                <div className="flex justify-end pt-2">
                  <button
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

              {/* Service Vertical */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  Service Industry
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your AI agent and templates are optimized for your selected
                  industry.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "hvac", label: "HVAC", active: true },
                    { id: "plumbing", label: "Plumbing", active: true },
                    { id: "electrical", label: "Electrical", active: false },
                    { id: "roofing", label: "Roofing", active: false },
                    { id: "landscaping", label: "Landscaping", active: false },
                    { id: "cleaning", label: "Cleaning", active: false },
                  ].map((v) => (
                    <button
                      key={v.id}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-center",
                        v.active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai-agent" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">
                AI Phone Agent Configuration
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure how your AI agent handles inbound calls.
              </p>

              <div className="space-y-4">
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
                      Auto-book appointments
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow AI to book appointments without human approval
                    </p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-primary relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                  </div>
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
                  <div className="h-6 w-11 rounded-full bg-primary relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                  </div>
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
                  <div className="h-6 w-11 rounded-full bg-primary relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
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

          {activeTab !== "general" && activeTab !== "ai-agent" && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  {(() => {
                    const tab = tabs.find((t) => t.id === activeTab);
                    if (!tab) return null;
                    return (
                      <tab.icon className="h-6 w-6 text-muted-foreground" />
                    );
                  })()}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {tabs.find((t) => t.id === activeTab)?.label} Settings
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Configuration for{" "}
                  {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()}{" "}
                  will be available here. This section is under active
                  development.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
