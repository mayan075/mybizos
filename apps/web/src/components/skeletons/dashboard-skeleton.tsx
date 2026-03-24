import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 border-t-2 border-t-muted bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-5">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="rounded-xl bg-card border border-border/60 shadow-sm p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="rounded-xl bg-card border border-border/60 shadow-sm p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
