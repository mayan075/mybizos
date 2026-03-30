"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Contact2,
  Briefcase,
  Wallet,
  ArrowRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import {
  useAdminStats,
  useAdminGrowth,
  useAdminActivity,
  useAdminHealth,
  useAdminOrgs,
} from "@/lib/hooks/use-admin-api";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed";
import { HealthDot } from "@/components/admin/health-status-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewPage() {
  usePageTitle("Admin — Overview");

  const { data: stats, loading: statsLoading } = useAdminStats();
  const { data: growth, loading: growthLoading } = useAdminGrowth();
  const { data: activityData, loading: activityLoading } = useAdminActivity();
  const { data: healthData, loading: healthLoading } = useAdminHealth();
  const { data: orgsData, loading: orgsLoading } = useAdminOrgs({ limit: 5 });

  // Build sparkline arrays from growth data (cumulative daily counts)
  const orgSparkline = useMemo(
    () => growth.orgGrowth.map((p) => p.count),
    [growth.orgGrowth],
  );
  const userSparkline = useMemo(
    () => growth.userGrowth.map((p) => p.count),
    [growth.userGrowth],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white">
          <Shield className="h-5 w-5 text-white dark:text-zinc-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Admin Command Center
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Platform overview and management
          </p>
        </div>
      </div>

      {/* Health strip */}
      <div className="flex items-center gap-5 rounded-lg border bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Services
        </span>
        {healthLoading ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          Object.entries(healthData.services).map(([name, svc]) => (
            <HealthDot key={name} name={name} status={svc.status} />
          ))
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard
          label="Organizations"
          value={stats.totalOrgs}
          icon={Building2}
          sparklineData={orgSparkline}
          borderColor="border-t-blue-500"
          sparklineColor="#3b82f6"
          loading={statsLoading || growthLoading}
        />
        <AdminStatCard
          label="Users"
          value={stats.totalUsers}
          icon={Users}
          sparklineData={userSparkline}
          borderColor="border-t-emerald-500"
          sparklineColor="#10b981"
          loading={statsLoading || growthLoading}
        />
        <AdminStatCard
          label="Contacts"
          value={stats.totalContacts}
          icon={Contact2}
          borderColor="border-t-violet-500"
          sparklineColor="#8b5cf6"
          loading={statsLoading}
        />
        <AdminStatCard
          label="Deals"
          value={stats.totalDeals}
          icon={Briefcase}
          borderColor="border-t-amber-500"
          sparklineColor="#f59e0b"
          loading={statsLoading}
        />
        <AdminStatCard
          label="Wallet Balance"
          value={`$${Number(stats.totalWalletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          borderColor="border-t-pink-500"
          sparklineColor="#ec4899"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent activity — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/admin/audit-logs"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <AdminActivityFeed
            activity={activityData.activity}
            loading={activityLoading}
          />
        </div>

        {/* Latest signups — 1/3 width */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Latest Signups
            </h2>
            <Link
              href="/dashboard/admin/organizations"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {orgsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : orgsData.organizations.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No organizations yet
            </p>
          ) : (
            <div className="space-y-2">
              {orgsData.organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/dashboard/admin/organizations/${org.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {org.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                      {org.industry}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{org.memberCount} members</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Manage Orgs", href: "/dashboard/admin/organizations", icon: Building2 },
          { label: "Manage Users", href: "/dashboard/admin/users", icon: Users },
          { label: "System Health", href: "/dashboard/admin/health", icon: Shield },
          { label: "Platform Settings", href: "/dashboard/admin/settings", icon: Wallet },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <action.icon className="h-5 w-5 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
