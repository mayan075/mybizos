"use client";

import { useMemo } from "react";
import { useApiQuery, useApiMutation } from "./use-api";
import {
  type MockContact,
  type MockContactDetail,
  type MockTimelineEntry,
} from "@/lib/types";
import { mockDefaultContact } from "@/lib/mock-data";

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
    [],
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
    contact: { ...mockDefaultContact, id },
    timeline: [],
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
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
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
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  aiScore?: number;
}

function useUpdateContact(contactId: string) {
  return useApiMutation<UpdateContactInput, MockContact>(
    `/orgs/:orgId/contacts/${contactId}`,
    "patch",
  );
}

export { useContacts, useContact, useCreateContact, useUpdateContact };
