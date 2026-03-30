"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface SocialPost {
  id: string;
  orgId: string;
  text: string;
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  metrics: Record<string, number>;
  createdAt: string;
}

interface CreatePostInput {
  text: string;
  platforms: string[];
  status?: "draft" | "scheduled";
  scheduledAt?: string;
  imageUrl?: string;
}

interface AiSuggestion {
  text: string;
  category: string;
}

function useSocialPosts(options: { status?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.status) params.status = options.status;

  return useApiQuery<SocialPost[]>(
    "/orgs/:orgId/social/posts",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useCreatePost() {
  return useApiMutation<CreatePostInput, SocialPost>(
    "/orgs/:orgId/social/posts",
    "post",
  );
}

function useUpdatePost(id: string) {
  return useApiMutation<Partial<CreatePostInput>, SocialPost>(
    `/orgs/:orgId/social/posts/${id}`,
    "patch",
  );
}

function useDeletePost(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/social/posts/${id}`,
    "delete",
  );
}

function useAiSuggestions() {
  return useApiMutation<void, AiSuggestion[]>(
    "/orgs/:orgId/social/suggestions",
    "post",
  );
}

// ── Social Accounts ──

interface SocialAccount {
  id: string;
  orgId: string;
  platform: string;
  accountName: string;
  platformAccountId: string;
  isActive: boolean;
  connectedAt: string;
}

function useSocialAccounts() {
  return useApiQuery<SocialAccount[]>(
    "/orgs/:orgId/social/accounts",
    [],
  );
}

function useConnectPlatform() {
  return useApiMutation<{ platform: string }, { authUrl: string; platform: string }>(
    "/orgs/:orgId/social/connect",
    "post",
  );
}

function useDisconnectAccount(accountId: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/social/accounts/${accountId}`,
    "delete",
  );
}

function usePublishPost(postId: string) {
  return useApiMutation<void, { postId: string; status: string; results: Array<{ platform: string; success: boolean; error?: string }> }>(
    `/orgs/:orgId/social/posts/${postId}/publish`,
    "post",
  );
}

export { useSocialPosts, useCreatePost, useUpdatePost, useDeletePost, useAiSuggestions, useSocialAccounts, useConnectPlatform, useDisconnectAccount, usePublishPost };
export type { SocialPost, CreatePostInput, AiSuggestion, SocialAccount };
