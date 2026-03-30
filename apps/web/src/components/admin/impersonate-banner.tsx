"use client";

import { useState, useEffect } from "react";
import { Eye, X } from "lucide-react";
import { storeToken } from "@/lib/auth";

interface ImpersonationData {
  orgName: string;
  originalToken: string;
}

export function ImpersonateBanner() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("hararai_impersonating");
    if (raw) {
      try {
        setImpersonation(JSON.parse(raw) as ImpersonationData);
      } catch {
        sessionStorage.removeItem("hararai_impersonating");
      }
    }
  }, []);

  if (!impersonation) return null;

  const handleExit = () => {
    // Restore original admin token
    storeToken(impersonation.originalToken);
    sessionStorage.removeItem("hararai_impersonating");
    window.location.href = "/dashboard/admin/organizations";
  };

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <Eye className="h-4 w-4" />
      <span>
        Viewing as <strong>{impersonation.orgName}</strong>
      </span>
      <button
        onClick={handleExit}
        className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
      >
        <X className="h-3 w-3" />
        Exit
      </button>
    </div>
  );
}
