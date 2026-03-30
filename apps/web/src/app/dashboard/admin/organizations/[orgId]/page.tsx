"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Contact2,
  Briefcase,
  Wallet,
  Ban,
  CheckCircle2,
  LogIn,
  Globe,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAdminOrgDetail } from "@/lib/hooks/use-admin-api";
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { getToken, storeToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const toast = useToast();

  const { data, loading, refetch } = useAdminOrgDetail(orgId);
  const [activeTab, setActiveTab] = useState<"members" | "activity">("members");

  usePageTitle(data?.organization.name ? `Admin — ${data.organization.name}` : "Admin — Organization");

  const handleSuspend = useCallback(async () => {
    const reason = prompt("Reason for suspending this organization:");
    if (!reason) return;

    try {
      await apiClient.patch(`/admin/organizations/${orgId}/suspend`, { reason });
      toast.success("Organization suspended");
      refetch();
    } catch {
      toast.error("Failed to suspend");
    }
  }, [orgId, toast, refetch]);

  const handleActivate = useCallback(async () => {
    try {
      await apiClient.patch(`/admin/organizations/${orgId}/activate`, {});
      toast.success("Organization activated");
      refetch();
    } catch {
      toast.error("Failed to activate");
    }
  }, [orgId, toast, refetch]);

  const handleImpersonate = useCallback(async () => {
    const confirmed = confirm(
      "You will be logged in as this organization's owner. Your current session will be saved.\n\nContinue?",
    );
    if (!confirmed) return;

    try {
      const result = await apiClient.post<{
        token: string;
        orgName: string;
        ownerName: string;
        expiresIn: string;
      }>(`/admin/organizations/${orgId}/impersonate`, {});

      // Save current admin token so we can restore it
      const currentToken = getToken();
      sessionStorage.setItem(
        "hararai_impersonating",
        JSON.stringify({ orgName: result.orgName, originalToken: currentToken }),
      );

      // Switch to the impersonated token
      storeToken(result.token);
      toast.success(`Now viewing as ${result.orgName}`);

      // Redirect to the org's dashboard
      window.location.href = "/dashboard";
    } catch {
      toast.error("Failed to impersonate");
    }
  }, [orgId, toast]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const org = data.organization;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to organizations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {org.name}
            </h1>
            {org.suspendedAt ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Suspended
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="capitalize">{org.industry}</span>
            {org.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {org.email}
              </span>
            )}
            {org.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {org.phone}
              </span>
            )}
            {org.website && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" /> {org.website}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Created {formatDate(new Date(org.createdAt))}
            </span>
          </div>
          {org.suspendedAt && org.suspendedReason && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Suspended: {org.suspendedReason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImpersonate}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <LogIn className="h-3.5 w-3.5" /> Login as
          </button>
          {org.suspendedAt ? (
            <button
              onClick={handleActivate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Activate
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              <Ban className="h-3.5 w-3.5" /> Suspend
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Members", value: data.members.length, icon: Users, color: "text-blue-500" },
          { label: "Contacts", value: data.contactCount, icon: Contact2, color: "text-emerald-500" },
          { label: "Deals", value: data.dealCount, icon: Briefcase, color: "text-violet-500" },
          {
            label: "Wallet",
            value: `$${Number(data.walletBalance).toFixed(2)}`,
            icon: Wallet,
            color: "text-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-zinc-800">
        <div className="flex gap-6">
          {(["members", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "border-b-2 pb-2 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "members" && (
        <div className="overflow-x-auto rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-800">
              {data.members.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link
                      href={`/dashboard/admin/users/${member.userId}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {member.userName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {member.userEmail}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        member.role === "owner"
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
                          : member.role === "admin"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                      )}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(new Date(member.joinedAt))}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {member.lastLoginAt
                      ? formatRelativeTime(new Date(member.lastLoginAt))
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.members.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No members
            </p>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <AdminActivityFeed
          activity={data.recentActivity.map((a) => ({
            ...a,
            resourceId: null,
            userEmail: null,
            orgId,
            orgName: org.name,
          }))}
        />
      )}
    </div>
  );
}
