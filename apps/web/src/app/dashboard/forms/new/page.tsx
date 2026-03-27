"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  AlignLeft,
  ChevronDown,
  Calendar,
  Hash,
  ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateForm } from "@/lib/hooks/use-forms";

type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "date" | "number" | "checkbox";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
}

const fieldTypeConfig: Record<FieldType, { label: string; icon: React.ElementType }> = {
  text: { label: "Text", icon: Type },
  email: { label: "Email", icon: Mail },
  phone: { label: "Phone", icon: Phone },
  textarea: { label: "Long Text", icon: AlignLeft },
  select: { label: "Dropdown", icon: ChevronDown },
  date: { label: "Date", icon: Calendar },
  number: { label: "Number", icon: Hash },
  checkbox: { label: "Checkbox", icon: ToggleLeft },
};

export default function NewFormPage() {
  const router = useRouter();
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormField[]>([
    { id: "f1", type: "text", label: "Full Name", placeholder: "John Smith", required: true },
    { id: "f2", type: "email", label: "Email", placeholder: "john@example.com", required: true },
    { id: "f3", type: "phone", label: "Phone", placeholder: "(555) 000-0000", required: false },
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { mutate: createForm } = useCreateForm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addField(type: FieldType) {
    const cfg = fieldTypeConfig[type];
    const field: FormField = {
      id: `f-${Date.now()}`,
      type,
      label: cfg.label,
      placeholder: "",
      required: false,
    };
    setFields((prev) => [...prev, field]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  async function handleSave() {
    if (!formName.trim()) {
      showToast("Please enter a form name");
      return;
    }
    if (fields.length === 0) {
      showToast("Please add at least one field");
      return;
    }
    setSaving(true);
    const result = await createForm({
      name: formName.trim(),
      fields,
      settings: {},
    });
    setSaving(false);
    if (result) {
      showToast("Form created successfully");
      setTimeout(() => router.push("/dashboard/forms"), 1000);
    } else {
      showToast("Failed to create form. Please try again.");
    }
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
            href="/dashboard/forms"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Form</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build a lead capture form for your website
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
            saving && "opacity-50 cursor-not-allowed",
          )}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Form"}
        </button>
      </div>

      {/* Form name */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Form Details</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Form Name *</label>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., Contact Us"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Form Fields</h2>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No fields yet. Add your first field below.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field) => {
            const cfg = fieldTypeConfig[field.type];
            const Icon = cfg.icon;
            return (
              <div key={field.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                    <input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                    <input
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    Required
                  </label>
                  <button
                    onClick={() => removeField(field.id)}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add field buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(Object.entries(fieldTypeConfig) as [FieldType, typeof fieldTypeConfig[FieldType]][]).map(
            ([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => addField(type)}
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
