"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Zap,
  UserPlus,
  CalendarCheck,
  Star,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Bell,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TriggerType =
  | "new_lead"
  | "appointment_booked"
  | "appointment_completed"
  | "new_review"
  | "deal_stage_changed"
  | "form_submitted";

type ActionType =
  | "send_email"
  | "send_sms"
  | "wait"
  | "add_tag"
  | "notify_owner"
  | "enroll_sequence";

interface AutomationAction {
  id: string;
  type: ActionType;
  label: string;
  config: string;
}

const triggerOptions: { value: TriggerType; label: string; icon: React.ElementType }[] = [
  { value: "new_lead", label: "New Lead Created", icon: UserPlus },
  { value: "appointment_booked", label: "Appointment Booked", icon: CalendarCheck },
  { value: "appointment_completed", label: "Appointment Completed", icon: CalendarCheck },
  { value: "new_review", label: "New Review Received", icon: Star },
  { value: "deal_stage_changed", label: "Deal Stage Changed", icon: Zap },
  { value: "form_submitted", label: "Form Submitted", icon: Mail },
];

const actionConfig: Record<ActionType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  notify_owner: { label: "Notify Owner", icon: Bell, className: "bg-info/10 text-info" },
  enroll_sequence: { label: "Enroll in Sequence", icon: GitBranch, className: "bg-primary/10 text-primary" },
};

export default function NewAutomationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<TriggerType>("new_lead");
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addAction(type: ActionType) {
    const cfg = actionConfig[type];
    const action: AutomationAction = {
      id: `act-${Date.now()}`,
      type,
      label: cfg.label,
      config: "",
    };
    setActions((prev) => [...prev, action]);
  }

  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSave() {
    if (!name.trim()) {
      showToast("Please enter an automation name");
      return;
    }
    showToast("Automation created successfully");
    setTimeout(() => router.push("/dashboard/automations"), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Back link + header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/automations"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Automation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build a workflow that runs your business on autopilot
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Save className="h-4 w-4" />
          Save Automation
        </button>
      </div>

      {/* Basic info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Details</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Automation Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Welcome New Leads"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this automation does..."
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        </div>
      </div>

      {/* Trigger */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Trigger</h2>
        <p className="text-sm text-muted-foreground">What starts this automation?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {triggerOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setTrigger(opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors",
                  trigger === opt.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Actions</h2>

        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No actions yet. Add your first action below.
          </p>
        )}

        {actions.map((action, index) => {
          const cfg = actionConfig[action.type];
          const Icon = cfg.icon;
          return (
            <div key={action.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", cfg.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                {index < actions.length - 1 && <div className="w-px h-6 bg-border my-1" />}
              </div>
              <div className="flex-1 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                  <button
                    onClick={() => removeAction(action.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={action.config}
                  onChange={(e) =>
                    setActions((prev) =>
                      prev.map((a) => (a.id === action.id ? { ...a, config: e.target.value } : a)),
                    )
                  }
                  placeholder="Configure this action..."
                  className="mt-2 h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
            </div>
          );
        })}

        {/* Add action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(Object.entries(actionConfig) as [ActionType, typeof actionConfig[ActionType]][]).map(
            ([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => addAction(type)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
