"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface Review {
  id: string;
  orgId: string;
  contactId: string | null;
  platform: "google" | "facebook" | "yelp" | "internal";
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  aiResponse: string | null;
  responsePosted: boolean;
  reviewUrl: string | null;
  sentiment: "positive" | "neutral" | "negative";
  createdAt: string;
}

interface ReviewCampaign {
  id: string;
  orgId: string;
  name: string;
  triggerType: "after_appointment" | "after_deal_won" | "manual";
  delayHours: number;
  messageTemplate: string | null;
  channel: "sms" | "email" | "both";
  isActive: boolean;
  sentCount: number;
  reviewCount: number;
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  needsResponse: number;
  platformBreakdown: Record<string, number>;
}

interface CreateReviewInput {
  contactId?: string;
  platform: string;
  rating: number;
  reviewText?: string;
  reviewerName: string;
  reviewUrl?: string;
  sentiment?: string;
}

interface CreateReviewCampaignInput {
  name: string;
  triggerType: string;
  delayHours?: number;
  messageTemplate?: string;
  channel?: string;
  isActive?: boolean;
}

function useReviews(options: { platform?: string; sentiment?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.platform) params.platform = options.platform;
  if (options.sentiment) params.sentiment = options.sentiment;

  return useApiQuery<Review[]>(
    "/orgs/:orgId/reviews",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useReviewStats() {
  return useApiQuery<ReviewStats>(
    "/orgs/:orgId/reviews/stats",
    { totalReviews: 0, averageRating: 0, ratingDistribution: {}, needsResponse: 0, platformBreakdown: {} },
  );
}

function useCreateReview() {
  return useApiMutation<CreateReviewInput, Review>(
    "/orgs/:orgId/reviews",
    "post",
  );
}

function useGenerateResponse(reviewId: string) {
  return useApiMutation<void, { response: string }>(
    `/orgs/:orgId/reviews/${reviewId}/generate-response`,
    "post",
  );
}

function usePostResponse(reviewId: string) {
  return useApiMutation<{ response: string }, Review>(
    `/orgs/:orgId/reviews/${reviewId}/respond`,
    "post",
  );
}

function useReviewCampaigns() {
  return useApiQuery<ReviewCampaign[]>(
    "/orgs/:orgId/reviews/campaigns",
    [],
  );
}

function useCreateReviewCampaign() {
  return useApiMutation<CreateReviewCampaignInput, ReviewCampaign>(
    "/orgs/:orgId/reviews/campaigns",
    "post",
  );
}

export {
  useReviews,
  useReviewStats,
  useCreateReview,
  useGenerateResponse,
  usePostResponse,
  useReviewCampaigns,
  useCreateReviewCampaign,
};

export type { Review, ReviewCampaign, ReviewStats };
