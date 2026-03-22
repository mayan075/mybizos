"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Brain,
  Save,
  Trash2,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StepType = "send_email" | "send_sms" | "wait" | "add_tag" | "ai_decision";

interface SequenceStep {
  id: string;
  type: StepType;
  label: string;
  config: string;
}

const stepTypeConfig: Record<StepType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  ai_decision: { label: "AI Decision", icon: Brain, className: "bg-info/10 text-info" },
};

export default function NewSequencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("contact_created");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addStep(type: StepType) {
    const cfg = stepTypeConfig[type];
    const step: SequenceStep = {
      id: `step-${Date.now()}`,
      type,
      label: cfg.label,
      config: "",
    };
    setSteps((prev) => [...prev, step]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSave() {
    if (!name.trim()) {
      showToast("Please enter a sequence name");
      return;
    }
    showToast("Sequence created successfully");
    setTimeout(() => router.push("/dashboard/sequences"), 1500);
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
            href="/dashboard/sequences"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Sequence</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build an automated multi-step follow-up workflow
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
          Save Sequence
        </button>
      </div>

      {/* Basic info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Details</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sequence Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., New Lead Follow-Up"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this sequence does..."
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Trigger</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            <option value="contact_created">Contact Created</option>
            <option value="deal_stage_changed">Deal Stage Changed</option>
            <option value="appointment_completed">Appointment Completed</option>
            <option value="manual">Manual Enrollment</option>
          </select>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Steps</h2>

        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No steps yet. Add your first step below.
          </p>
        )}

        {steps.map((step, index) => {
          const cfg = stepTypeConfig[step.type];
          const Icon = cfg.icon;
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", cfg.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                {index < steps.length - 1 && <div className="w-px h-6 bg-border my-1" />}
              </div>
              <div className="flex-1 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                  <button
                    onClick={() => removeStep(step.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={step.config}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s) => (s.id === step.id ? { ...s, config: e.target.value } : s)),
                    )
                  }
                  placeholder="Configure this step..."
                  className="mt-2 h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
            </div>
          );
        })}

        {/* Add step buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(Object.entries(stepTypeConfig) as [StepType, typeof stepTypeConfig[StepType]][]).map(
            ([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => addStep(type)}
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
