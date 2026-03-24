import { Skeleton } from "@/components/ui/skeleton";

export function PipelineSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex w-72 sm:w-80 shrink-0 flex-col rounded-xl bg-muted/30"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>

            {/* Deal card placeholders */}
            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {Array.from({ length: colIdx === 0 ? 3 : colIdx === 3 ? 1 : 2 }).map(
                (_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24 mt-2" />
                    <div className="flex items-center justify-between mt-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </div>
                ),
              )}

              {/* Add deal button placeholder */}
              <Skeleton className="h-10 w-full rounded-lg border border-dashed border-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
