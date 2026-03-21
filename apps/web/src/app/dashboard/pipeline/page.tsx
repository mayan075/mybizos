"use client";

import { Plus, MoreHorizontal, DollarSign, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  contact: string;
  value: number;
  daysInStage: number;
  tags: string[];
}

interface Column {
  id: string;
  title: string;
  color: string;
  deals: Deal[];
}

const columns: Column[] = [
  {
    id: "new_lead",
    title: "New Lead",
    color: "bg-info",
    deals: [
      {
        id: "d1",
        title: "AC Installation",
        contact: "Sarah Johnson",
        value: 4500,
        daysInStage: 1,
        tags: ["HVAC", "Residential"],
      },
      {
        id: "d2",
        title: "Furnace Replacement",
        contact: "David Park",
        value: 6200,
        daysInStage: 2,
        tags: ["HVAC"],
      },
      {
        id: "d3",
        title: "Pipe Repair",
        contact: "Amanda Taylor",
        value: 800,
        daysInStage: 0,
        tags: ["Plumbing"],
      },
      {
        id: "d7",
        title: "Duct Cleaning",
        contact: "Tom Bradley",
        value: 350,
        daysInStage: 1,
        tags: ["HVAC", "Maintenance"],
      },
    ],
  },
  {
    id: "quoted",
    title: "Quoted",
    color: "bg-warning",
    deals: [
      {
        id: "d4",
        title: "Water Heater Install",
        contact: "Mike Chen",
        value: 2800,
        daysInStage: 3,
        tags: ["Plumbing"],
      },
      {
        id: "d5",
        title: "HVAC Maintenance Plan",
        contact: "Lisa Wang",
        value: 1200,
        daysInStage: 5,
        tags: ["HVAC", "Contract"],
      },
    ],
  },
  {
    id: "won",
    title: "Won",
    color: "bg-success",
    deals: [
      {
        id: "d6",
        title: "Emergency Pipe Fix",
        contact: "James Wilson",
        value: 950,
        daysInStage: 0,
        tags: ["Plumbing", "Emergency"],
      },
    ],
  },
];

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="group rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-foreground">{deal.title}</h3>
        <button className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-all">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <User className="h-3 w-3" />
        {deal.contact}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          {formatValue(deal.value)}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {deal.daysInStage}d
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {deal.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const totalValue = columns.reduce(
    (sum, col) => sum + col.deals.reduce((s, d) => s + d.value, 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {columns.reduce((sum, col) => sum + col.deals.length, 0)} deals
            &middot; {formatValue(totalValue)} total value
          </p>
        </div>
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Add Deal
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-5 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnTotal = column.deals.reduce((s, d) => s + d.value, 0);
          return (
            <div
              key={column.id}
              className="flex w-80 shrink-0 flex-col rounded-xl bg-muted/30"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full", column.color)} />
                  <span className="text-sm font-semibold text-foreground">
                    {column.title}
                  </span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                    {column.deals.length}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatValue(columnTotal)}
                </span>
              </div>

              {/* Deal cards */}
              <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                {column.deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}

                {/* Add deal button */}
                <button className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Plus className="h-4 w-4" />
                  Add deal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
