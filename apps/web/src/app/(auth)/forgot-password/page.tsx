"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setIsSubmitted(true);
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
            Reset your password
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            No worries, we&apos;ll send you instructions to reset your password.
          </p>
        </div>
        <div className="relative z-10 text-primary-foreground/50 text-sm">
          &copy; 2026 MyBizOS. All rights reserved.
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MyBizOS</span>
          </div>

          {isSubmitted ? (
            /* Success state */
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Check your email
                </h2>
                <p className="text-muted-foreground">
                  If an account exists for <strong>{email}</strong>, we&apos;ve
                  sent a password reset link. Please check your inbox and spam
                  folder.
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className={cn(
                    "flex h-11 w-full items-center justify-center gap-2 rounded-lg",
                    "bg-primary text-primary-foreground font-medium text-sm",
                    "hover:bg-primary/90 transition-colors",
                  )}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="flex h-11 w-full items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Didn&apos;t receive it? Try again
                </button>
              </div>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Forgot password?
                </h2>
                <p className="text-muted-foreground">
                  Enter your email address and we&apos;ll send you a link to
                  reset your password.
                </p>
              </div>

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
                      disabled={isLoading}
                    />
                  </div>
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
