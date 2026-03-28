"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Save,
  UserX,
  Trash2,
  CheckCircle2,
  Crown,
  Briefcase,
  Wrench,
  DollarSign,
  Timer,
  Star,
  Clock,
  FileText,
  MessageSquare,
  Kanban,
  CalendarCheck,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useTeamMember, useUpdateTeamMember, useRemoveTeamMember } from "@/lib/hooks/use-team";
import type { TeamMember } from "@/lib/hooks/use-team";

type Role = "Owner" | "Manager" | "Technician";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = [
  "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM",
  "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM",
];

function makeDefaultSchedule(): boolean[][] {
  return daysOfWeek.map((_, dayIdx) =>
    hours.map((_, hourIdx) => {
      if (dayIdx >= 5) return false;
      if (hourIdx >= 1 && hourIdx <= 10) return true;
      return false;
    }),
  );
}

const allPermissions = [
  { key: "view_contacts", label: "View contacts" },
  { key: "edit_contacts", label: "Edit contacts" },
  { key: "view_pipeline", label: "View pipeline" },
  { key: "edit_pipeline", label: "Edit pipeline" },
  { key: "view_inbox", label: "View inbox" },
  { key: "send_messages", label: "Send messages" },
  { key: "view_invoices", label: "View invoices" },
  { key: "create_invoices", label: "Create invoices" },
  { key: "view_analytics", label: "View analytics" },
  { key: "manage_settings", label: "Manage settings" },
] as const;

function mapApiRole(role: string): Role {
  const normalized = role.toLowerCase();
  if (normalized === "owner" || normalized === "admin") return "Owner";
  if (normalized === "manager") return "Manager";
  return "Technician";
}

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case "Owner":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "Manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "Technician":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
}

function activityIcon(type: string) {
  switch (type) {
    case "deal":
      return DollarSign;
    case "message":
      return MessageSquare;
    case "pipeline":
      return Kanban;
    case "calendar":
      return CalendarCheck;
    case "invoice":
      return FileText;
    default:
      return FileText;
  }
}

export default function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: memberFromApi, isLoading, refetch } = useTeamMember(id);
  const { mutate: updateMember } = useUpdateTeamMember(id);
  const { mutate: removeMember } = useRemoveTeamMember(id);

  const toast = useToast();
  const [showConfirmModal, setShowConfirmModal] = useState<"deactivate" | "remove" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("Technician");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<boolean[][]>(makeDefaultSchedule());
  const [initialized, setInitialized] = useState(false);

  // Sync form state when API data arrives
  useEffect(() => {
    if (memberFromApi && memberFromApi.name && !initialized) {
      setName(memberFromApi.name);
      setEmail(memberFromApi.email);
      setPhone(memberFromApi.phone ?? "");
      setRole(mapApiRole(memberFromApi.role));
      setPermissions(new Set(memberFromApi.permissions ?? []));
      setSchedule(memberFromApi.schedule ?? makeDefaultSchedule());
      setInitialized(true);
    }
  }, [memberFromApi, initialized]);

  // Build a memberData-like object for the template to use
  const memberData = memberFromApi && memberFromApi.name ? {
    id: memberFromApi.id,
    name: memberFromApi.name,
    email: memberFromApi.email,
    phone: memberFromApi.phone ?? "",
    role: mapApiRole(memberFromApi.role),
    status: memberFromApi.isActive ? "active" as const : "inactive" as const,
    joinedDate: memberFromApi.joinedAt
      ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(memberFromApi.joinedAt))
      : "Unknown",
    permissions: new Set(memberFromApi.permissions ?? []),
    stats: memberFromApi.stats ?? {
      dealsClosed: 0,
      revenue: 0,
      avgResponseTime: "N/A",
      customerSatisfaction: 0,
    },
    activityLog: memberFromApi.activityLog ?? [],
    schedule: memberFromApi.schedule ?? makeDefaultSchedule(),
  } : null;

  function togglePermission(key: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleScheduleCell(dayIdx: number, hourIdx: number) {
    setSchedule((prev) => {
      const next = prev.map((row) => [...row]);
      next[dayIdx][hourIdx] = !next[dayIdx][hourIdx];
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/team"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading team member...</p>
        </div>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/team"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Team member not found.</p>
        </div>
      </div>
    );
  }

  const RoleIcon = role === "Owner" ? Crown : role === "Manager" ? Briefcase : Wrench;
  const isOwner = memberData.role === "Owner";

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {showConfirmModal === "deactivate"
                  ? "Deactivate Member"
                  : "Remove Member"}
              </h2>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {showConfirmModal === "deactivate"
                ? `Are you sure you want to deactivate ${memberData.name}? They will lose access to the platform.`
                : `Are you sure you want to permanently remove ${memberData.name}? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (showConfirmModal === "deactivate") {
                    const result = await updateMember({ isActive: false });
                    if (result) {
                      toast.success(`${memberData.name} has been deactivated`);
                      refetch();
                    } else {
                      toast.error("Failed to deactivate member. Please try again.");
                    }
                  } else {
                    const result = await removeMember(undefined as unknown as void);
                    if (result) {
                      toast.success(`${memberData.name} has been removed`);
                      // Redirect back to team list after removal
                      setTimeout(() => {
                        window.location.href = "/dashboard/team";
                      }, 1000);
                    } else {
                      toast.error("Failed to remove member. Please try again.");
                    }
                  }
                  setShowConfirmModal(null);
                }}
                className="flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {showConfirmModal === "deactivate" ? (
                  <>
                    <UserX className="h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/dashboard/team"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Link>

      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold",
              roleBadgeClasses(memberData.role),
            )}
          >
            {memberData.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {memberData.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  roleBadgeClasses(memberData.role),
                )}
              >
                <RoleIcon className="h-3 w-3" />
                {memberData.role}
              </span>
              <span className="text-xs text-muted-foreground">
                Joined {memberData.joinedDate}
              </span>
            </div>
          </div>
        </div>
        {!isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmModal("deactivate")}
              className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </button>
            <button
              onClick={() => setShowConfirmModal("remove")}
              className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile + Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-base font-semibold text-foreground">
              Profile Information
            </h2>
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={isOwner}
                  className={cn(
                    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                    isOwner && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <option value="Owner">Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Technician">Technician</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={async () => {
                  const result = await updateMember({ name, email, phone, role: role.toLowerCase() });
                  if (result) {
                    toast.success("Profile updated successfully");
                    refetch();
                  } else {
                    toast.error("Failed to update profile. Please try again.");
                  }
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4",
                  "bg-primary text-primary-foreground text-sm font-medium",
                  "hover:bg-primary/90 transition-colors",
                )}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>

          {/* Permissions */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Permissions
            </h2>
            {isOwner && (
              <p className="text-xs text-muted-foreground">
                Owner has full access to all features. Permissions cannot be
                changed.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {allPermissions.map((perm) => (
                <label
                  key={perm.key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors",
                    isOwner
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={permissions.has(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    disabled={isOwner}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{perm.label}</span>
                </label>
              ))}
            </div>
            {!isOwner && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    const result = await updateMember({ permissions: Array.from(permissions) });
                    if (result) {
                      toast.success("Permissions updated");
                      refetch();
                    } else {
                      toast.error("Failed to update permissions. Please try again.");
                    }
                  }}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save Permissions
                </button>
              </div>
            )}
          </div>

          {/* Schedule / Availability */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Schedule / Availability
            </h2>
            <p className="text-xs text-muted-foreground">
              Click cells to toggle availability. Green means available.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-12" />
                    {hours.map((h) => (
                      <th
                        key={h}
                        className="px-1 py-1.5 text-center font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day, dayIdx) => (
                    <tr key={day}>
                      <td className="px-2 py-1 font-medium text-foreground">
                        {day}
                      </td>
                      {hours.map((_, hourIdx) => (
                        <td key={hourIdx} className="px-0.5 py-0.5">
                          <button
                            onClick={() =>
                              toggleScheduleCell(dayIdx, hourIdx)
                            }
                            className={cn(
                              "h-7 w-full rounded transition-colors",
                              schedule[dayIdx][hourIdx]
                                ? "bg-success/20 hover:bg-success/30 border border-success/30"
                                : "bg-muted/50 hover:bg-muted border border-transparent",
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={async () => {
                  const result = await updateMember({ schedule });
                  if (result) {
                    toast.success("Schedule saved");
                    refetch();
                  } else {
                    toast.error("Failed to save schedule. Please try again.");
                  }
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4",
                  "bg-primary text-primary-foreground text-sm font-medium",
                  "hover:bg-primary/90 transition-colors",
                )}
              >
                <Save className="h-4 w-4" />
                Save Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Stats + Activity */}
        <div className="space-y-6">
          {/* Performance Stats */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Performance
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  Deals Closed
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {memberData.stats.dealsClosed}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Revenue
                </span>
                <span className="text-sm font-semibold text-foreground">
                  ${memberData.stats.revenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  Avg Response
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {memberData.stats.avgResponseTime}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  Satisfaction
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {memberData.stats.customerSatisfaction}/5.0
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Recent Activity
            </h2>
            <div className="space-y-1">
              {memberData.activityLog.map((entry, idx) => {
                const Icon = activityIcon(entry.icon);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {entry.action}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.detail}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
