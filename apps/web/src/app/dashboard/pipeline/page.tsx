"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, DollarSign, User, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  contact: string;
  value: number;
  daysInStage: number;
  score: number;
  tags: string[];
}

interface Column {
  id: string;
  title: string;
  color: string;
}

const columnDefs: Column[] = [
  { id: "new_lead", title: "New Lead", color: "bg-info" },
  { id: "quoted", title: "Quoted", color: "bg-warning" },
  { id: "scheduled", title: "Scheduled", color: "bg-primary" },
  { id: "won", title: "Won", color: "bg-success" },
];

const initialDeals: Record<string, Deal[]> = {
  new_lead: [
    { id: "d1", title: "AC Installation", contact: "Sarah Johnson", value: 4500, daysInStage: 1, score: 92, tags: ["HVAC", "Residential"] },
    { id: "d2", title: "Furnace Replacement", contact: "David Park", value: 6200, daysInStage: 2, score: 85, tags: ["HVAC"] },
    { id: "d3", title: "Pipe Repair", contact: "Amanda Taylor", value: 800, daysInStage: 0, score: 73, tags: ["Plumbing"] },
    { id: "d7", title: "Duct Cleaning", contact: "Tom Bradley", value: 350, daysInStage: 1, score: 60, tags: ["HVAC", "Maintenance"] },
  ],
  quoted: [
    { id: "d4", title: "Water Heater Install", contact: "Mike Chen", value: 2800, daysInStage: 3, score: 78, tags: ["Plumbing"] },
    { id: "d5", title: "HVAC Maintenance Plan", contact: "Lisa Wang", value: 1200, daysInStage: 5, score: 64, tags: ["HVAC", "Contract"] },
  ],
  scheduled: [
    { id: "d8", title: "Boiler Inspection", contact: "Carlos Hernandez", value: 450, daysInStage: 1, score: 88, tags: ["HVAC"] },
    { id: "d9", title: "Drain Cleaning", contact: "Karen Thompson", value: 300, daysInStage: 0, score: 55, tags: ["Plumbing"] },
  ],
  won: [
    { id: "d6", title: "Emergency Pipe Fix", contact: "James Wilson", value: 950, daysInStage: 0, score: 45, tags: ["Plumbing", "Emergency"] },
    { id: "d10", title: "AC Tune-Up", contact: "Emily Davis", value: 189, daysInStage: 2, score: 91, tags: ["HVAC"] },
  ],
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-success/10 text-success"
      : score >= 50
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold", color)}>
      {score}
    </span>
  );
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Record<string, Deal[]>>(initialDeals);
  const [draggedDeal, setDraggedDeal] = useState<{ deal: Deal; fromCol: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add deal form
  const [newTitle, setNewTitle] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newValue, setNewValue] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleDragStart(deal: Deal, fromCol: string) {
    setDraggedDeal({ deal, fromCol });
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOverCol(colId);
  }

  function handleDragLeave() {
    setDragOverCol(null);
  }

  function handleDrop(e: React.DragEvent, toCol: string) {
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedDeal) return;
    if (draggedDeal.fromCol === toCol) {
      setDraggedDeal(null);
      return;
    }

    setDeals((prev) => {
      const next = { ...prev };
      // Remove from source column
      next[draggedDeal.fromCol] = prev[draggedDeal.fromCol].filter(
        (d) => d.id !== draggedDeal.deal.id,
      );
      // Add to target column with reset days
      next[toCol] = [...prev[toCol], { ...draggedDeal.deal, daysInStage: 0 }];
      return next;
    });

    const colName = columnDefs.find((c) => c.id === toCol)?.title ?? toCol;
    showToast(`"${draggedDeal.deal.title}" moved to ${colName}`);
    setDraggedDeal(null);
  }

  function handleAddDeal(colId: string) {
    if (!newTitle.trim() || !newContact.trim()) return;
    const deal: Deal = {
      id: `d-${Date.now()}`,
      title: newTitle.trim(),
      contact: newContact.trim(),
      value: parseInt(newValue, 10) || 0,
      daysInStage: 0,
      score: Math.floor(Math.random() * 40) + 40,
      tags: [],
    };
    setDeals((prev) => ({
      ...prev,
      [colId]: [...prev[colId], deal],
    }));
    setShowAddModal(null);
    setNewTitle("");
    setNewContact("");
    setNewValue("");
    showToast(`Deal "${deal.title}" added`);
  }

  const allDeals = Object.values(deals).flat();
  const totalValue = allDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Add Deal to {columnDefs.find((c) => c.id === showAddModal)?.title}
              </h2>
              <button onClick={() => setShowAddModal(null)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Deal Title *</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="AC Installation"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contact Name *</label>
                <input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="Sarah Johnson"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Value ($)</label>
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="4500"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddModal(null)} className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleAddDeal(showAddModal)}
                disabled={!newTitle.trim() || !newContact.trim()}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  newTitle.trim() && newContact.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allDeals.length} deals &middot; {formatValue(totalValue)} total value
          </p>
        </div>
        <button
          onClick={() => setShowAddModal("new_lead")}
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
        {columnDefs.map((column) => {
          const colDeals = deals[column.id] ?? [];
          const columnTotal = colDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div
              key={column.id}
              className={cn(
                "flex w-80 shrink-0 flex-col rounded-xl transition-colors",
                dragOverCol === column.id
                  ? "bg-primary/10 ring-2 ring-primary/30"
                  : "bg-muted/30",
              )}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full", column.color)} />
                  <span className="text-sm font-semibold text-foreground">
                    {column.title}
                  </span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                    {colDeals.length}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatValue(columnTotal)}
                </span>
              </div>

              {/* Deal cards */}
              <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                {colDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal, column.id)}
                    className="group rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing active:opacity-70"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium text-foreground">{deal.title}</h3>
                      <div className="flex items-center gap-1">
                        <ScoreBadge score={deal.score} />
                        <button className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-all">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
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

                    {deal.tags.length > 0 && (
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
                    )}
                  </div>
                ))}

                {/* Add deal button */}
                <button
                  onClick={() => setShowAddModal(column.id)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
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
