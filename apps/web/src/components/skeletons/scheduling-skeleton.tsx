import { Skeleton } from "@/components/ui/skeleton";

export function SchedulingSkeleton() {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
          <Skeleton className="h-4 w-44 mt-1" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="text-center space-y-1">
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
              <div className="px-3 py-3" />
              {DAYS.map((day) => (
                <div key={day} className="px-3 py-3 text-center border-l border-border">
                  <p className="text-xs font-medium text-muted-foreground">{day}</p>
                  <Skeleton className="h-4 w-12 mx-auto mt-1" />
                </div>
              ))}
            </div>

            {/* Time slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border last:border-b-0"
              >
                <div className="px-3 py-2 text-right">
                  <span className="text-xs text-muted-foreground">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                  </span>
                </div>
                {DAYS.map((day) => (
                  <div
                    key={`${day}-${hour}`}
                    className="border-l border-border min-h-[60px] p-1"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
