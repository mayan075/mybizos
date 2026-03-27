"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  FileText,
  Hash,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSequence,
  useUpdateSequence,
  useActivateSequence,
  useDeactivateSequence,
} from "@/lib/hooks/use-sequences";
import type { SequenceStep as ApiSequenceStep } from "@/lib/hooks/use-sequences";

// ── Types ──

type TriggerType = "contact_created" | "deal_stage_changed" | "appointment_completed" | "manual" | "tag_added" | "form_submitted";
type StepType = "send_email" | "send_sms" | "wait" | "add_tag" | "remove_tag" | "ai_decision";

interface UiSequenceStep {
  id: string;
  type: StepType;
  label: string;
  config: string;
}

// ── Config ──

const triggerConfig: Record<TriggerType, { label: string; icon: React.ElementType; className: string }> = {
  contact_created: { label: "Contact Created", icon: UserPlus, className: "bg-success/10 text-success" },
  deal_stage_changed: { label: "Deal Stage Changed", icon: Zap, className: "bg-info/10 text-info" },
  appointment_completed: { label: "Appointment Completed", icon: CalendarCheck, className: "bg-primary/10 text-primary" },
  manual: { label: "Manual", icon: RotateCcw, className: "bg-muted text-muted-foreground" },
  tag_added: { label: "Tag Added", icon: Tag, className: "bg-warning/10 text-warning" },
  form_submitted: { label: "Form Submitted", icon: FileText, className: "bg-accent text-accent-foreground" },
};

const stepTypeConfig: Record<StepType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  remove_tag: { label: "Remove Tag", icon: Hash, className: "bg-muted text-muted-foreground" },
  ai_decision: { label: "AI Decision", icon: Brain, className: "bg-info/10 text-info" },
};

const stepTypes: StepType[] = ["send_email", "send_sms", "wait", "add_tag", "remove_tag", "ai_decision"];

// ── Helpers ──

/** Convert API step to UI step format */
function toUiStep(apiStep: ApiSequenceStep, index: number): UiSequenceStep {
  const cfg = apiStep.config;
  let label = stepTypeConfig[apiStep.type]?.label ?? apiStep.type;
  let config = "";

  switch (apiStep.type) {
    case "send_email":
      label = (cfg.subject as string) || label;
      config = (cfg.body as string) || (cfg.body_html as string) || "";
      break;
    case "send_sms":
      config = (cfg.body as string) || "";
      break;
    case "wait": {
      const hours = (cfg.delay_hours as number) || 24;
      if (hours >= 24) {
        const days = Math.round(hours / 24);
        label = `Wait ${days} day${days === 1 ? "" : "s"}`;
        config = `Delay: ${days} day${days === 1 ? "" : "s"}`;
      } else {
        label = `Wait ${hours} hour${hours === 1 ? "" : "s"}`;
        config = `Delay: ${hours} hour${hours === 1 ? "" : "s"}`;
      }
      break;
    }
    case "add_tag":
    case "remove_tag":
      label = `${apiStep.type === "add_tag" ? "Add" : "Remove"} Tag: ${(cfg.tag as string) || ""}`;
      config = `Tag: ${(cfg.tag as string) || ""}`;
      break;
    case "ai_decision":
      config = (cfg.prompt as string) || "";
      break;
  }

  return {
    id: `step-${index}-${Date.now()}`,
    type: apiStep.type,
    label,
    config,
  };
}

/** Convert UI step to API step format */
function toApiStep(uiStep: UiSequenceStep): ApiSequenceStep {
  const config: Record<string, unknown> = {};
  const raw = uiStep.config.trim();

  switch (uiStep.type) {
    case "send_email":
      config.subject = uiStep.label;
      config.body = raw;
      break;
    case "send_sms":
      config.body = raw;
      break;
    case "wait": {
      const match = raw.match(/(\d+)/);
      const isHours = /hour/i.test(raw);
      if (match) {
        config.delay_hours = isHours ? parseInt(match[1], 10) : parseInt(match[1], 10) * 24;
      } else {
        config.delay_hours = 24;
      }
      break;
    }
    case "add_tag":
    case "remove_tag":
      config.tag = raw.replace(/^Tag:\s*/i, "");
      break;
    case "ai_decision":
      config.prompt = raw;
      break;
  }

  return { type: uiStep.type, config };
}

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
  step: UiSequenceStep;
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

  // API hooks
  const { data: apiSequence, isLoading, refetch } = useSequence(sequenceId);
  const { mutate: updateSequence, isLoading: isUpdating } = useUpdateSequence(sequenceId);
  const { mutate: activateSequence, isLoading: isActivating } = useActivateSequence(sequenceId);
  const { mutate: deactivateSequence, isLoading: isDeactivating } = useDeactivateSequence(sequenceId);

  // Local editing state
  const [steps, setSteps] = useState<UiSequenceStep[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editConfig, setEditConfig] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync API data into local state when it arrives
  useEffect(() => {
    if (apiSequence) {
      setSteps(apiSequence.steps.map((s, i) => toUiStep(s, i)));
      setIsActive(apiSequence.isActive);
      setHasUnsavedChanges(false);
    }
  }, [apiSequence]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/sequences"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sequences
        </Link>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!apiSequence) {
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

  const triggerType = apiSequence.triggerType as TriggerType;
  const triggerCfg = triggerConfig[triggerType] ?? triggerConfig.manual;
  const TriggerIcon = triggerCfg.icon;
  const triggerDetail = apiSequence.triggerConfig
    ? ((apiSequence.triggerConfig.tag as string) || (apiSequence.triggerConfig.stage as string) || null)
    : null;

  async function toggleActive() {
    if (isActive) {
      const result = await deactivateSequence(undefined as never);
      if (result) {
        setIsActive(false);
        showToast("Sequence deactivated");
        refetch();
      } else {
        showToast("Failed to deactivate sequence", "error");
      }
    } else {
      const result = await activateSequence(undefined as never);
      if (result) {
        setIsActive(true);
        showToast("Sequence activated");
        refetch();
      } else {
        showToast("Failed to activate sequence", "error");
      }
    }
  }

  function startEdit(step: UiSequenceStep) {
    setEditingStepId(step.id);
    setEditLabel(step.label);
    setEditConfig(step.config);
  }

  function saveEdit() {
    if (!editingStepId) return;
    setSteps((prev) =>
      prev.map((s) =>
        s.id === editingStepId ? { ...s, label: editLabel, config: editConfig } : s,
      ),
    );
    setEditingStepId(null);
    setHasUnsavedChanges(true);
  }

  function cancelEdit() {
    setEditingStepId(null);
  }

  function deleteStep(stepId: string) {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setHasUnsavedChanges(true);
  }

  function addStep(afterIndex: number, type: StepType) {
    const cfg = stepTypeConfig[type];
    const newStep: UiSequenceStep = {
      id: `new-${Date.now()}`,
      type,
      label: cfg.label,
      config: type === "wait" ? "Delay: 1 day" : type === "add_tag" ? "Tag: " : "",
    };
    setSteps((prev) => {
      const newSteps = [...prev];
      newSteps.splice(afterIndex + 1, 0, newStep);
      return newSteps;
    });
    setHasUnsavedChanges(true);
  }

  async function handleSaveChanges() {
    const apiSteps = steps.map(toApiStep);
    const result = await updateSequence({ steps: apiSteps });
    if (result) {
      showToast("Changes saved successfully");
      setHasUnsavedChanges(false);
      refetch();
    } else {
      showToast("Failed to save changes", "error");
    }
  }

  const isToggling = isActivating || isDeactivating;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
          toast.type === "error" ? "bg-destructive" : "bg-success",
        )}>
          {toast.message}
        </div>
      )}

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
          <h1 className="text-2xl font-bold text-foreground">{apiSequence.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{apiSequence.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              triggerCfg.className,
            )}>
              <TriggerIcon className="h-3 w-3" />
              {triggerCfg.label}
              {triggerDetail && (
                <span className="opacity-70">&middot; {triggerDetail}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              {steps.length} steps
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {apiSequence.enrolledCount} enrolled
            </span>
          </div>
        </div>

        {/* Active toggle + Save */}
        <div className="flex items-center gap-3 shrink-0">
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveChanges}
              disabled={isUpdating}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-4",
                "bg-primary text-primary-foreground text-sm font-medium",
                "hover:bg-primary/90 transition-colors",
                isUpdating && "opacity-50 cursor-not-allowed",
              )}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          )}
          <button
            onClick={toggleActive}
            disabled={isToggling}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isActive ? "bg-primary" : "bg-muted",
              isToggling && "opacity-50 cursor-not-allowed",
            )}
            role="switch"
            aria-checked={isActive}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                isActive ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
          <span className={cn(
            "text-sm font-medium",
            isActive ? "text-success" : "text-muted-foreground",
          )}>
            {isToggling ? "..." : isActive ? "Active" : "Inactive"}
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
                {triggerDetail && ` \u2014 ${triggerDetail}`}
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
          {steps.map((step, index) => (
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
              {index < steps.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
            </div>
          ))}

          {/* End marker */}
          {steps.length > 0 && (
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
