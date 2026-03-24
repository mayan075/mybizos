"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  MoreHorizontal,
  X,
  Trophy,
  DollarSign,
  Timer,
  Bot,
  Shield,
  Pencil,
  Trash2,
  CheckCircle2,
  Search,
  Crown,
  Briefcase,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

type Role = "Owner" | "Manager" | "Technician" | "AI";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  lastLogin: string;
  avatar: string;
  isAI: boolean;
  aiInteractions?: number;
}

interface PerformanceStat {
  name: string;
  role: Role;
  dealsClosed: number;
  revenue: number;
  avgResponseTime: string;
  isAI: boolean;
  aiLabel?: string;
}

const teamMembers: TeamMember[] = [
  {
    id: "tm-1",
    name: "Mayan Kotwal",
    email: "jim@northernremovals.com.au",
    role: "Owner",
    status: "active",
    lastLogin: "Today",
    avatar: "JH",
    isAI: false,
  },
  {
    id: "tm-2",
    name: "Maria Garcia",
    email: "maria@northernremovals.com.au",
    role: "Manager",
    status: "active",
    lastLogin: "Yesterday",
    avatar: "MG",
    isAI: false,
  },
  {
    id: "tm-3",
    name: "Dave Johnson",
    email: "dave@northernremovals.com.au",
    role: "Technician",
    status: "active",
    lastLogin: "2 days ago",
    avatar: "DJ",
    isAI: false,
  },
  {
    id: "tm-4",
    name: "Tyler Smith",
    email: "tyler@northernremovals.com.au",
    role: "Technician",
    status: "active",
    lastLogin: "Today",
    avatar: "TS",
    isAI: false,
  },
  {
    id: "ai-phone",
    name: "AI Phone Agent",
    email: "ai-phone@system",
    role: "AI",
    status: "active",
    lastLogin: "Always active",
    avatar: "AI",
    isAI: true,
    aiInteractions: 342,
  },
  {
    id: "ai-sms",
    name: "AI SMS Agent",
    email: "ai-sms@system",
    role: "AI",
    status: "active",
    lastLogin: "Always active",
    avatar: "AI",
    isAI: true,
    aiInteractions: 890,
  },
];

const performanceStats: PerformanceStat[] = [
  {
    name: "Maria Garcia",
    role: "Manager",
    dealsClosed: 15,
    revenue: 23100,
    avgResponseTime: "2.1 min",
    isAI: false,
  },
  {
    name: "Tyler Smith",
    role: "Technician",
    dealsClosed: 12,
    revenue: 18400,
    avgResponseTime: "3.2 min",
    isAI: false,
  },
  {
    name: "Dave Johnson",
    role: "Technician",
    dealsClosed: 9,
    revenue: 14200,
    avgResponseTime: "4.8 min",
    isAI: false,
  },
  {
    name: "AI Agents",
    role: "AI",
    dealsClosed: 47,
    revenue: 12400,
    avgResponseTime: "8 sec",
    isAI: true,
    aiLabel: "47 appointments booked",
  },
];

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

type PermissionKey = (typeof allPermissions)[number]["key"];

const managerDefaults: PermissionKey[] = [
  "view_contacts",
  "edit_contacts",
  "view_pipeline",
  "edit_pipeline",
  "view_inbox",
  "send_messages",
  "view_invoices",
  "create_invoices",
  "view_analytics",
  "manage_settings",
];

const technicianDefaults: PermissionKey[] = [
  "view_contacts",
  "view_pipeline",
  "view_inbox",
  "send_messages",
  "view_invoices",
];

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case "Owner":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "Manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "Technician":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "AI":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
  }
}

function roleIcon(role: Role) {
  switch (role) {
    case "Owner":
      return Crown;
    case "Manager":
      return Briefcase;
    case "Technician":
      return Wrench;
    case "AI":
      return Bot;
  }
}

function avatarBgClasses(role: Role): string {
  switch (role) {
    case "Owner":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "Manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "Technician":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "AI":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
  }
}

export default function TeamPage() {
  usePageTitle("Team");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Manager" | "Technician">("Technician");
  const [invitePermissions, setInvitePermissions] = useState<Set<PermissionKey>>(
    new Set(technicianDefaults),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleRoleChange(role: "Manager" | "Technician") {
    setInviteRole(role);
    setInvitePermissions(
      new Set(role === "Manager" ? managerDefaults : technicianDefaults),
    );
  }

  function togglePermission(key: PermissionKey) {
    setInvitePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    showToast(`Invitation sent to ${inviteEmail}`);
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("Technician");
    setInvitePermissions(new Set(technicianDefaults));
  }

  const filteredMembers = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Invite Team Member
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address *
                </label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  type="email"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    handleRoleChange(e.target.value as "Manager" | "Technician")
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  <option value="Manager">Manager</option>
                  <option value="Technician">Technician</option>
                </select>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Permissions
                </label>
                <div className="space-y-2">
                  {allPermissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={invitePermissions.has(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span className="text-sm text-foreground">
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim()}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  inviteEmail.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <UserPlus className="h-4 w-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {teamMembers.filter((m) => !m.isAI).length} team members &middot;{" "}
            {teamMembers.filter((m) => m.isAI).length} AI agents
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Login
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.map((member) => {
                const RoleIcon = roleIcon(member.role);
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={
                          member.isAI
                            ? "/dashboard/settings"
                            : `/dashboard/team/${member.id}`
                        }
                        className="flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            avatarBgClasses(member.role),
                          )}
                        >
                          {member.isAI ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            member.avatar
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {member.name}
                          </p>
                          {member.isAI && member.aiInteractions && (
                            <p className="text-xs text-muted-foreground">
                              {member.aiInteractions.toLocaleString()}{" "}
                              interactions
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          roleBadgeClasses(member.role),
                        )}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">
                      {member.isAI ? (
                        <span className="text-muted-foreground italic">
                          System
                        </span>
                      ) : (
                        member.email
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          member.status === "active"
                            ? "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            member.status === "active"
                              ? "bg-success"
                              : "bg-muted-foreground",
                          )}
                        />
                        {member.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {member.lastLogin}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!member.isAI ? (
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/team/${member.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() =>
                              showToast(
                                `Remove ${member.name}? This action requires confirmation.`,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/dashboard/settings"
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          Configure
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No team members found matching &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Leaderboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">
            Team Performance
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceStats.map((stat, idx) => (
            <div
              key={stat.name}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      avatarBgClasses(stat.role),
                    )}
                  >
                    {stat.isAI ? (
                      <Bot className="h-5 w-5" />
                    ) : (
                      stat.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {stat.name}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        roleBadgeClasses(stat.role),
                      )}
                    >
                      {stat.role}
                    </span>
                  </div>
                </div>
                {idx === 0 && (
                  <Trophy className="h-5 w-5 text-warning" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    {stat.isAI ? "Appts Booked" : "Deals Closed"}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {stat.dealsClosed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Revenue
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    ${stat.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    Avg Response
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {stat.avgResponseTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
