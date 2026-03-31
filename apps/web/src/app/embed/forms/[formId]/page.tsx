"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface FormSettings {
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  settings: FormSettings;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function EmbedFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch(`${API_URL}/public/forms/${formId}`);
        if (!res.ok) {
          setError("Form not found or inactive");
          setLoading(false);
          return;
        }
        const json = await res.json();
        const formData = json.data as FormData;
        setForm(formData);

        // Initialize values
        const initial: Record<string, string> = {};
        for (const field of formData.fields) {
          initial[field.id] = "";
        }
        setValues(initial);
      } catch {
        setError("Failed to load form");
      }
      setLoading(false);
    }
    fetchForm();
  }, [formId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !values[field.id]?.trim()) {
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_URL}/public/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values, source: "embed" }),
      });

      if (res.ok) {
        const settings = form.settings;
        if (settings.redirectUrl) {
          window.top
            ? (window.top.location.href = settings.redirectUrl)
            : (window.location.href = settings.redirectUrl);
        } else {
          setSubmitted(true);
        }
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <p className="text-sm text-muted-foreground">{error || "Form not available"}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-base font-semibold text-foreground">
            {form.settings.successMessage || "Thank you for your submission!"}
          </p>
        </div>
      </div>
    );
  }

  function renderField(field: FormField) {
    const value = values[field.id] || "";
    const onChange = (val: string) =>
      setValues((prev) => ({ ...prev, [field.id]: val }));

    const inputClass =
      "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        );
      case "select":
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={inputClass}
          >
            <option value="">{field.placeholder || "Select..."}</option>
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => onChange(e.target.checked ? "true" : "")}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {field.placeholder || field.label}
          </label>
        );
      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={inputClass}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={inputClass}
          />
        );
      default:
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={inputClass}
          />
        );
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      {form.name && (
        <h2 className="text-xl font-bold text-foreground mb-1">{form.name}</h2>
      )}
      {form.description && (
        <p className="text-sm text-muted-foreground mb-5">{form.description}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {form.fields.map((field) => (
          <div key={field.id}>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "flex w-full h-11 items-center justify-center rounded-lg",
            "bg-primary text-primary-foreground text-sm font-semibold",
            "hover:bg-primary/90 transition-colors",
            submitting && "opacity-50 cursor-not-allowed",
          )}
        >
          {submitting
            ? "Submitting..."
            : form.settings.submitButtonText || "Submit"}
        </button>
      </form>
    </div>
  );
}
