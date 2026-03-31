"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { storeTokens } from "@/lib/auth";

/**
 * Parse key=value pairs from a URL fragment (hash) string.
 * Tokens are passed in the fragment (not query params) so they never
 * appear in server logs, Referer headers, or browser history APIs.
 */
function parseFragment(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const pair of raw.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (key) params[key] = decodeURIComponent(rest.join("="));
  }
  return params;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    // Read tokens from URL fragment (preferred, secure) or fall back to query params (legacy)
    const fragment = parseFragment(window.location.hash);
    const token = fragment.token || searchParams.get("token");
    const refreshToken = fragment.refreshToken || searchParams.get("refreshToken");
    const errorMsg = searchParams.get("error");

    // Immediately scrub tokens from browser history/URL bar
    if (token || refreshToken) {
      window.history.replaceState({}, "", "/auth/callback");
    }

    if (errorMsg) {
      setError(errorMsg);
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    if (token) {
      storeTokens(token, refreshToken ?? "").then(() => {
        router.push("/dashboard");
      });
    } else {
      setError("No authentication token received.");
      setTimeout(() => router.push("/login"), 3000);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-sm">{error}</p>
          <p className="text-muted-foreground text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Signing you in...</span>
      </div>
    </div>
  );
}
