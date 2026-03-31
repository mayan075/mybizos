"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  GitBranch,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Brain,
  ChevronDown,
  ChevronRight,
  Users,
  Zap,
  RotateCcw,
  CalendarCheck,
  UserPlus,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useSequences, type Sequence, type SequenceStep } from "@/lib/hooks/use-sequences";
import { apiClient } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";

// ── Types ──

type TriggerType = Sequence["triggerType"];

type StepType = SequenceStep["type"];

// ── Helpers ──

const triggerConfigMap: Record<TriggerType, { label: string; icon: React.ElementType; className: string }> = {
  contact_created: {
    label: "Contact Created",
    icon: UserPlus,
    className: "bg-success/10 text-success",
  },
  deal_stage_changed: {
    label: "Deal Stage Changed",
    icon: Zap,
    className: "bg-info/10 text-info",
  },
  appointment_completed: {
    label: "Appointment Completed",
    icon: CalendarCheck,
    className: "bg-primary/10 text-primary",
  },
  manual: {
    label: "Manual",
    icon: RotateCcw,
    className: "bg-muted text-muted-foreground",
  },
  tag_added: {
    label: "Tag Added",
    icon: Tag,
    className: "bg-accent text-accent-foreground",
  },
  form_submitted: {
    label: "Form Submitted",
    icon: FileText,
    className: "bg-warning/10 text-warning",
  },
};

const stepTypeConfig: Record<StepType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  remove_tag: { label: "Remove Tag", icon: Tag, className: "bg-destructive/10 text-destructive" },
  ai_decision: { label: "AI Decision", icon: Brain, className: "bg-info/10 text-info" },
};

function TriggerBadge({ trigger }: { trigger: TriggerType }) {
  const cfg = triggerConfigMap[trigger];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cfg.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StepIcon({ type }: { type: StepType }) {
  const cfg = stepTypeConfig[type];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg",
        cfg.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

// ── Page ──

export default function SequencesPage() {
  usePageTitle("Sequences");
  const { data: sequencesData, isLoading, refetch } = useSequences();
  const sequences = Array.isArray(sequencesData) ? sequencesData : [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toast = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleActive(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const sequence = sequences.find((s) => s.id === id);
    if (!sequence || togglingId) return;

    const newStatus = sequence.isActive ? "paused" : "active";
    setTogglingId(id);

    try {
      const path = buildPath(`/orgs/:orgId/sequences/${id}`);
      if (!path) return;
      await apiClient.patch(path, { status: newStatus });
      toast.success(`Sequence ${newStatus === "active" ? "activated" : "paused"} successfully`);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update sequence";
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated multi-step follow-up workflows
          </p>
        </div>
        <Link
          href="/dashboard/sequences/new"
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Create Sequence
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Sequence cards */}
      {!isLoading && <div className="grid gap-4">
        {sequences.map((sequence) => {
          const isExpanded = expandedId === sequence.id;

          return (
            <div
              key={sequence.id}
              className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {/* Card header */}
              <div
                className="flex items-start gap-4 p-5 cursor-pointer"
                onClick={() => toggleExpanded(sequence.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpanded(sequence.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Expand chevron */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center mt-0.5">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {sequence.name}
                    </h3>
                    <TriggerBadge trigger={sequence.triggerType} />
                  </div>
                  {sequence.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sequence.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
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

                {/* Active toggle + Edit link */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => toggleActive(sequence.id, e)}
                    disabled={togglingId === sequence.id}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      sequence.isActive ? "bg-primary" : "bg-muted",
                      togglingId === sequence.id && "opacity-50 cursor-wait",
                    )}
                    role="switch"
                    aria-checked={sequence.isActive}
                    aria-label={`${sequence.isActive ? "Deactivate" : "Activate"} ${sequence.name}`}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        sequence.isActive ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                  <span className={cn(
                    "text-xs font-medium",
                    sequence.isActive ? "text-success" : "text-muted-foreground",
                  )}>
                    {sequence.isActive ? "Active" : "Inactive"}
                  </span>
                  <Link
                    href={`/dashboard/sequences/${sequence.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>

              {/* Expanded steps detail */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-5 py-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Sequence Steps
                  </p>
                  <div className="space-y-0">
                    {sequence.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <StepIcon type={step.type} />
                          {index < sequence.steps.length - 1 && (
                            <div className="w-px h-6 bg-border my-1" />
                          )}
                        </div>

                        {/* Step content */}
                        <div className="pb-4 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {stepTypeConfig[step.type]?.label ?? step.type}
                          </p>
                          {step.config && Object.keys(step.config).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {Object.values(step.config).filter(v => typeof v === "string").join(" — ") || JSON.stringify(step.config)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sequences.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No sequences yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              No sequences yet. Set up automated follow-ups for your leads.
            </p>
            <Link
              href="/dashboard/sequences/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Sequence
            </Link>
          </div>
        )}
      </div>}
    </div>
  );
}
