"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  X,
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Brain,
  ClipboardList,
  Bell,
  UserPlus,
  CalendarX,
  Star,
  Cake,
  AlertTriangle,
  ChevronDown,
  Settings2,
  TestTube,
  Activity,
  GripVertical,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

type NodeType =
  | "trigger"
  | "send_email"
  | "send_sms"
  | "wait"
  | "add_tag"
  | "ai_decision"
  | "create_task"
  | "notify_owner";

type TriggerType =
  | "contact_created"
  | "deal_stage_changed"
  | "appointment_completed"
  | "appointment_noshow"
  | "tag_added"
  | "form_submitted"
  | "contact_birthday"
  | "deal_stale";

interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, string | number | boolean>;
  branches?: { label: string; nodes: WorkflowNode[] }[];
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  runCount: number;
  lastRun: string | null;
  nodes: WorkflowNode[];
}

// ── Node Configuration ──

const nodeTypeConfig: Record<
  NodeType,
  {
    label: string;
    icon: React.ElementType;
    accentColor: string;
    bgColor: string;
    iconBg: string;
  }
> = {
  trigger: {
    label: "Trigger",
    icon: Zap,
    accentColor: "border-l-emerald-500",
    bgColor: "bg-emerald-500/5",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  send_email: {
    label: "Send Email",
    icon: Mail,
    accentColor: "border-l-blue-500",
    bgColor: "bg-blue-500/5",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  send_sms: {
    label: "Send SMS",
    icon: MessageSquare,
    accentColor: "border-l-purple-500",
    bgColor: "bg-purple-500/5",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
  wait: {
    label: "Wait",
    icon: Clock,
    accentColor: "border-l-gray-400",
    bgColor: "bg-gray-500/5",
    iconBg: "bg-gray-500/10 text-gray-500",
  },
  add_tag: {
    label: "Add Tag",
    icon: Tag,
    accentColor: "border-l-orange-500",
    bgColor: "bg-orange-500/5",
    iconBg: "bg-orange-500/10 text-orange-600",
  },
  ai_decision: {
    label: "AI Decision",
    icon: Brain,
    accentColor: "border-l-yellow-500",
    bgColor: "bg-yellow-500/5",
    iconBg: "bg-yellow-500/10 text-yellow-600",
  },
  create_task: {
    label: "Create Task",
    icon: ClipboardList,
    accentColor: "border-l-teal-500",
    bgColor: "bg-teal-500/5",
    iconBg: "bg-teal-500/10 text-teal-600",
  },
  notify_owner: {
    label: "Notify Owner",
    icon: Bell,
    accentColor: "border-l-red-500",
    bgColor: "bg-red-500/5",
    iconBg: "bg-red-500/10 text-red-600",
  },
};

const triggerLabels: Record<TriggerType, string> = {
  contact_created: "New contact is created",
  deal_stage_changed: "Deal moves to a new stage",
  appointment_completed: "Appointment is completed",
  appointment_noshow: "Appointment is marked no-show",
  tag_added: "A tag is added to contact",
  form_submitted: "A form is submitted",
  contact_birthday: "It's a contact's birthday",
  deal_stale: "Deal stays in stage > 7 days",
};

// ── Mock Workflows ──

const mockWorkflows: Record<string, Workflow> = {
  "auto-1": {
    id: "auto-1",
    name: "Speed to Lead",
    active: true,
    runCount: 847,
    lastRun: "2026-03-22T09:15:00Z",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        config: { triggerType: "contact_created" },
      },
      {
        id: "node-2",
        type: "send_sms",
        config: {
          message:
            "Hi {{contact.firstName}}! Thanks for reaching out to Acme HVAC. We got your info and someone will be in touch within the hour. Reply STOP to opt out.",
          delay: 60,
        },
      },
      {
        id: "node-3",
        type: "create_task",
        config: {
          title: "Follow up with new lead: {{contact.firstName}} {{contact.lastName}}",
          assignTo: "owner",
          dueIn: "1 hour",
        },
      },
    ],
  },
  "auto-2": {
    id: "auto-2",
    name: "No-Show Follow-Up",
    active: true,
    runCount: 213,
    lastRun: "2026-03-21T16:30:00Z",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        config: { triggerType: "appointment_noshow" },
      },
      {
        id: "node-2",
        type: "wait",
        config: { duration: 1, unit: "hours" },
      },
      {
        id: "node-3",
        type: "send_sms",
        config: {
          message:
            "Hi {{contact.firstName}}, we missed you today! Life happens. Would you like to reschedule? Reply YES and we'll find a time that works.",
        },
      },
      {
        id: "node-4",
        type: "wait",
        config: { duration: 24, unit: "hours" },
      },
      {
        id: "node-5",
        type: "send_email",
        config: {
          subject: "Let's reschedule your appointment",
          body: "We noticed you couldn't make it to your appointment. Click below to pick a new time that works for you.",
        },
      },
    ],
  },
  "auto-3": {
    id: "auto-3",
    name: "Post-Job Review Request",
    active: true,
    runCount: 392,
    lastRun: "2026-03-22T08:00:00Z",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        config: { triggerType: "appointment_completed" },
      },
      {
        id: "node-2",
        type: "wait",
        config: { duration: 24, unit: "hours" },
      },
      {
        id: "node-3",
        type: "send_sms",
        config: {
          message:
            "Hi {{contact.firstName}}! Thanks for choosing Acme HVAC. We'd love your feedback — it takes 30 seconds: {{review.link}}",
        },
      },
      {
        id: "node-4",
        type: "ai_decision",
        config: {
          condition: "Has the contact left a review within 3 days?",
          yesBranch: "End workflow",
          noBranch: "Continue to email follow-up",
        },
      },
      {
        id: "node-5",
        type: "send_email",
        config: {
          subject: "We'd love to hear from you!",
          body: "Your opinion matters to us. Please take a moment to share your experience.",
        },
      },
    ],
  },
  "auto-4": {
    id: "auto-4",
    name: "Birthday Outreach",
    active: false,
    runCount: 56,
    lastRun: "2026-03-18T07:00:00Z",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        config: { triggerType: "contact_birthday" },
      },
      {
        id: "node-2",
        type: "send_sms",
        config: {
          message:
            "Happy Birthday, {{contact.firstName}}! 🎂 As a gift from Acme HVAC, here's 15% off your next service. Use code BDAY15. Have a great day!",
        },
      },
    ],
  },
  "auto-5": {
    id: "auto-5",
    name: "Stale Deal Alert",
    active: true,
    runCount: 134,
    lastRun: "2026-03-22T06:00:00Z",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        config: { triggerType: "deal_stale" },
      },
      {
        id: "node-2",
        type: "notify_owner",
        config: {
          message:
            "Deal \"{{deal.title}}\" has been in {{deal.stage}} for over 7 days. Time to follow up or update the stage.",
        },
      },
    ],
  },
};

// ── Helpers ──

function getNodeDescription(node: WorkflowNode): string {
  switch (node.type) {
    case "trigger": {
      const tt = node.config.triggerType as TriggerType;
      return triggerLabels[tt] ?? "Unknown trigger";
    }
    case "send_email":
      return `Subject: ${node.config.subject ?? "No subject"}`;
    case "send_sms": {
      const msg = String(node.config.message ?? "");
      return msg.length > 60 ? msg.slice(0, 60) + "..." : msg;
    }
    case "wait":
      return `Wait ${node.config.duration} ${node.config.unit}`;
    case "add_tag":
      return `Add tag: ${node.config.tagName ?? "Unset"}`;
    case "ai_decision":
      return `AI evaluates: ${node.config.condition ?? "Unset"}`;
    case "create_task":
      return String(node.config.title ?? "Create task");
    case "notify_owner":
      return String(node.config.message ?? "Send notification");
    default:
      return "Unknown step";
  }
}

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Add Step Menu ──

function AddStepButton({
  onAdd,
  visible,
}: {
  onAdd: (type: NodeType) => void;
  visible: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const options: { type: NodeType; label: string; icon: React.ElementType }[] =
    [
      { type: "send_email", label: "Send Email", icon: Mail },
      { type: "send_sms", label: "Send SMS", icon: MessageSquare },
      { type: "wait", label: "Wait / Delay", icon: Clock },
      { type: "add_tag", label: "Add Tag", icon: Tag },
      { type: "ai_decision", label: "AI Decision", icon: Brain },
      { type: "create_task", label: "Create Task", icon: ClipboardList },
      { type: "notify_owner", label: "Notify Owner", icon: Bell },
    ];

  return (
    <div className="relative flex flex-col items-center">
      {/* Connecting line */}
      <div className="w-px h-4 bg-border" />

      {/* Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 transition-all duration-200",
          "hover:border-primary hover:text-primary hover:bg-primary/5 hover:scale-110",
          visible || menuOpen
            ? "opacity-100"
            : "opacity-0 group-hover/flow:opacity-100",
        )}
        title="Add step"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full mt-1 z-50 w-56 rounded-xl border border-border bg-card shadow-lg py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Add Step
            </p>
            {options.map((opt) => {
              const cfg = nodeTypeConfig[opt.type];
              return (
                <button
                  key={opt.type}
                  onClick={() => {
                    onAdd(opt.type);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      cfg.iconBg,
                    )}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Connecting line */}
      <div className="w-px h-4 bg-border" />
    </div>
  );
}

// ── Workflow Node Component ──

function WorkflowNodeCard({
  node,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  node: WorkflowNode;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const cfg = nodeTypeConfig[node.type];
  const Icon = cfg.icon;
  const description = getNodeDescription(node);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group/node relative w-full max-w-md cursor-pointer rounded-xl border-l-4 border border-border bg-card transition-all duration-200",
        cfg.accentColor,
        isSelected
          ? "ring-2 ring-primary shadow-md border-primary/30"
          : "hover:shadow-md hover:border-primary/20",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200",
              cfg.iconBg,
              isSelected && "scale-110",
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {node.type === "trigger" ? "Trigger" : `Step ${index}`}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground mt-0.5">
              {cfg.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>

            {/* AI Decision branches */}
            {node.type === "ai_decision" && (
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <Check className="h-2.5 w-2.5" />
                  Yes
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                  <X className="h-2.5 w-2.5" />
                  No
                </span>
              </div>
            )}
          </div>

          {/* Delete button (not for trigger) */}
          {node.type !== "trigger" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/node:opacity-100"
              title="Remove step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Config Panel ──

function ConfigPanel({
  node,
  onClose,
  onUpdate,
}: {
  node: WorkflowNode;
  onClose: () => void;
  onUpdate: (updated: WorkflowNode) => void;
}) {
  const cfg = nodeTypeConfig[node.type];
  const Icon = cfg.icon;

  function updateConfig(key: string, value: string | number | boolean) {
    onUpdate({
      ...node,
      config: { ...node.config, [key]: value },
    });
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              cfg.iconBg,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {cfg.label}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Configure step
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {node.type === "trigger" && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Trigger Type
            </label>
            <select
              value={String(node.config.triggerType ?? "")}
              onChange={(e) => updateConfig("triggerType", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(triggerLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {node.type === "send_email" && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Subject Line
              </label>
              <input
                value={String(node.config.subject ?? "")}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Enter email subject..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Email Body
              </label>
              <textarea
                value={String(node.config.body ?? "")}
                onChange={(e) => updateConfig("body", e.target.value)}
                placeholder="Write your email content..."
                rows={6}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Use {"{{contact.firstName}}"}, {"{{contact.email}}"} for merge
                fields
              </p>
            </div>
          </>
        )}

        {node.type === "send_sms" && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              SMS Message
            </label>
            <textarea
              value={String(node.config.message ?? "")}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder="Type your SMS message..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">
                Use {"{{contact.firstName}}"} for merge fields
              </p>
              <p className="text-[10px] text-muted-foreground">
                {String(node.config.message ?? "").length}/160
              </p>
            </div>
          </div>
        )}

        {node.type === "wait" && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Duration
              </label>
              <input
                type="number"
                value={Number(node.config.duration ?? 1)}
                onChange={(e) =>
                  updateConfig("duration", parseInt(e.target.value, 10) || 1)
                }
                min={1}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Unit
              </label>
              <select
                value={String(node.config.unit ?? "hours")}
                onChange={(e) => updateConfig("unit", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        {node.type === "add_tag" && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Tag Name
            </label>
            <input
              value={String(node.config.tagName ?? "")}
              onChange={(e) => updateConfig("tagName", e.target.value)}
              placeholder="Enter tag name..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {node.type === "ai_decision" && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                AI Condition
              </label>
              <textarea
                value={String(node.config.condition ?? "")}
                onChange={(e) => updateConfig("condition", e.target.value)}
                placeholder="Describe the condition AI should evaluate..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                AI will evaluate this and branch Yes or No
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                If Yes
              </label>
              <input
                value={String(node.config.yesBranch ?? "")}
                onChange={(e) => updateConfig("yesBranch", e.target.value)}
                placeholder="Action when condition is true..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                If No
              </label>
              <input
                value={String(node.config.noBranch ?? "")}
                onChange={(e) => updateConfig("noBranch", e.target.value)}
                placeholder="Action when condition is false..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {node.type === "create_task" && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Task Title
              </label>
              <input
                value={String(node.config.title ?? "")}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Enter task title..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Assign To
              </label>
              <select
                value={String(node.config.assignTo ?? "owner")}
                onChange={(e) => updateConfig("assignTo", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="owner">Account Owner</option>
                <option value="assigned">Assigned Team Member</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Due In
              </label>
              <input
                value={String(node.config.dueIn ?? "")}
                onChange={(e) => updateConfig("dueIn", e.target.value)}
                placeholder="e.g., 1 hour, 24 hours, 3 days"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {node.type === "notify_owner" && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Notification Message
            </label>
            <textarea
              value={String(node.config.message ?? "")}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder="Enter notification message..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use {"{{deal.title}}"}, {"{{deal.stage}}"} for merge fields
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  );
}

// ── Page ──

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const initialWorkflow = mockWorkflows[workflowId] ?? {
    id: workflowId,
    name: "New Automation",
    active: false,
    runCount: 0,
    lastRun: null,
    nodes: [
      {
        id: "node-1",
        type: "trigger" as NodeType,
        config: { triggerType: "contact_created" },
      },
    ],
  };

  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(workflow.name);
  const [showTestToast, setShowTestToast] = useState(false);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleToggleActive = useCallback(() => {
    setWorkflow((prev) => ({ ...prev, active: !prev.active }));
  }, []);

  const handleAddStep = useCallback(
    (afterIndex: number, type: NodeType) => {
      const newNode: WorkflowNode = {
        id: generateId(),
        type,
        config: getDefaultConfig(type),
      };
      setWorkflow((prev) => {
        const newNodes = [...prev.nodes];
        newNodes.splice(afterIndex + 1, 0, newNode);
        return { ...prev, nodes: newNodes };
      });
      setSelectedNodeId(newNode.id);
    },
    [],
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
    }));
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  const handleUpdateNode = useCallback((updated: WorkflowNode) => {
    setWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  }, []);

  const handleSaveName = useCallback(() => {
    if (nameInput.trim()) {
      setWorkflow((prev) => ({ ...prev, name: nameInput.trim() }));
    }
    setEditingName(false);
  }, [nameInput]);

  const handleTest = useCallback(() => {
    setShowTestToast(true);
    setTimeout(() => setShowTestToast(false), 3000);
  }, []);

  return (
    <div className="relative h-full flex flex-col -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/automations")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Editable name */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameInput(workflow.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="h-8 rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(workflow.name);
                setEditingName(true);
              }}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {workflow.name}
            </button>
          )}

          {/* Active/Inactive badge */}
          <button
            onClick={handleToggleActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
              workflow.active
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {workflow.active ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Active
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                Inactive
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 mr-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span className="font-medium">
                {workflow.runCount.toLocaleString()}
              </span>{" "}
              runs
            </div>
            {workflow.lastRun && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Last run:{" "}
                <span className="font-medium">
                  {new Date(workflow.lastRun).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleTest}
            className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <TestTube className="h-3.5 w-3.5" />
            Test Workflow
          </button>
        </div>
      </div>

      {/* Workflow canvas */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="group/flow flex flex-col items-center py-10 px-4 min-h-full">
          {/* Start marker */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <Play className="h-3.5 w-3.5 ml-0.5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Start
            </span>
          </div>
          <div className="w-px h-4 bg-emerald-500/40" />

          {/* Nodes */}
          {workflow.nodes.map((node, index) => (
            <div key={node.id} className="flex flex-col items-center w-full max-w-md">
              {/* Connecting line from previous */}
              {index > 0 && <div className="w-px h-2 bg-border" />}

              <WorkflowNodeCard
                node={node}
                index={index}
                isSelected={selectedNodeId === node.id}
                onSelect={() =>
                  setSelectedNodeId(
                    selectedNodeId === node.id ? null : node.id,
                  )
                }
                onDelete={() => handleDeleteNode(node.id)}
              />

              {/* Add step button between nodes */}
              <AddStepButton
                onAdd={(type) => handleAddStep(index, type)}
                visible={false}
              />
            </div>
          ))}

          {/* End marker */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-dashed border-muted-foreground/30">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              End
            </span>
          </div>

          {/* Spacer for scroll */}
          <div className="h-20" />
        </div>
      </div>

      {/* Config panel (slides in from right) */}
      {selectedNode && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 animate-in fade-in duration-150"
            onClick={() => setSelectedNodeId(null)}
          />
          <ConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleUpdateNode}
          />
        </>
      )}

      {/* Test toast */}
      {showTestToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <TestTube className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Workflow test started
              </p>
              <p className="text-xs text-muted-foreground">
                Running with sample data...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default Configs ──

function getDefaultConfig(
  type: NodeType,
): Record<string, string | number | boolean> {
  switch (type) {
    case "trigger":
      return { triggerType: "contact_created" };
    case "send_email":
      return { subject: "", body: "" };
    case "send_sms":
      return { message: "" };
    case "wait":
      return { duration: 1, unit: "hours" };
    case "add_tag":
      return { tagName: "" };
    case "ai_decision":
      return { condition: "", yesBranch: "", noBranch: "" };
    case "create_task":
      return { title: "", assignTo: "owner", dueIn: "24 hours" };
    case "notify_owner":
      return { message: "" };
    default:
      return {};
  }
}
