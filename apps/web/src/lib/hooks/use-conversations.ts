"use client";

import { useMemo } from "react";
import { useApiQuery, useApiMutation } from "./use-api";
import {
  type MockConversation,
  type MockChatMessage,
} from "@/lib/types";

// --------------------------------------------------------
// useConversations — inbox list with optional filters
// --------------------------------------------------------

interface UseConversationsOptions {
  filter?: "all" | "unread" | "ai";
  search?: string;
}

function useConversations(options: UseConversationsOptions = {}) {
  const params: Record<string, string> = {};
  if (options.filter && options.filter !== "all") params.filter = options.filter;
  if (options.search) params.search = options.search;

  const result = useApiQuery<MockConversation[]>(
    "/orgs/:orgId/conversations",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );

  // Client-side filtering on mock data
  const filtered = useMemo(() => {
    if (result.isLive) return result.data;

    let list = result.data;
    if (options.filter === "unread") {
      list = list.filter((c) => c.unread);
    } else if (options.filter === "ai") {
      list = list.filter((c) => c.aiHandled);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contact.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q),
      );
    }
    return list;
  }, [result.data, result.isLive, options.filter, options.search]);

  return { ...result, data: filtered };
}

// --------------------------------------------------------
// useMessages — messages for a single conversation
// --------------------------------------------------------

function useMessages(conversationId: string) {
  const fallback: MockChatMessage[] = [];

  return useApiQuery<MockChatMessage[]>(
    `/orgs/:orgId/conversations/${conversationId}/messages`,
    fallback,
  );
}

// --------------------------------------------------------
// useSendMessage
// --------------------------------------------------------

interface SendMessageInput {
  text: string;
}

function useSendMessage(conversationId: string) {
  return useApiMutation<SendMessageInput, MockChatMessage>(
    `/orgs/:orgId/conversations/${conversationId}/messages`,
    "post",
  );
}

export { useConversations, useMessages, useSendMessage };
