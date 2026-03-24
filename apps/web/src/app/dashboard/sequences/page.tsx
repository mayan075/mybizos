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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

// ── Types ──

type TriggerType = "contact_created" | "deal_stage_changed" | "appointment_completed" | "manual";

type StepType = "send_email" | "send_sms" | "wait" | "add_tag" | "ai_decision";

interface SequenceStep {
  id: string;
  type: StepType;
  label: string;
  config: string;
}

interface MockSequence {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  triggerDetail: string | null;
  steps: SequenceStep[];
  enrolledCount: number;
  active: boolean;
}

// Real sequences will come from the API; start with empty array
const mockSequences: MockSequence[] = [];

// ── Helpers ──

const triggerConfig: Record<TriggerType, { label: string; icon: React.ElementType; className: string }> = {
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
};

const stepTypeConfig: Record<StepType, { label: string; icon: React.ElementType; className: string }> = {
  send_email: { label: "Send Email", icon: Mail, className: "bg-primary/10 text-primary" },
  send_sms: { label: "Send SMS", icon: MessageSquare, className: "bg-success/10 text-success" },
  wait: { label: "Wait", icon: Clock, className: "bg-warning/10 text-warning" },
  add_tag: { label: "Add Tag", icon: Tag, className: "bg-accent text-accent-foreground" },
  ai_decision: { label: "AI Decision", icon: Brain, className: "bg-info/10 text-info" },
};

function TriggerBadge({ trigger, detail }: { trigger: TriggerType; detail: string | null }) {
  const cfg = triggerConfig[trigger];
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
      {detail && <span className="opacity-70">&middot; {detail}</span>}
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
  const [sequences, setSequences] = useState(mockSequences);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleActive(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSequences((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    );
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

      {/* Sequence cards */}
      <div className="grid gap-4">
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
                    <TriggerBadge trigger={sequence.trigger} detail={sequence.triggerDetail} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sequence.description}
                  </p>
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
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      sequence.active ? "bg-primary" : "bg-muted",
                    )}
                    role="switch"
                    aria-checked={sequence.active}
                    aria-label={`${sequence.active ? "Deactivate" : "Activate"} ${sequence.name}`}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        sequence.active ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                  <span className={cn(
                    "text-xs font-medium",
                    sequence.active ? "text-success" : "text-muted-foreground",
                  )}>
                    {sequence.active ? "Active" : "Inactive"}
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
                      <div key={step.id} className="flex items-start gap-3">
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
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {step.config}
                          </p>
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
      </div>
    </div>
  );
}
