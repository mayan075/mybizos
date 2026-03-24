"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

/**
 * Dashboard-specific error boundary.
 * Shows a friendly recovery UI within the dashboard layout.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    if (typeof window !== "undefined") {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };
      try {
        const existing = JSON.parse(localStorage.getItem("mybizos_error_log") ?? "[]") as unknown[];
        existing.push(errorInfo);
        if (existing.length > 20) existing.splice(0, existing.length - 20);
        localStorage.setItem("mybizos_error_log", JSON.stringify(existing));
      } catch {
        // silently ignore
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            This page ran into a problem
          </h2>
          <p className="text-sm text-muted-foreground">
            Something unexpected happened while loading this page. You can try again or go back.
          </p>
        </div>

        {error.message && (
          <details className="rounded-lg border border-border bg-muted/30 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-24">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <a
            href="/dashboard"
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
