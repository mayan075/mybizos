"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Users,
  MessageSquare,
  X,
  Loader2,
  Timer,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { apiClient, tryFetch } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import {
  useBookableServices,
  useCreateBookableService,
  useTeamMembers,
  type BookableService,
  type TeamMember,
} from "@/lib/hooks/use-bookable-services";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Types for form state
// ---------------------------------------------------------------------------

interface ServiceFormData {
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  qualifyingQuestions: string[];
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  durationMinutes: 60,
  bufferMinutes: 0,
  isActive: true,
  qualifyingQuestions: [],
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BookableServicesPage() {
  usePageTitle("Bookable Services");
  const toast = useToast();

  // Data hooks
  const { data: services, isLoading, refetch } = useBookableServices();
  const { data: teamMembers } = useTeamMembers();
  const { mutate: createService, isLoading: isCreating } = useCreateBookableService();

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<BookableService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [newQuestion, setNewQuestion] = useState("");

  // Delete confirmation state
  const [deletingService, setDeletingService] = useState<BookableService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Team member assignment state
  const [assigningService, setAssigningService] = useState<BookableService | null>(null);

  // Saving state for update
  const [isSaving, setIsSaving] = useState(false);

  // Toggle active/inactive
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Dialog helpers
  // ------------------------------------------------------------------

  function openCreate() {
    setEditingService(null);
    setFormData(defaultFormData);
    setNewQuestion("");
    setShowDialog(true);
  }

  function openEdit(service: BookableService) {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      isActive: service.isActive,
      qualifyingQuestions: [...service.qualifyingQuestions],
    });
    setNewQuestion("");
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditingService(null);
    setFormData(defaultFormData);
    setNewQuestion("");
  }

  // ------------------------------------------------------------------
  // Qualifying questions
  // ------------------------------------------------------------------

  function addQuestion() {
    const q = newQuestion.trim();
    if (!q) return;
    setFormData((prev) => ({
      ...prev,
      qualifyingQuestions: [...prev.qualifyingQuestions, q],
    }));
    setNewQuestion("");
  }

  function removeQuestion(index: number) {
    setFormData((prev) => ({
      ...prev,
      qualifyingQuestions: prev.qualifyingQuestions.filter((_, i) => i !== index),
    }));
  }

  // ------------------------------------------------------------------
  // Save (create or update)
  // ------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error("Service name is required.");
      return;
    }

    if (editingService) {
      // Update existing
      setIsSaving(true);
      try {
        const path = buildPath(`/orgs/:orgId/bookable-services/${editingService.id}`);
        if (!path) return;
        const result = await tryFetch(() => apiClient.patch(path, formData));
        if (result) {
          toast.success(`"${formData.name}" updated.`);
          refetch();
          closeDialog();
        } else {
          toast.error("Failed to update service.");
        }
      } catch {
        toast.error("Failed to update service.");
      }
      setIsSaving(false);
    } else {
      // Create new
      const result = await createService({
        name: formData.name.trim(),
        description: formData.description.trim(),
        durationMinutes: formData.durationMinutes,
        bufferMinutes: formData.bufferMinutes,
        isActive: formData.isActive,
        qualifyingQuestions: formData.qualifyingQuestions,
      });
      if (result) {
        toast.success(`"${formData.name}" created.`);
        refetch();
        closeDialog();
      } else {
        toast.error("Failed to create service.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, editingService]);

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      const path = buildPath(`/orgs/:orgId/bookable-services/${deletingService.id}`);
      if (!path) return;
      await tryFetch(() => apiClient.delete(path));
      toast.success(`"${deletingService.name}" deleted.`);
      refetch();
    } catch {
      toast.error("Failed to delete service.");
    }
    setIsDeleting(false);
    setDeletingService(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingService]);

  // ------------------------------------------------------------------
  // Toggle active
  // ------------------------------------------------------------------

  const handleToggleActive = useCallback(async (service: BookableService) => {
    setTogglingId(service.id);
    try {
      const path = buildPath(`/orgs/:orgId/bookable-services/${service.id}`);
      if (!path) return;
      const result = await tryFetch(() =>
        apiClient.patch(path, { isActive: !service.isActive }),
      );
      if (result) {
        toast.success(
          `"${service.name}" ${service.isActive ? "deactivated" : "activated"}.`,
        );
        refetch();
      } else {
        toast.error("Failed to update service.");
      }
    } catch {
      toast.error("Failed to update service.");
    }
    setTogglingId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Team member assignment
  // ------------------------------------------------------------------

  const handleAddMember = useCallback(async (service: BookableService, memberId: string) => {
    try {
      const path = buildPath(`/orgs/:orgId/bookable-services/${service.id}/team/${memberId}`);
      if (!path) return;
      await tryFetch(() => apiClient.post(path, {}));
      toast.success("Team member added.");
      refetch();
      setAssigningService(null);
    } catch {
      toast.error("Failed to add team member.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveMember = useCallback(async (service: BookableService, memberId: string) => {
    try {
      const path = buildPath(`/orgs/:orgId/bookable-services/${service.id}/team/${memberId}`);
      if (!path) return;
      await tryFetch(() => apiClient.delete(path));
      toast.success("Team member removed.");
      refetch();
    } catch {
      toast.error("Failed to remove team member.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---- Create/Edit Dialog ---- */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingService ? "Edit Service" : "New Service"}
              </h2>
              <button
                onClick={closeDialog}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Service Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. AC Installation, Plumbing Inspection"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the service"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Duration & Buffer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, durationMinutes: Number(e.target.value) || 0 }))
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Buffer (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={formData.bufferMinutes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, bufferMinutes: Number(e.target.value) || 0 }))
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                    formData.isActive ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5",
                      formData.isActive ? "translate-x-[22px]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>

              {/* Qualifying Questions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Qualifying Questions
                </label>
                <p className="text-xs text-muted-foreground">
                  Questions your AI agent will ask when booking this service.
                </p>
                {formData.qualifyingQuestions.length > 0 && (
                  <ul className="space-y-1.5">
                    {formData.qualifyingQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-input px-3 py-2 text-sm text-foreground"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{q}</span>
                        <button
                          onClick={() => removeQuestion(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. What size is your unit?"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQuestion();
                      }
                    }}
                    className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={addQuestion}
                    disabled={!newQuestion.trim()}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                      newQuestion.trim()
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : "bg-muted/50 text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Dialog actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <button
                onClick={closeDialog}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || isSaving || isCreating}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  formData.name.trim() && !isSaving && !isCreating
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                {(isSaving || isCreating) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingService ? "Save Changes" : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Dialog ---- */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeletingService(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground">Delete Service</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">&quot;{deletingService.name}&quot;</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeletingService(null)}
                disabled={isDeleting}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Team Member Assignment Dialog ---- */}
      {assigningService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAssigningService(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Add Team Member</h2>
              <button
                onClick={() => setAssigningService(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No team members found. Add team members in your organization settings first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {teamMembers
                  .filter(
                    (tm) =>
                      !assigningService.teamMembers.some((m) => m.id === tm.id),
                  )
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleAddMember(assigningService, member.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                {teamMembers.filter(
                  (tm) =>
                    !assigningService.teamMembers.some((m) => m.id === tm.id),
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    All team members are already assigned.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookable Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {services.length === 0
              ? "Configure the services your business offers"
              : `${services.length} service${services.length === 1 ? "" : "s"} configured`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      {/* ---- Empty State ---- */}
      {services.length === 0 && (
        <EmptyState
          icon={Clock}
          title="No services configured yet"
          description="Add your first bookable service. Services define the appointments your customers can book and the qualifying questions your AI agent will ask."
          actionLabel="Add Your First Service"
          onAction={openCreate}
          className="rounded-xl border border-border bg-card"
        />
      )}

      {/* ---- Service Cards Grid ---- */}
      {services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "rounded-xl border bg-card p-5 transition-shadow hover:shadow-md",
                service.isActive ? "border-border" : "border-border/50 opacity-70",
              )}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Active toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={service.isActive}
                  aria-label={service.isActive ? "Deactivate service" : "Activate service"}
                  disabled={togglingId === service.id}
                  onClick={() => handleToggleActive(service)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                    service.isActive ? "bg-primary" : "bg-muted",
                    togglingId === service.id && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5",
                      service.isActive ? "translate-x-[22px]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Clock className="h-3 w-3" />
                  {service.durationMinutes} min
                </span>
                {service.bufferMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {service.bufferMinutes} min buffer
                  </span>
                )}
                {!service.isActive && (
                  <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Inactive
                  </span>
                )}
              </div>

              {/* Team members */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Team Members
                  </span>
                </div>
                {service.teamMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No members assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {service.teamMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground group"
                      >
                        {member.name}
                        <button
                          onClick={() => handleRemoveMember(service, member.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Remove ${member.name}`}
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setAssigningService(service)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <UserPlus className="h-3 w-3" />
                  Add Member
                </button>
              </div>

              {/* Qualifying questions */}
              {service.qualifyingQuestions.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Qualifying Questions ({service.qualifyingQuestions.length})
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {service.qualifyingQuestions.slice(0, 3).map((q, i) => (
                      <li key={i} className="text-xs text-muted-foreground truncate">
                        {i + 1}. {q}
                      </li>
                    ))}
                    {service.qualifyingQuestions.length > 3 && (
                      <li className="text-xs text-muted-foreground italic">
                        +{service.qualifyingQuestions.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Card actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => openEdit(service)}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-input text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeletingService(service)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  aria-label={`Delete ${service.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
