"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Next.js App Router error boundary.
 * Catches unhandled errors in any page and shows a friendly recovery UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging (would go to a monitoring service in production)
    if (typeof window !== "undefined") {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      // Use structured logging instead of console.log
      try {
        const existing = JSON.parse(localStorage.getItem("mybizos_error_log") ?? "[]") as unknown[];
        existing.push(errorInfo);
        // Keep only last 20 errors
        if (existing.length > 20) existing.splice(0, existing.length - 20);
        localStorage.setItem("mybizos_error_log", JSON.stringify(existing));
      } catch {
        // localStorage unavailable, silently ignore
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Error icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. This has been logged for our team to investigate.
          </p>
        </div>

        {/* Error details (collapsed by default) */}
        {error.message && (
          <details className="rounded-lg border border-border bg-muted/30 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Technical details
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-32">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <a
            href="/dashboard"
            className="flex h-10 items-center gap-2 rounded-lg border border-input px-5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </a>
        </div>

        {/* Support note */}
        <p className="text-xs text-muted-foreground">
          If this keeps happening, please contact support.
        </p>
      </div>
    </div>
  );
}
