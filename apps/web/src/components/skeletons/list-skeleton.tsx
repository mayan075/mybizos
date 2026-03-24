import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  /** Page title shown while loading */
  title: string;
  /** Number of placeholder rows (default 6) */
  rows?: number;
}

export function ListSkeleton({ title, rows = 6 }: ListSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Toolbar: search + filter + export */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center gap-5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-5 border-b border-border px-5 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
