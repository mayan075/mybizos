"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Brain,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  GitBranch,
  Users,
  Zap,
  RotateCcw,
  CalendarCheck,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

type TriggerType = "contact_created" | "deal_stage_changed" | "appointment_completed" | "manual";
type StepType = "send_email" | "send_sms" | "wait" | "add_tag" | "ai_decision";

interface SequenceStep {
  id: string;
  type: StepType;
  label: string;
  config: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  triggerDetail: string | null;
  steps: SequenceStep[];
  enrolledCount: number;
  active: boolean;
}

// ── Mock Data ──

const allSequences: Record<string, Sequence> = {
  "seq-1": {
    id: "seq-1",
    name: "New Lead Follow-Up",
    description: "Automatically nurture new leads with a 7-touch sequence over 14 days.",
    trigger: "contact_created",
    triggerDetail: null,
    steps: [
      { id: "s1-1", type: "send_email", label: "Welcome Email", config: "Subject: Welcome to {{business_name}}!" },
      { id: "s1-2", type: "wait", label: "Wait 1 day", config: "Delay: 1 day" },
      { id: "s1-3", type: "send_sms", label: "Quick Intro SMS", config: "Hi {{first_name}}, thanks for reaching out..." },
      { id: "s1-4", type: "wait", label: "Wait 2 days", config: "Delay: 2 days" },
      { id: "s1-5", type: "ai_decision", label: "Check Engagement", config: "If opened email \u2192 Path A, else \u2192 Path B" },
      { id: "s1-6", type: "send_email", label: "Value Offer Email", config: "Subject: Here\u2019s 10% off your first service" },
      { id: "s1-7", type: "add_tag", label: "Tag as Nurtured", config: "Tag: lead-nurtured" },
    ],
    enrolledCount: 142,
    active: true,
  },
  "seq-2": {
    id: "seq-2",
    name: "Quote Follow-Up",
    description: "Follow up on sent quotes with 5 touches over 10 days.",
    trigger: "deal_stage_changed",
    triggerDetail: "Quoted",
    steps: [
      { id: "s2-1", type: "wait", label: "Wait 1 day", config: "Delay: 1 day" },
      { id: "s2-2", type: "send_email", label: "Quote Recap Email", config: "Subject: Your quote from {{business_name}}" },
      { id: "s2-3", type: "wait", label: "Wait 3 days", config: "Delay: 3 days" },
      { id: "s2-4", type: "send_sms", label: "Gentle Nudge SMS", config: "Hi {{first_name}}, just checking in on your quote..." },
      { id: "s2-5", type: "ai_decision", label: "Check Response", config: "If replied \u2192 Stop, else \u2192 Continue" },
    ],
    enrolledCount: 38,
    active: true,
  },
  "seq-3": {
    id: "seq-3",
    name: "Post-Service Review Request",
    description: "Ask for a review after service completion. 3 touches over 7 days.",
    trigger: "appointment_completed",
    triggerDetail: null,
    steps: [
      { id: "s3-1", type: "wait", label: "Wait 2 hours", config: "Delay: 2 hours" },
      { id: "s3-2", type: "send_sms", label: "Review Request SMS", config: "Thanks for choosing us! Leave a review: {{review_link}}" },
      { id: "s3-3", type: "wait", label: "Wait 3 days", config: "Delay: 3 days" },
    ],
    enrolledCount: 267,
    active: true,
  },
  "seq-4": {
    id: "seq-4",
    name: "Re-engagement",
    description: "Win back inactive customers with a 3-touch campaign over 30 days.",
    trigger: "manual",
    triggerDetail: null,
    steps: [
      { id: "s4-1", type: "send_email", label: "We Miss You Email", config: "Subject: It\u2019s been a while, {{first_name}}!" },
      { id: "s4-2", type: "wait", label: "Wait 14 days", config: "Delay: 14 days" },
      { id: "s4-3", type: "send_sms", label: "Special Offer SMS", config: "We\u2019d love to have you back! Here\u2019s 15% off..." },
    ],
    enrolledCount: 54,
    active: false,
  },
};

// ── Config ──

const triggerConfig: Record<TriggerType, { label: string; icon: React.ElementType; className: string }> = {
  contact_created: { label: "Contact Created", icon: UserPlus, className: "bg-success/10 text-success" },
  deal_stage_changed: { label: "Deal Stage Changed", icon: Zap, className: "bg-info/10 text-info" },
  appointment_completed: { label: "Appointment Completed", icon: CalendarCheck, className: "bg-primary/10 text-primary" },
  manual: { label: "Manual", icon: RotateCcw, className: "bg-muted text-muted-foreground" },
};

const stepTypeConfig: Record<StepType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  ai_decision: { label: "AI Decision", icon: Brain, className: "bg-info/10 text-info" },
};

const stepTypes: StepType[] = ["send_email", "send_sms", "wait", "add_tag", "ai_decision"];

// ── Components ──

function StepCard({
  step,
  onEdit,
  onDelete,
  isEditing,
  onSave,
  onCancel,
  editLabel,
  editConfig,
  onEditLabelChange,
  onEditConfigChange,
}: {
  step: SequenceStep;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  editLabel: string;
  editConfig: string;
  onEditLabelChange: (val: string) => void;
  onEditConfigChange: (val: string) => void;
}) {
  const cfg = stepTypeConfig[step.type];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 transition-all",
      isEditing ? "border-primary shadow-sm" : "border-border hover:border-primary/30",
    )}>
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="flex h-8 w-6 items-center justify-center text-muted-foreground/50 cursor-grab shrink-0 mt-0.5">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Step type icon */}
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", cfg.className)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editLabel}
                onChange={(e) => onEditLabelChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Step label"
              />
              <input
                value={editConfig}
                onChange={(e) => onEditConfigChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Configuration"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={onSave}
                  className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  cfg.className,
                )}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.config}</p>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Edit step"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddStepButton({ onAdd }: { onAdd: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-center py-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Step
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 z-20 rounded-lg border border-border bg-card shadow-lg py-1 min-w-[180px]">
            {stepTypes.map((type) => {
              const cfg = stepTypeConfig[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", cfg.className)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──

export default function SequenceDetailPage() {
  const params = useParams();
  const sequenceId = params.id as string;

  const initialSequence = allSequences[sequenceId];

  const [sequence, setSequence] = useState<Sequence | null>(initialSequence ?? null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editConfig, setEditConfig] = useState("");

  if (!sequence) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/sequences"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sequences
        </Link>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sequence not found</p>
          <p className="text-xs text-muted-foreground">
            This sequence may have been deleted or doesn&apos;t exist yet.
          </p>
        </div>
      </div>
    );
  }

  const triggerCfg = triggerConfig[sequence.trigger];
  const TriggerIcon = triggerCfg.icon;

  function toggleActive() {
    setSequence((prev) => prev ? { ...prev, active: !prev.active } : prev);
  }

  function startEdit(step: SequenceStep) {
    setEditingStepId(step.id);
    setEditLabel(step.label);
    setEditConfig(step.config);
  }

  function saveEdit() {
    if (!editingStepId) return;
    setSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === editingStepId ? { ...s, label: editLabel, config: editConfig } : s,
        ),
      };
    });
    setEditingStepId(null);
  }

  function cancelEdit() {
    setEditingStepId(null);
  }

  function deleteStep(stepId: string) {
    setSequence((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.filter((s) => s.id !== stepId) };
    });
  }

  function addStep(afterIndex: number, type: StepType) {
    const cfg = stepTypeConfig[type];
    const newStep: SequenceStep = {
      id: `new-${Date.now()}`,
      type,
      label: cfg.label,
      config: type === "wait" ? "Delay: 1 day" : type === "add_tag" ? "Tag: " : "",
    };
    setSequence((prev) => {
      if (!prev) return prev;
      const newSteps = [...prev.steps];
      newSteps.splice(afterIndex + 1, 0, newStep);
      return { ...prev, steps: newSteps };
    });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/sequences"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sequences
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{sequence.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{sequence.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              triggerCfg.className,
            )}>
              <TriggerIcon className="h-3 w-3" />
              {triggerCfg.label}
              {sequence.triggerDetail && (
                <span className="opacity-70">&middot; {sequence.triggerDetail}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              {sequence.steps.length} steps
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {sequence.enrolledCount} enrolled
            </span>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleActive}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              sequence.active ? "bg-primary" : "bg-muted",
            )}
            role="switch"
            aria-checked={sequence.active}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                sequence.active ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
          <span className={cn(
            "text-sm font-medium",
            sequence.active ? "text-success" : "text-muted-foreground",
          )}>
            {sequence.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Sequence builder */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Sequence Builder</h2>
        </div>

        <div className="p-5">
          {/* Trigger card */}
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 mb-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", triggerCfg.className)}>
              <TriggerIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trigger</p>
              <p className="text-sm font-medium text-foreground">
                {triggerCfg.label}
                {sequence.triggerDetail && ` \u2014 ${sequence.triggerDetail}`}
              </p>
            </div>
          </div>

          {/* Timeline connector */}
          <div className="flex justify-center py-0.5">
            <div className="w-px h-4 bg-border" />
          </div>

          {/* Add step before first */}
          <AddStepButton onAdd={(type) => addStep(-1, type)} />

          <div className="flex justify-center py-0.5">
            <div className="w-px h-4 bg-border" />
          </div>

          {/* Steps */}
          {sequence.steps.map((step, index) => (
            <div key={step.id}>
              <StepCard
                step={step}
                onEdit={() => startEdit(step)}
                onDelete={() => deleteStep(step.id)}
                isEditing={editingStepId === step.id}
                onSave={saveEdit}
                onCancel={cancelEdit}
                editLabel={editLabel}
                editConfig={editConfig}
                onEditLabelChange={setEditLabel}
                onEditConfigChange={setEditConfig}
              />

              {/* Connector + Add step between */}
              <div className="flex justify-center py-0.5">
                <div className="w-px h-4 bg-border" />
              </div>
              <AddStepButton onAdd={(type) => addStep(index, type)} />
              {index < sequence.steps.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
            </div>
          ))}

          {/* End marker */}
          {sequence.steps.length > 0 && (
            <>
              <div className="flex justify-center py-0.5">
                <div className="w-px h-4 bg-border" />
              </div>
              <div className="flex justify-center">
                <div className="flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Check className="h-3 w-3" />
                  End of Sequence
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
