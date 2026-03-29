"use client";

import { useApiQuery, useApiMutation } from "./use-api";

// --------------------------------------------------------
// Types
// --------------------------------------------------------

export interface BookableService {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  qualifyingQuestions: string[];
  teamMembers: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CreateBookableServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  isActive?: boolean;
  qualifyingQuestions?: string[];
}

export interface UpdateBookableServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  isActive?: boolean;
  qualifyingQuestions?: string[];
}

// --------------------------------------------------------
// useBookableServices — fetch all bookable services
// --------------------------------------------------------

function useBookableServices() {
  return useApiQuery<BookableService[]>(
    "/orgs/:orgId/bookable-services",
    [],
  );
}

// --------------------------------------------------------
// useCreateBookableService
// --------------------------------------------------------

function useCreateBookableService() {
  return useApiMutation<CreateBookableServiceInput, BookableService>(
    "/orgs/:orgId/bookable-services",
    "post",
  );
}

// --------------------------------------------------------
// useUpdateBookableService
// --------------------------------------------------------

function useUpdateBookableService(serviceId: string) {
  return useApiMutation<UpdateBookableServiceInput, BookableService>(
    `/orgs/:orgId/bookable-services/${serviceId}`,
    "patch",
  );
}

// --------------------------------------------------------
// useDeleteBookableService
// --------------------------------------------------------

function useDeleteBookableService(serviceId: string) {
  return useApiMutation<Record<string, never>, BookableService>(
    `/orgs/:orgId/bookable-services/${serviceId}`,
    "delete",
  );
}

// --------------------------------------------------------
// useTeamMembers — fetch org team members for assignment
// --------------------------------------------------------

function useTeamMembers() {
  return useApiQuery<TeamMember[]>(
    "/orgs/:orgId/team",
    [],
  );
}

export {
  useBookableServices,
  useCreateBookableService,
  useUpdateBookableService,
  useDeleteBookableService,
  useTeamMembers,
};
