"use client";

import { useApiQuery, useApiMutation } from "./use-api";

// --------------------------------------------------------
// Types
// --------------------------------------------------------

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: "owner" | "admin" | "manager" | "technician" | "member";
  isActive: boolean;
  joinedAt: string | null;
  permissions?: string[];
  schedule?: boolean[][];
  stats?: {
    dealsClosed: number;
    revenue: number;
    avgResponseTime: string;
    customerSatisfaction: number;
  };
  activityLog?: {
    action: string;
    detail: string;
    time: string;
    icon: "deal" | "message" | "pipeline" | "calendar" | "invoice";
  }[];
}

interface UpdateTeamMemberInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  schedule?: boolean[][];
  isActive?: boolean;
}

// --------------------------------------------------------
// useTeam — list all team members
// --------------------------------------------------------

function useTeam() {
  return useApiQuery<TeamMember[]>(
    "/orgs/:orgId/team",
    [],
  );
}

// --------------------------------------------------------
// useTeamMember — single team member
// --------------------------------------------------------

function useTeamMember(id: string) {
  return useApiQuery<TeamMember>(
    `/orgs/:orgId/team/${id}`,
    {
      id,
      userId: "",
      name: "",
      email: "",
      role: "member",
      isActive: true,
      joinedAt: null,
    },
  );
}

// --------------------------------------------------------
// useUpdateTeamMember
// --------------------------------------------------------

function useUpdateTeamMember(id: string) {
  return useApiMutation<UpdateTeamMemberInput, TeamMember>(
    `/orgs/:orgId/team/${id}`,
    "patch",
  );
}

// --------------------------------------------------------
// useRemoveTeamMember
// --------------------------------------------------------

function useRemoveTeamMember(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/team/${id}`,
    "delete",
  );
}

export {
  useTeam,
  useTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
};

export type { TeamMember, UpdateTeamMemberInput };
