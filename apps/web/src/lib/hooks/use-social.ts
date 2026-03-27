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

export { useSocialPosts, useCreatePost, useUpdatePost, useDeletePost, useAiSuggestions };
export type { SocialPost, CreatePostInput, AiSuggestion };
