"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  Mail,
  Phone,
  ChevronDownIcon,
  CheckSquare,
  CircleDot,
  CalendarDays,
  Upload,
  EyeOff,
  Settings2,
  Code,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Save,
  Eye,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "hidden";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  helpText: string;
  options: string[]; // for dropdown, radio, checkbox
}

interface FormSettings {
  name: string;
  submitButtonText: string;
  successMessage: string;
  redirectUrl: string;
  autoCreateContact: boolean;
  autoAddTag: string;
  autoAddToPipeline: string;
  notificationEmail: string;
}

// ── Field Type Config ──

const fieldTypeConfig: Record<
  FieldType,
  { label: string; icon: React.ElementType; description: string }
> = {
  text: {
    label: "Text Input",
    icon: Type,
    description: "Short text field",
  },
  textarea: {
    label: "Textarea",
    icon: AlignLeft,
    description: "Long text field",
  },
  email: {
    label: "Email",
    icon: Mail,
    description: "Email address",
  },
  phone: {
    label: "Phone",
    icon: Phone,
    description: "Phone number",
  },
  dropdown: {
    label: "Dropdown",
    icon: ChevronDownIcon,
    description: "Select from options",
  },
  checkbox: {
    label: "Checkbox",
    icon: CheckSquare,
    description: "Multiple choice",
  },
  radio: {
    label: "Radio Buttons",
    icon: CircleDot,
    description: "Single choice",
  },
  date: {
    label: "Date Picker",
    icon: CalendarDays,
    description: "Date selection",
  },
  file: {
    label: "File Upload",
    icon: Upload,
    description: "File attachment",
  },
  hidden: {
    label: "Hidden Field",
    icon: EyeOff,
    description: "Not visible to user",
  },
};

const fieldTypes = Object.entries(fieldTypeConfig) as [
  FieldType,
  (typeof fieldTypeConfig)[FieldType],
][];

// ── Mock Pre-loaded Form ("Free Quote Request") ──

const initialFields: FormField[] = [
  {
    id: "field-1",
    type: "text",
    label: "Name",
    placeholder: "Your full name",
    required: true,
    helpText: "",
    options: [],
  },
  {
    id: "field-2",
    type: "email",
    label: "Email",
    placeholder: "you@example.com",
    required: true,
    helpText: "",
    options: [],
  },
  {
    id: "field-3",
    type: "phone",
    label: "Phone",
    placeholder: "(555) 000-0000",
    required: true,
    helpText: "We will call you to confirm your appointment",
    options: [],
  },
  {
    id: "field-4",
    type: "dropdown",
    label: "Service Needed",
    placeholder: "Select a service",
    required: true,
    helpText: "",
    options: ["Plumbing", "HVAC", "Electrical", "Other"],
  },
  {
    id: "field-5",
    type: "date",
    label: "Preferred Date",
    placeholder: "Select a date",
    required: false,
    helpText: "We will do our best to accommodate your preferred date",
    options: [],
  },
  {
    id: "field-6",
    type: "textarea",
    label: "Describe Your Issue",
    placeholder: "Tell us about the problem you are experiencing...",
    required: false,
    helpText: "",
    options: [],
  },
];

const initialSettings: FormSettings = {
  name: "Free Quote Request",
  submitButtonText: "Request Free Quote",
  successMessage:
    "Thank you! We have received your request and will get back to you within 24 hours.",
  redirectUrl: "",
  autoCreateContact: true,
  autoAddTag: "quote-request",
  autoAddToPipeline: "new-leads",
  notificationEmail: "john@acmehvac.com",
};

// ── Helpers ──

let fieldCounter = 7;
function generateFieldId(): string {
  return `field-${fieldCounter++}`;
}

function createNewField(type: FieldType): FormField {
  const cfg = fieldTypeConfig[type];
  const needsOptions = type === "dropdown" || type === "radio" || type === "checkbox";
  return {
    id: generateFieldId(),
    type,
    label: cfg.label,
    placeholder: "",
    required: false,
    helpText: "",
    options: needsOptions ? ["Option 1", "Option 2"] : [],
  };
}

// ── Components ──

function FieldPalette({
  onAddField,
}: {
  onAddField: (type: FieldType) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
        Drag or click to add
      </p>
      {fieldTypes.map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type}
            onClick={() => onAddField(type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("fieldType", type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3",
              "hover:border-primary/40 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing",
              "text-left group",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {cfg.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {cfg.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FieldEditor({
  field,
  onUpdate,
  onClose,
}: {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onClose: () => void;
}) {
  const needsOptions =
    field.type === "dropdown" ||
    field.type === "radio" ||
    field.type === "checkbox";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Edit Field</p>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Label
          </label>
          <input
            value={field.label}
            onChange={(e) => onUpdate({ ...field, label: e.target.value })}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Placeholder
          </label>
          <input
            value={field.placeholder}
            onChange={(e) =>
              onUpdate({ ...field, placeholder: e.target.value })
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Help Text
          </label>
          <input
            value={field.helpText}
            onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
            placeholder="Optional help text below the field"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Required
          </label>
          <button
            onClick={() => onUpdate({ ...field, required: !field.required })}
            className="text-primary"
          >
            {field.required ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        </div>

        {needsOptions && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Options
            </label>
            <div className="space-y-2">
              {field.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...field.options];
                      newOptions[idx] = e.target.value;
                      onUpdate({ ...field, options: newOptions });
                    }}
                    className="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <button
                    onClick={() => {
                      const newOptions = field.options.filter(
                        (_, i) => i !== idx,
                      );
                      onUpdate({ ...field, options: newOptions });
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  onUpdate({
                    ...field,
                    options: [
                      ...field.options,
                      `Option ${field.options.length + 1}`,
                    ],
                  })
                }
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add option
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormPreviewField({
  field,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const cfg = fieldTypeConfig[field.type];
  const Icon = cfg.icon;

  const renderInput = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <input
            type={field.type === "phone" ? "tel" : field.type}
            placeholder={field.placeholder}
            disabled
            className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed"
          />
        );
      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder}
            disabled
            rows={3}
            className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed resize-none"
          />
        );
      case "dropdown":
        return (
          <div className="relative">
            <select
              disabled
              className="h-10 w-full appearance-none rounded-lg border border-input bg-muted/50 px-3 pr-8 text-sm text-muted-foreground cursor-not-allowed"
            >
              <option>{field.placeholder || "Select..."}</option>
              {field.options.map((opt, i) => (
                <option key={i}>{opt}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        );
      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="h-4 w-4 rounded border border-input bg-muted/50" />
                {opt}
              </label>
            ))}
          </div>
        );
      case "radio":
        return (
          <div className="space-y-2">
            {field.options.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="h-4 w-4 rounded-full border border-input bg-muted/50" />
                {opt}
              </label>
            ))}
          </div>
        );
      case "date":
        return (
          <input
            type="date"
            disabled
            className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        );
      case "file":
        return (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30">
            <div className="text-center">
              <Upload className="mx-auto h-5 w-5 text-muted-foreground/50 mb-1" />
              <p className="text-xs text-muted-foreground">
                Drag file or click to upload
              </p>
            </div>
          </div>
        );
      case "hidden":
        return (
          <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/20 px-3">
            <p className="text-xs text-muted-foreground italic">
              Hidden field (not visible to users)
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative rounded-lg border p-4 transition-all cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "absolute -right-2 top-2 flex flex-col gap-0.5 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={isFirst}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors",
            isFirst
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-muted hover:text-foreground",
          )}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={isLast}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors",
            isLast
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-muted hover:text-foreground",
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Field type indicator */}
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {cfg.label}
        </span>
      </div>

      {/* Label */}
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {/* Field preview */}
      {renderInput()}

      {/* Help text */}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {field.helpText}
        </p>
      )}
    </div>
  );
}

function FormSettingsPanel({
  settings,
  onUpdate,
}: {
  settings: FormSettings;
  onUpdate: (settings: FormSettings) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Form Settings
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Form Name
            </label>
            <input
              value={settings.name}
              onChange={(e) => onUpdate({ ...settings, name: e.target.value })}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Submit Button Text
            </label>
            <input
              value={settings.submitButtonText}
              onChange={(e) =>
                onUpdate({ ...settings, submitButtonText: e.target.value })
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Success Message
            </label>
            <textarea
              value={settings.successMessage}
              onChange={(e) =>
                onUpdate({ ...settings, successMessage: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Redirect URL (optional)
            </label>
            <input
              value={settings.redirectUrl}
              onChange={(e) =>
                onUpdate({ ...settings, redirectUrl: e.target.value })
              }
              placeholder="https://example.com/thank-you"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div className="h-px bg-border" />

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Automation
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Auto-create contact
              </p>
              <p className="text-[11px] text-muted-foreground">
                Create a contact when form is submitted
              </p>
            </div>
            <button
              onClick={() =>
                onUpdate({
                  ...settings,
                  autoCreateContact: !settings.autoCreateContact,
                })
              }
              className="text-primary"
            >
              {settings.autoCreateContact ? (
                <ToggleRight className="h-6 w-6" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Auto-add tag
            </label>
            <input
              value={settings.autoAddTag}
              onChange={(e) =>
                onUpdate({ ...settings, autoAddTag: e.target.value })
              }
              placeholder="e.g., quote-request"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Auto-add to pipeline
            </label>
            <div className="relative">
              <select
                value={settings.autoAddToPipeline}
                onChange={(e) =>
                  onUpdate({ ...settings, autoAddToPipeline: e.target.value })
                }
                className="h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                <option value="">None</option>
                <option value="new-leads">New Leads</option>
                <option value="sales">Sales Pipeline</option>
                <option value="service">Service Pipeline</option>
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Notification Email
            </label>
            <input
              value={settings.notificationEmail}
              onChange={(e) =>
                onUpdate({ ...settings, notificationEmail: e.target.value })
              }
              placeholder="notify@example.com"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EmbedOptionsPanel({ formId }: { formId: string }) {
  const [activeTab, setActiveTab] = useState<
    "embed" | "link" | "popup" | "qr"
  >("embed");
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="https://mybizos.com/f/${formId}" width="100%" height="600" frameborder="0"></iframe>`;
  const directLink = `https://mybizos.com/f/${formId}`;
  const popupCode = `<script src="https://mybizos.com/js/forms.js"></script>
<script>
  MyBizOS.form('${formId}', {
    trigger: 'button',
    buttonText: 'Get a Free Quote',
    buttonColor: '#2563eb'
  });
</script>`;

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [],
  );

  const tabs = [
    { key: "embed" as const, label: "HTML Embed" },
    { key: "link" as const, label: "Direct Link" },
    { key: "popup" as const, label: "Popup" },
    { key: "qr" as const, label: "QR Code" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Embed Options
          </span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === "embed" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Copy this code and paste it into your website HTML
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-foreground overflow-x-auto font-mono">
                {embedCode}
              </pre>
              <button
                onClick={() => handleCopy(embedCode)}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "link" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Share this link directly with your customers
            </p>
            <div className="flex items-center gap-2">
              <input
                value={directLink}
                readOnly
                className="h-9 flex-1 rounded-lg border border-input bg-muted/50 px-3 text-sm text-foreground font-mono"
              />
              <button
                onClick={() => handleCopy(directLink)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-3",
                  "border border-border bg-card text-sm font-medium text-foreground",
                  "hover:bg-muted transition-colors",
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </button>
            </div>
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </div>
        )}

        {activeTab === "popup" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add this code to your website to show the form as a popup
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-foreground overflow-x-auto font-mono whitespace-pre-wrap">
                {popupCode}
              </pre>
              <button
                onClick={() => handleCopy(popupCode)}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "qr" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Print or share this QR code so customers can scan to open the form
            </p>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white p-6">
              <div className="h-40 w-40 rounded-lg bg-muted/30 border-2 border-dashed border-border flex items-center justify-center">
                <QrCode className="h-16 w-16 text-muted-foreground/40" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                {directLink}
              </p>
            </div>
            <button
              className={cn(
                "flex w-full h-9 items-center justify-center gap-2 rounded-lg",
                "border border-border bg-card text-sm font-medium text-foreground",
                "hover:bg-muted transition-colors",
              )}
            >
              <Copy className="h-4 w-4" />
              Download QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [settings, setSettings] = useState<FormSettings>(initialSettings);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const addField = useCallback(
    (type: FieldType) => {
      const newField = createNewField(type);
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
    },
    [],
  );

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f)),
    );
  }, []);

  const deleteField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [selectedFieldId],
  );

  const moveField = useCallback((index: number, direction: "up" | "down") => {
    setFields((prev) => {
      const newFields = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;
      [newFields[index], newFields[targetIndex]] = [
        newFields[targetIndex],
        newFields[index],
      ];
      return newFields;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const fieldType = e.dataTransfer.getData("fieldType") as FieldType;
      if (fieldType && fieldTypeConfig[fieldType]) {
        const newField = createNewField(fieldType);
        setFields((prev) => {
          const newFields = [...prev];
          newFields.splice(dropIndex, 0, newField);
          return newFields;
        });
        setSelectedFieldId(newField.id);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOverIndex(index);
    },
    [],
  );

  // Full-screen preview modal
  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Form Preview
            </p>
            <button
              onClick={() => setShowPreview(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {settings.name}
            </h2>
            <div className="space-y-5">
              {fields
                .filter((f) => f.type !== "hidden")
                .map((field) => (
                  <div key={field.id}>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </label>
                    {field.type === "text" ||
                    field.type === "email" ||
                    field.type === "phone" ? (
                      <input
                        type={field.type === "phone" ? "tel" : field.type}
                        placeholder={field.placeholder}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    ) : field.type === "dropdown" ? (
                      <select className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <option>{field.placeholder || "Select..."}</option>
                        {field.options.map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "checkbox" ? (
                      <div className="space-y-2 mt-1">
                        {field.options.map((opt, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-2 text-sm text-foreground"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : field.type === "radio" ? (
                      <div className="space-y-2 mt-1">
                        {field.options.map((opt, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-2 text-sm text-foreground"
                          >
                            <input
                              type="radio"
                              name={field.id}
                              className="h-4 w-4 border-input"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : field.type === "date" ? (
                      <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : field.type === "file" ? (
                      <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="text-center">
                          <Upload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">
                            Drag file or click to upload
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {field.helpText && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                ))}
            </div>
            <button
              className={cn(
                "flex w-full h-11 items-center justify-center rounded-lg mt-6",
                "bg-primary text-primary-foreground text-sm font-semibold",
                "hover:bg-primary/90 transition-colors",
              )}
            >
              {settings.submitButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/forms"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {settings.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {fields.length} fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4",
              "border border-border bg-background text-sm font-medium text-foreground",
              "hover:bg-muted transition-colors",
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4",
              "bg-primary text-primary-foreground text-sm font-medium",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            <Save className="h-4 w-4" />
            Save Form
          </button>
        </div>
      </div>

      {/* Builder layout */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 180px)" }}>
        {/* Left Panel: Field Palette / Editor */}
        <div className="col-span-3 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onUpdate={updateField}
                onClose={() => setSelectedFieldId(null)}
              />
            ) : (
              <FieldPalette onAddField={addField} />
            )}
          </div>
        </div>

        {/* Center Panel: Form Preview */}
        <div className="col-span-5">
          <div className="rounded-xl border border-border bg-card">
            {/* Form preview header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 rounded-t-xl">
              <p className="text-sm font-semibold text-foreground">
                Form Builder
              </p>
              <span className="text-xs text-muted-foreground">
                {fields.length} field{fields.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Fields */}
            <div className="p-4 space-y-3">
              {fields.map((field, index) => (
                <div key={field.id}>
                  {/* Drop zone before each field */}
                  <div
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      "h-1 -mt-1 mb-1 rounded-full transition-all",
                      dragOverIndex === index
                        ? "h-2 bg-primary/30 my-1"
                        : "bg-transparent",
                    )}
                  />
                  <FormPreviewField
                    field={field}
                    isSelected={selectedFieldId === field.id}
                    onSelect={() =>
                      setSelectedFieldId(
                        selectedFieldId === field.id ? null : field.id,
                      )
                    }
                    onMoveUp={() => moveField(index, "up")}
                    onMoveDown={() => moveField(index, "down")}
                    onDelete={() => deleteField(field.id)}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                  />
                </div>
              ))}

              {/* Drop zone at the end */}
              <div
                onDragOver={(e) => handleDragOver(e, fields.length)}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => handleDrop(e, fields.length)}
                className={cn(
                  "h-1 rounded-full transition-all",
                  dragOverIndex === fields.length
                    ? "h-2 bg-primary/30"
                    : "bg-transparent",
                )}
              />

              {/* Submit button preview */}
              <div className="pt-2">
                <button
                  disabled
                  className="flex w-full h-11 items-center justify-center rounded-lg bg-primary/80 text-primary-foreground text-sm font-semibold cursor-not-allowed"
                >
                  {settings.submitButtonText}
                </button>
              </div>

              {/* Add field button */}
              <button
                onClick={() => setSelectedFieldId(null)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4",
                  "text-sm font-medium text-muted-foreground",
                  "hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all",
                )}
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Settings & Embed */}
        <div className="col-span-4 space-y-4">
          <FormSettingsPanel settings={settings} onUpdate={setSettings} />
          <EmbedOptionsPanel formId="form-2" />
        </div>
      </div>
    </div>
  );
}
