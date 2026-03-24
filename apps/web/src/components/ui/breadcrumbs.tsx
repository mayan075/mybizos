"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Map URL path segments to human-readable labels */
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  contacts: "Contacts",
  pipeline: "Pipeline",
  inbox: "Inbox",
  calls: "Calls",
  scheduling: "Scheduling",
  campaigns: "Campaigns",
  sequences: "Sequences",
  automations: "Automations",
  reviews: "Reviews",
  social: "Social",
  forms: "Forms",
  invoices: "Invoices",
  estimates: "Estimates",
  team: "Team",
  analytics: "Analytics",
  activity: "Activity",
  settings: "Settings",
  notifications: "Notifications",
  integrations: "Integrations",
  admin: "Admin",
  new: "New",
};

interface BreadcrumbsProps {
  /** Override the last breadcrumb label (e.g. contact name, deal title) */
  currentLabel?: string;
  className?: string;
}

export function Breadcrumbs({ currentLabel, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Split pathname into segments, ignoring empty strings
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items: [{label, href}, ...]
  const crumbs: { label: string; href: string }[] = [];
  let pathAccum = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    pathAccum += `/${seg}`;

    const isLast = i === segments.length - 1;

    // For the last segment, use the override label if provided
    if (isLast && currentLabel) {
      crumbs.push({ label: currentLabel, href: pathAccum });
    } else {
      // Try to match a known label; if not, check if it looks like a dynamic ID
      const knownLabel = segmentLabels[seg];
      if (knownLabel) {
        crumbs.push({ label: knownLabel, href: pathAccum });
      } else if (isLast) {
        // Dynamic ID like "c1" or "INV-001" — show it formatted or use currentLabel
        crumbs.push({ label: currentLabel ?? seg, href: pathAccum });
      }
      // Skip dynamic IDs in the middle — they shouldn't appear as breadcrumbs
    }
  }

  // Don't render if there's only one breadcrumb (root page)
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm", className)}>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            {idx === 0 && (
              <Home className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mr-0.5" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
