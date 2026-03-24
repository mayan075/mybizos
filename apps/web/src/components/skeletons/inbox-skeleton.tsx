import { Skeleton } from "@/components/ui/skeleton";

export function InboxSkeleton() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <Skeleton className="h-4 w-40 mt-1" />
      </div>

      {/* Two-pane layout */}
      <div className="flex h-[calc(100vh-13rem)] rounded-xl border border-border bg-card overflow-hidden">
        {/* Left pane: conversation list */}
        <div className="flex w-96 shrink-0 flex-col border-r border-border">
          {/* Search + filters */}
          <div className="border-b border-border p-3 space-y-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-border px-4 py-3"
              >
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: empty placeholder */}
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
