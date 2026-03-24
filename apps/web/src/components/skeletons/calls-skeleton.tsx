import { Skeleton } from "@/components/ui/skeleton";

export function CallsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calls</h1>
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-2">
        {["All", "Inbound", "Outbound", "AI", "Missed"].map((tab) => (
          <Skeleton key={tab} className="h-8 w-20 rounded-md" />
        ))}
      </div>

      {/* Search bar */}
      <Skeleton className="h-9 w-full max-w-sm rounded-lg" />

      {/* Call list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
