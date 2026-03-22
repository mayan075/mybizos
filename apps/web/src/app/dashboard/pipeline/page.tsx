"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, DollarSign, User, Clock, X, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeals, usePipelines, useCreateDeal, useMoveDeal } from "@/lib/hooks/use-deals";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import type { MockDeal } from "@/lib/mock-data";

const stageTooltips: Record<string, string> = {
  "New Lead": "Fresh leads that just came in. Review and follow up to move them forward.",
  "Quoted": "You have sent a quote or estimate. Waiting for the customer to decide.",
  "Scheduled": "The job is booked. Service appointment is on the calendar.",
  "Won": "Deal is closed and the job is complete. Revenue is counted here.",
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
  usePageTitle("Pipeline");
  const { data: columnDefs } = usePipelines();
  const { data: apiDeals } = useDeals();
  const { mutate: createDealApi } = useCreateDeal();
  const { mutate: moveDealApi } = useMoveDeal();

  // Local state for optimistic UI (mirrors original behavior)
  const [deals, setDeals] = useState<Record<string, MockDeal[]> | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ deal: MockDeal; fromCol: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add deal form
  const [newTitle, setNewTitle] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newValue, setNewValue] = useState("");

  // Use local state if available (after first mutation), otherwise API/mock data
  const currentDeals = deals ?? apiDeals;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleDragStart(deal: MockDeal, fromCol: string) {
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

    const prev = currentDeals;
    const next = { ...prev };
    // Remove from source column
    next[draggedDeal.fromCol] = prev[draggedDeal.fromCol].filter(
      (d) => d.id !== draggedDeal.deal.id,
    );
    // Add to target column with reset days
    next[toCol] = [...prev[toCol], { ...draggedDeal.deal, daysInStage: 0 }];
    setDeals(next);

    // Try to persist via API
    moveDealApi({ id: draggedDeal.deal.id, stageId: toCol });

    const colName = columnDefs.find((c) => c.id === toCol)?.title ?? toCol;
    showToast(`"${draggedDeal.deal.title}" moved to ${colName}`);
    setDraggedDeal(null);
  }

  async function handleAddDeal(colId: string) {
    if (!newTitle.trim() || !newContact.trim()) return;
    const deal: MockDeal = {
      id: `d-${Date.now()}`,
      title: newTitle.trim(),
      contact: newContact.trim(),
      value: parseInt(newValue, 10) || 0,
      daysInStage: 0,
      score: Math.floor(Math.random() * 40) + 40,
      tags: [],
    };

    const prev = currentDeals;
    setDeals({
      ...prev,
      [colId]: [...prev[colId], deal],
    });

    // Try to persist via API
    await createDealApi({
      title: deal.title,
      contact: deal.contact,
      value: deal.value,
      stageId: colId,
    });

    setShowAddModal(null);
    setNewTitle("");
    setNewContact("");
    setNewValue("");
    showToast(`Deal "${deal.title}" added`);
  }

  const allDeals = Object.values(currentDeals).flat();
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

      {/* Empty state for zero deals */}
      {allDeals.length === 0 && (
        <EmptyState
          icon={Kanban}
          title="No deals in your pipeline"
          description="Create your first deal to start tracking revenue. Deals move through stages as you quote, schedule, and complete jobs."
          actionLabel="Create Your First Deal"
          onAction={() => setShowAddModal("new_lead")}
          className="rounded-xl border border-border bg-card"
        />
      )}

      {/* Kanban board */}
      <div className={cn("flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none -mx-6 px-6 sm:mx-0 sm:px-0", allDeals.length === 0 && "hidden")}>
        {columnDefs.map((column) => {
          const colDeals = currentDeals[column.id] ?? [];
          const columnTotal = colDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div
              key={column.id}
              className={cn(
                "flex w-72 sm:w-80 shrink-0 flex-col rounded-xl transition-colors snap-start",
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
                  {stageTooltips[column.title] && (
                    <Tooltip
                      content={stageTooltips[column.title]}
                      position="bottom"
                    />
                  )}
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
                        <Tooltip content="AI Score: likelihood this deal will close." position="left">
                          <ScoreBadge score={deal.score} />
                        </Tooltip>
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
