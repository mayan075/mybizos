"use client";

import { useCallback, useMemo } from "react";
import { useApiQuery, useApiMutation, getOrgId } from "./use-api";
import {
  mockContacts,
  mockContactDetails,
  mockDefaultContact,
  mockTimeline,
  type MockContact,
  type MockContactDetail,
  type MockTimelineEntry,
} from "@/lib/mock-data";

// --------------------------------------------------------
// useContacts — list with optional search / filter
// --------------------------------------------------------

interface UseContactsOptions {
  search?: string;
  tags?: string[];
}

function useContacts(options: UseContactsOptions = {}) {
  const params: Record<string, string> = {};
  if (options.search) params.search = options.search;
  if (options.tags && options.tags.length > 0) params.tags = options.tags.join(",");

  const result = useApiQuery<MockContact[]>(
    "/orgs/:orgId/contacts",
    mockContacts,
    Object.keys(params).length > 0 ? params : undefined,
  );

  // Client-side filtering on mock data (API would handle this server-side)
  const filtered = useMemo(() => {
    if (result.isLive) return result.data;

    let list = result.data;
    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(options.search ?? ""),
      );
    }
    return list;
  }, [result.data, result.isLive, options.search]);

  return { ...result, data: filtered };
}

// --------------------------------------------------------
// useContact — single contact with timeline
// --------------------------------------------------------

interface ContactWithTimeline {
  contact: MockContactDetail;
  timeline: MockTimelineEntry[];
}

function useContact(id: string) {
  const fallback: ContactWithTimeline = {
    contact: mockContactDetails[id] ?? { ...mockDefaultContact, id },
    timeline: mockTimeline,
  };

  return useApiQuery<ContactWithTimeline>(
    `/orgs/:orgId/contacts/${id}`,
    fallback,
  );
}

// --------------------------------------------------------
// useCreateContact
// --------------------------------------------------------

interface CreateContactInput {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
}

function useCreateContact() {
  return useApiMutation<CreateContactInput, MockContact>(
    "/orgs/:orgId/contacts",
    "post",
  );
}

// --------------------------------------------------------
// useUpdateContact
// --------------------------------------------------------

interface UpdateContactInput {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  score?: number;
}

function useUpdateContact() {
  const orgId = getOrgId();

  const mutation = useApiMutation<UpdateContactInput, MockContact>(
    "/orgs/:orgId/contacts",
    "patch",
  );

  const mutate = useCallback(
    async (input: UpdateContactInput) => {
      // Override endpoint to include the contact id
      const { mutate: baseMutate } = mutation;
      // For now, we call the base mutate which uses the template endpoint.
      // When the API is live, the route handler will parse the id from the body.
      return baseMutate(input);
    },
    [mutation],
  );

  return { ...mutation, mutate };
}

export { useContacts, useContact, useCreateContact, useUpdateContact };
