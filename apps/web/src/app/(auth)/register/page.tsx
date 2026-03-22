"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  Lock,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronDown,
  Loader2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { storeToken } from "@/lib/auth";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { isOnboardingComplete } from "@/lib/onboarding";

const VERTICALS = [
  { value: "rubbish_removals", label: "Rubbish Removals" },
  { value: "moving_company", label: "Moving Company" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "cleaning", label: "Cleaning" },
  { value: "general_contractor", label: "General Contractor" },
] as const;

interface RegisterResponse {
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    org: {
      id: string;
      name: string;
      slug: string;
      vertical: string;
    };
    token: string;
  };
}

const DEMO_FORM = {
  name: "Jim Henderson",
  businessName: "Jim's Plumbing",
  email: "jim@jimsplumbing.com",
  password: "demo1234",
  vertical: "plumbing",
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    vertical: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error when user edits
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  async function doRegister(data: typeof form) {
    const response = await apiClient.post<RegisterResponse>(
      "/auth/register",
      {
        name: data.name,
        businessName: data.businessName,
        email: data.email,
        password: data.password,
        vertical: data.vertical,
      },
    );

    storeToken(response.data.token);
    // Send new users to onboarding; returning users go straight to dashboard
    router.push(isOnboardingComplete() ? "/dashboard" : "/onboarding");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsLoading(true);

    try {
      await doRegister(form);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.details) {
          const errors: Record<string, string> = {};
          for (const detail of err.details) {
            errors[detail.field] = detail.message;
          }
          setFieldErrors(errors);
        }
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          "Cannot connect to the API server. Make sure it is running on port 3001.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleDemoQuickFill() {
    setForm(DEMO_FORM);
    setError("");
    setFieldErrors({});
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-primary-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">MyBizOS</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Start capturing
            <br />
            every lead, today.
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            Set up in under 5 minutes. Your AI agent starts answering calls
            immediately — no training required.
          </p>
        </div>
        <div className="relative z-10 text-primary-foreground/50 text-sm">
          &copy; 2026 MyBizOS. All rights reserved.
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-40 right-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 left-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        </div>
      </div>

      {/* Right panel — registration form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MyBizOS</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Get your AI-powered business OS running in minutes
            </p>
          </div>

          {error && !Object.keys(fieldErrors).length && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Demo Quick-Fill */}
          <button
            type="button"
            onClick={handleDemoQuickFill}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg",
              "border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary",
              "hover:bg-primary/10 hover:border-primary/50 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Quick-fill with demo data (Jim&apos;s Plumbing)
          </button>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Your name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="John Smith"
                    className={cn(
                      "h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors",
                      fieldErrors["name"]
                        ? "border-destructive"
                        : "border-input",
                    )}
                    required
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors["name"] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors["name"]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="businessName"
                  className="text-sm font-medium text-foreground"
                >
                  Business name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="businessName"
                    type="text"
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                    placeholder="Acme HVAC"
                    className={cn(
                      "h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors",
                      fieldErrors["businessName"]
                        ? "border-destructive"
                        : "border-input",
                    )}
                    required
                    disabled={isLoading}
                  />
                </div>
                {fieldErrors["businessName"] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors["businessName"]}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="vertical"
                className="text-sm font-medium text-foreground"
              >
                Business type
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="vertical"
                  value={form.vertical}
                  onChange={(e) => update("vertical", e.target.value)}
                  className={cn(
                    "h-11 w-full appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors",
                    !form.vertical && "text-muted-foreground",
                    fieldErrors["vertical"]
                      ? "border-destructive"
                      : "border-input",
                  )}
                  required
                  disabled={isLoading}
                >
                  <option value="" disabled>
                    Select your industry
                  </option>
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {fieldErrors["vertical"] && (
                <p className="text-xs text-destructive">
                  {fieldErrors["vertical"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="john@acmehvac.com"
                  className={cn(
                    "h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors",
                    fieldErrors["email"]
                      ? "border-destructive"
                      : "border-input",
                  )}
                  required
                  disabled={isLoading}
                />
              </div>
              {fieldErrors["email"] && (
                <p className="text-xs text-destructive">
                  {fieldErrors["email"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Create a strong password"
                  className={cn(
                    "h-11 w-full rounded-lg border bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors",
                    fieldErrors["password"]
                      ? "border-destructive"
                      : "border-input",
                  )}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors["password"] && (
                <p className="text-xs text-destructive">
                  {fieldErrors["password"]}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-lg",
                "bg-primary text-primary-foreground font-medium text-sm",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
