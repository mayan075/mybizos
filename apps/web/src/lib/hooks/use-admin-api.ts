"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, tryFetch } from "@/lib/api-client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalOrgs: number;
  totalUsers: number;
  totalContacts: number;
  totalDeals: number;
  totalWalletBalance: string;
}

export interface GrowthPoint {
  date: string;
  count: number;
}

export interface GrowthData {
  orgGrowth: GrowthPoint[];
  userGrowth: GrowthPoint[];
}

export interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  orgId: string;
  orgName: string | null;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  industry: string;
  industryCategory: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  memberCount: number;
  contactCount: number;
  dealCount: number;
  lastMemberLogin: string | null;
}

export interface AdminOrgDetail {
  organization: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    industryCategory: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    suspendedAt: string | null;
    suspendedReason: string | null;
    createdAt: string;
  };
  members: Array<{
    id: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    userId: string;
    userName: string;
    userEmail: string;
    lastLoginAt: string | null;
  }>;
  contactCount: number;
  dealCount: number;
  walletBalance: string;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    description: string;
    createdAt: string;
    userName: string | null;
  }>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  organizations: Array<{
    userId: string;
    orgId: string;
    orgName: string;
    role: string;
  }>;
}

export interface AdminUserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    disabledAt: string | null;
    disabledReason: string | null;
    lastLoginAt: string | null;
    createdAt: string;
  };
  memberships: Array<{
    orgId: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    orgName: string;
    orgSlug: string;
    orgIndustry: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    description: string;
    createdAt: string;
    orgName: string | null;
  }>;
}

export interface HealthService {
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  message: string;
}

export interface HealthData {
  status: "healthy" | "degraded" | "down";
  services: Record<string, HealthService>;
  checkedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  orgId: string;
  orgName: string | null;
}

// ── Generic hook ─────────────────────────────────────────────────────────────

function useAdminData<T>(endpoint: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tryFetch(() => apiClient.get<T>(endpoint));
      if (result) setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useAdminData<AdminStats>("/admin/stats", {
    totalOrgs: 0,
    totalUsers: 0,
    totalContacts: 0,
    totalDeals: 0,
    totalWalletBalance: "0",
  });
}

export function useAdminGrowth() {
  return useAdminData<GrowthData>("/admin/stats/growth", {
    orgGrowth: [],
    userGrowth: [],
  });
}

export function useAdminActivity() {
  return useAdminData<{ activity: ActivityItem[] }>("/admin/activity", {
    activity: [],
  });
}

export function useAdminOrgs(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();

  return useAdminData<{
    organizations: AdminOrg[];
    total: number;
    limit: number;
    offset: number;
  }>(`/admin/organizations${qs ? `?${qs}` : ""}`, {
    organizations: [],
    total: 0,
    limit: 50,
    offset: 0,
  });
}

export function useAdminOrgDetail(orgId: string) {
  return useAdminData<AdminOrgDetail | null>(
    `/admin/organizations/${orgId}`,
    null,
  );
}

export function useAdminUsers(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();

  return useAdminData<{
    users: AdminUser[];
    total: number;
    limit: number;
    offset: number;
  }>(`/admin/users${qs ? `?${qs}` : ""}`, {
    users: [],
    total: 0,
    limit: 50,
    offset: 0,
  });
}

export function useAdminUserDetail(userId: string) {
  return useAdminData<AdminUserDetail | null>(`/admin/users/${userId}`, null);
}

export function useAdminHealth() {
  return useAdminData<HealthData>("/admin/health", {
    status: "degraded",
    services: {},
    checkedAt: new Date().toISOString(),
  });
}

export function useAdminAuditLogs(params?: {
  action?: string;
  orgId?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.action) searchParams.set("action", params.action);
  if (params?.orgId) searchParams.set("orgId", params.orgId);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();

  return useAdminData<{
    logs: AuditLogEntry[];
    total: number;
    limit: number;
    offset: number;
  }>(`/admin/audit-logs${qs ? `?${qs}` : ""}`, {
    logs: [],
    total: 0,
    limit: 50,
    offset: 0,
  });
}
