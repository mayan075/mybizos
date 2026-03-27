"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, DollarSign, User, Clock, X, Kanban, AlertCircle, Loader2, Settings2, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn, formatCurrency, getUserCountry, getCurrencyForCountry } from "@/lib/utils";
import { useDeals, usePipelines, useCreateDeal, useMoveDeal } from "@/lib/hooks/use-deals";
import { useApiMutation, buildPath } from "@/lib/hooks/use-api";
import { apiClient, tryFetch, ApiRequestError } from "@/lib/api-client";
import type { StageResponse, CreateStageInput, ReorderStagesInput } from "@/lib/hooks/use-deals";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { PipelineSkeleton } from "@/components/skeletons/pipeline-skeleton";
import { useToast } from "@/components/ui/toast";
import type { MockDeal } from "@/lib/mock-data";

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

interface DealFormErrors {
  title?: string;
  contact?: string;
  value?: string;
}

function validateDealForm(title: string, contact: string, value: string): DealFormErrors {
  const errors: DealFormErrors = {};
  if (!title.trim()) {
    errors.title = "Deal title is required";
  }
  if (!contact.trim()) {
    errors.contact = "Contact name is required";
  }
  if (value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      errors.value = "Value must be a positive number";
    }
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Stage management constants                                                 */
/* -------------------------------------------------------------------------- */

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#6b7280", // Gray
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/* -------------------------------------------------------------------------- */
/*  Customize Stages Modal                                                     */
/* -------------------------------------------------------------------------- */

interface StageItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
}

function CustomizeStagesModal({
  stages,
  pipelineId,
  onClose,
  onSaved,
}: {
  stages: StageItem[];
  pipelineId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [localStages, setLocalStages] = useState<StageItem[]>(
    [...stages].sort((a, b) => a.position - b.position),
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { mutate: createStageApi } = useApiMutation<CreateStageInput, StageResponse>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages`,
    "post",
  );

  const { mutate: reorderApi } = useApiMutation<ReorderStagesInput, StageResponse[]>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages/reorder`,
    "patch",
  );

  async function handleAddStage() {
    if (!newStageName.trim()) return;

    const slug = slugify(newStageName);
    if (!slug) return;

    setIsSaving(true);
    try {
      const result = await createStageApi({
        name: newStageName.trim(),
        slug,
        color: newStageColor,
        position: localStages.length,
      });

      if (result) {
        setLocalStages((prev) => [...prev, {
          id: result.id,
          name: result.name,
          slug: result.slug,
          color: result.color,
          position: result.position,
        }]);
        setNewStageName("");
        setNewStageColor(PRESET_COLORS[0]);
        setShowAddForm(false);
        toast.success(`Stage "${newStageName.trim()}" added`);
        onSaved();
      } else {
        toast.error("Failed to create stage (API unavailable)");
      }
    } catch {
      toast.error("Failed to create stage");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStage(stageId: string) {
    setDeletingId(stageId);
    setDeleteError(null);
    try {
      const path = buildPath(`/orgs/:orgId/pipelines/${pipelineId}/stages/${stageId}`);
      const result = await tryFetch(() => apiClient.delete<{ success: boolean }>(path));

      if (result !== null) {
        setLocalStages((prev) => prev.filter((s) => s.id !== stageId));
        setConfirmDeleteId(null);
        toast.success("Stage deleted");
        onSaved();
      } else {
        setDeleteError("Failed to delete stage");
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setDeleteError("Cannot delete: deals exist in this stage. Move them first.");
      } else {
        setDeleteError("Failed to delete stage");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMoveStage(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localStages.length) return;

    const updated = [...localStages];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Update positions
    const reordered = updated.map((s, i) => ({ ...s, position: i }));
    setLocalStages(reordered);

    // Persist
    try {
      await reorderApi({
        stages: reordered.map((s) => ({ id: s.id, position: s.position })),
      });
      onSaved();
    } catch {
      toast.error("Failed to reorder stages");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Customize Stages</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stage list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {localStages.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-sm font-medium text-foreground flex-1 truncate">
                {stage.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {stage.slug}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleMoveStage(index, "up")}
                  disabled={index === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMoveStage(index, "down")}
                  disabled={index === localStages.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {confirmDeleteId === stage.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      disabled={deletingId === stage.id}
                      className="flex h-6 items-center rounded bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      {deletingId === stage.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                      className="flex h-6 items-center rounded border border-input px-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(stage.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {deleteError && (
            <p className="flex items-center gap-1 text-xs text-destructive px-1">
              <AlertCircle className="h-3 w-3" />
              {deleteError}
            </p>
          )}
        </div>

        {/* Add stage form */}
        {showAddForm ? (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stage Name</label>
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g. Follow Up"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              {newStageName.trim() && (
                <p className="text-xs text-muted-foreground">
                  Slug: <span className="font-mono">{slugify(newStageName)}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewStageColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all",
                      newStageColor === color
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-110",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddForm(false); setNewStageName(""); }}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStage}
                disabled={isSaving || !newStageName.trim()}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  isSaving || !newStageName.trim()
                    ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "Adding..." : "Add Stage"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Stage
          </button>
        )}
      </div>
    </div>
  );
}

function formatValue(value: number, currency?: string): string {
  if (currency) {
    return formatCurrency(value, { currency });
  }
  return formatCurrency(value);
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

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PipelinePage() {
  usePageTitle("Pipeline");
  const toast = useToast();
  const { data: columnDefs, isLoading: columnsLoading, refetch: refetchPipelines } = usePipelines();
  const { data: apiDeals, isLoading: dealsLoading, refetch } = useDeals();
  const { mutate: createDealApi } = useCreateDeal();
  const { mutate: moveDealApi } = useMoveDeal();

  // Local state for optimistic UI (mirrors original behavior)
  const [deals, setDeals] = useState<Record<string, MockDeal[]> | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ deal: MockDeal; fromCol: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  // Add deal form
  const [newTitle, setNewTitle] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newValue, setNewValue] = useState("");
  const [formErrors, setFormErrors] = useState<DealFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const isLoading = columnsLoading || dealsLoading;

  // Derive org default currency from onboarding country
  const orgCurrency = getCurrencyForCountry(getUserCountry());

  // Use local state if available (after first mutation), otherwise API/mock data
  const currentDeals = deals ?? apiDeals;

  function resetForm() {
    setNewTitle("");
    setNewContact("");
    setNewValue("");
    setFormErrors({});
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
    toast.success(`"${draggedDeal.deal.title}" moved to ${colName}`);
    setDraggedDeal(null);
  }

  async function handleAddDeal(colId: string) {
    // Validate
    const errors = validateDealForm(newTitle, newContact, newValue);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

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

    try {
      // Persist via API
      const result = await createDealApi({
        title: deal.title,
        contact: deal.contact,
        value: deal.value,
        stageId: colId,
        currency: orgCurrency,
      });

      setShowAddModal(null);
      resetForm();

      if (result) {
        toast.success(`Deal "${deal.title}" added`);
        refetch();
      } else {
        toast.info(`Deal "${deal.title}" saved locally (API unavailable)`);
      }
    } catch {
      // Remove optimistic deal on hard failure
      setDeals({
        ...prev,
        [colId]: prev[colId],
      });
      toast.error("Failed to save deal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state — show skeleton while initial fetch is in progress
  if (isLoading) {
    return <PipelineSkeleton />;
  }

  const allDeals = Object.values(currentDeals).flat();
  const totalValue = allDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAddModal(null); resetForm(); }} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Add Deal to {columnDefs.find((c) => c.id === showAddModal)?.title}
              </h2>
              <button onClick={() => { setShowAddModal(null); resetForm(); }} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Deal Title *</label>
                <input
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Full Load Pickup"
                  className={cn(
                    "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors",
                    formErrors.title
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-ring",
                  )}
                />
                {formErrors.title && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.title}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Contact Name *</label>
                <input
                  value={newContact}
                  onChange={(e) => {
                    setNewContact(e.target.value);
                    if (formErrors.contact) setFormErrors((prev) => ({ ...prev, contact: undefined }));
                  }}
                  placeholder="Customer name"
                  className={cn(
                    "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors",
                    formErrors.contact
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-ring",
                  )}
                />
                {formErrors.contact && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.contact}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Value ($)</label>
                <input
                  value={newValue}
                  onChange={(e) => {
                    setNewValue(e.target.value.replace(/\D/g, ""));
                    if (formErrors.value) setFormErrors((prev) => ({ ...prev, value: undefined }));
                  }}
                  placeholder="4500"
                  className={cn(
                    "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors",
                    formErrors.value
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-ring",
                  )}
                />
                {formErrors.value && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.value}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowAddModal(null); resetForm(); }} className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleAddDeal(showAddModal)}
                disabled={isSaving}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  isSaving
                    ? "bg-primary/70 text-primary-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Add Deal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Stages Modal */}
      {showCustomizeModal && columnDefs.length > 0 && (
        <CustomizeStagesModal
          stages={columnDefs.map((col, i) => ({
            id: col.stageId ?? col.id,
            name: col.title,
            slug: col.slug ?? col.id,
            color: col.color ?? "#6366f1",
            position: i,
          }))}
          pipelineId={columnDefs[0]?.pipelineId ?? ""}
          onClose={() => setShowCustomizeModal(false)}
          onSaved={() => {
            // refetch pipeline columns to pick up changes
            refetchPipelines();
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allDeals.length} deals &middot; {formatValue(totalValue, orgCurrency)} total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Customize Stages
          </button>
          <button
            onClick={() => setShowAddModal(columnDefs[0]?.id ?? "new_lead")}
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
      </div>

      {/* Empty state for zero deals */}
      {allDeals.length === 0 && (
        <EmptyState
          icon={Kanban}
          title="No deals in your pipeline"
          description="Create your first deal to start tracking revenue. Deals move through stages as you quote, schedule, and complete jobs."
          actionLabel="Create Your First Deal"
          onAction={() => setShowAddModal(columnDefs[0]?.id ?? "new_lead")}
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
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                    {colDeals.length}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatValue(columnTotal, orgCurrency)}
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
                        {formatValue(deal.value, deal.currency ?? orgCurrency)}
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
