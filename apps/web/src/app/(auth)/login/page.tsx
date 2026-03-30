"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  Loader2,
  Play,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { storeTokens } from "@/lib/auth";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { env } from "@/lib/env";

interface LoginResponse {
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
    refreshToken: string;
  };
}

const DEMO_EMAIL = "demo@hararai.com";
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Pick up error from OAuth redirect and verified status
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(oauthError);

    const verified = searchParams.get("verified");
    if (verified === "true") {
      setSuccessMessage("Email verified! You can now sign in.");
    }
  }, [searchParams]);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError("");

    const response = await apiClient.post<LoginResponse>("/auth/login", {
      email: loginEmail,
      password: loginPassword,
    });

    await storeTokens(response.data.token, response.data.refreshToken);
    router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await doLogin(email, password);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          "Cannot reach the API server. Please check that the backend is running and try again.",
        );
      } else {
        setError(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}. Check your connection and try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDemoLogin() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setIsDemoLoading(true);
    setError("");

    try {
      await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          "The API server is starting up. Please wait a moment and try again.",
        );
      } else {
        setError("Something unexpected happened. Check your internet connection and try again.");
      }
    } finally {
      setIsDemoLoading(false);
    }
  }

  const anyLoading = isLoading || isDemoLoading;

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-primary-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">HararAI</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Your AI-powered
            <br />
            business command center.
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            Never miss a lead. AI answers every call, qualifies prospects, and
            books appointments — 24/7.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
              <Phone className="h-4 w-4" />
              <span>AI Phone Agent</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
              <Mail className="h-4 w-4" />
              <span>Unified Inbox</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-primary-foreground/50 text-sm">
          &copy; 2026 HararAI. All rights reserved.
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">HararAI</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                  required
                  disabled={anyLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                  required
                  disabled={anyLoading}
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
            </div>

            <button
              type="submit"
              disabled={anyLoading}
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <a
            href={`${env.NEXT_PUBLIC_API_URL}/auth/google`}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-3 rounded-lg",
              "border border-border bg-background font-medium text-sm text-foreground",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "transition-all duration-200",
              anyLoading && "opacity-50 pointer-events-none",
            )}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </a>

          {/* Demo divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Demo Login Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={anyLoading}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-lg",
              "border border-border bg-accent/50 font-medium text-sm text-foreground",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isDemoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in as demo user...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Demo Login
              </>
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Get started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
