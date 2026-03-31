"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, Mail, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { FloatingDialer } from "@/components/dialer/floating-dialer";
import { AIAssistant } from "@/components/ai-assistant/ai-assistant";
import { ImpersonateBanner } from "@/components/admin/impersonate-banner";
import { isOnboardingComplete } from "@/lib/onboarding";
import { getToken, isAccessTokenExpired, refreshAccessToken, removeToken } from "@/lib/auth";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationBannerMessage, setVerificationBannerMessage] = useState("");

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Swipe gesture support for mobile sidebar
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // Only count horizontal swipes (not scrolling)
      if (deltaY > Math.abs(deltaX)) return;

      // Swipe right from left edge to open
      if (!mobileSidebarOpen && touchStartX < 30 && deltaX > 60) {
        setMobileSidebarOpen(true);
      }
      // Swipe left to close
      if (mobileSidebarOpen && deltaX < -60) {
        setMobileSidebarOpen(false);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [mobileSidebarOpen]);

  // Guard: check auth + onboarding before rendering dashboard
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();

      // No token at all — go to login
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Token expired — try to refresh
      if (isAccessTokenExpired()) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          // Refresh failed — session is gone
          removeToken();
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
      }

      // Auth OK — check onboarding
      if (!isOnboardingComplete()) {
        router.replace("/onboarding");
        return;
      }

      setReady(true);
    }
    checkAuth();
  }, [router, pathname]);

  // Check email verification status
  useEffect(() => {
    if (!ready) return;

    interface MeResponse {
      data: {
        user: { id: string; email: string; name: string; avatarUrl: string | null; emailVerified: boolean; role: string };
        org: { id: string; name: string; slug: string; vertical: string };
      };
    }

    apiClient
      .get<MeResponse>("/auth/me")
      .then((res) => {
        if (!res.data.user.emailVerified) {
          setShowVerificationBanner(true);
        }
      })
      .catch(() => {
        // Silently fail — don't block dashboard for this check
      });
  }, [ready]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl/Cmd+Shift+N — new deal (pipeline)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        router.push("/dashboard/pipeline");
        return;
      }

      // Ctrl/Cmd+N — new contact
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        router.push("/dashboard/contacts");
        return;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const handleResendVerification = useCallback(async () => {
    setIsResendingVerification(true);
    setVerificationBannerMessage("");
    try {
      await apiClient.post<{ data: { message: string } }>(
        "/auth/resend-verification",
        {},
      );
      setVerificationBannerMessage("Verification email sent!");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setVerificationBannerMessage(err.message);
      } else {
        setVerificationBannerMessage("Failed to resend. Please try again.");
      }
    } finally {
      setIsResendingVerification(false);
    }
  }, []);

  // Show spinner while checking onboarding status
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay — always rendered for smooth transitions */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-300",
          mobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonateBanner />
        <Header
          onOpenCommandPalette={openCommandPalette}
          onToggleMobileSidebar={toggleMobileSidebar}
        />
        {showVerificationBanner && (
          <div className="relative flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>
                Please verify your email address. Check your inbox or{" "}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
                >
                  {isResendingVerification ? "sending..." : "resend verification email"}
                </button>
                .
                {verificationBannerMessage && (
                  <span className="ml-2 font-medium">
                    {verificationBannerMessage}
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowVerificationBanner(false)}
              className="shrink-0 rounded-md p-1 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <FloatingDialer />
      <AIAssistant />
    </div>
  );
}
