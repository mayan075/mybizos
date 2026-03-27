"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Star,
  ArrowLeft,
  Sparkles,
  Check,
  ExternalLink,
  User,
  Calendar,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReview, useGenerateResponse, usePostResponse } from "@/lib/hooks/use-reviews";
import type { Review } from "@/lib/hooks/use-reviews";

// ── Helper Components ──

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: Review["platform"] }) {
  const configs: Record<Review["platform"], { label: string; bg: string; text: string }> = {
    google: { label: "Google", bg: "bg-blue-500/10", text: "text-blue-600" },
    facebook: { label: "Facebook", bg: "bg-indigo-500/10", text: "text-indigo-600" },
    yelp: { label: "Yelp", bg: "bg-red-500/10", text: "text-red-600" },
    internal: { label: "Internal", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  };
  const cfg = configs[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text,
      )}
    >
      <Globe className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// ── Main Page ──

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;

  const { data: review, isLoading, refetch } = useReview(reviewId);
  const { mutate: generateResponse } = useGenerateResponse(reviewId);
  const { mutate: postResponse } = usePostResponse(reviewId);

  const [aiDraft, setAiDraft] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleGenerateResponse() {
    setIsGenerating(true);
    const result = await generateResponse(undefined as unknown as void);
    if (result && "response" in result) {
      setAiDraft(result.response);
    } else {
      showToast("Failed to generate response. Please try again.");
    }
    setIsGenerating(false);
  }

  async function handleApproveAndPost() {
    const result = await postResponse({ response: aiDraft });
    if (result) {
      setIsPosted(true);
      showToast("Response posted successfully!");
      refetch();
    } else {
      showToast("Failed to post response. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reviews
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!review || !review.reviewerName) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reviews
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">Review not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The review you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const hasPostedResponse = review.responsePosted || isPosted;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/dashboard/reviews"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reviews
      </Link>

      {/* Review Detail Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{review.reviewerName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <PlatformBadge platform={review.platform} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {review.reviewUrl && (
            <a
              href={review.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on {review.platform.charAt(0).toUpperCase() + review.platform.slice(1)}
            </a>
          )}
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-3">
          <StarRating rating={review.rating} size="lg" />
          <span className="text-lg font-semibold text-foreground">{review.rating}/5</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              review.sentiment === "positive" && "bg-success/10 text-success",
              review.sentiment === "neutral" && "bg-amber-500/10 text-amber-600",
              review.sentiment === "negative" && "bg-destructive/10 text-destructive",
            )}
          >
            {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
          </span>
        </div>

        {/* Full Review Text */}
        {review.reviewText && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Review</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {review.reviewText}
            </p>
          </div>
        )}
      </div>

      {/* Response Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Response</h2>

        {/* Already posted response */}
        {hasPostedResponse && (
          <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-success flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Response Posted
            </p>
            <p className="text-sm text-muted-foreground">
              {isPosted ? aiDraft : review.aiResponse}
            </p>
          </div>
        )}

        {/* AI Draft / Generation */}
        {!hasPostedResponse && (
          <>
            {aiDraft ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Generated Response
                </p>
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={5}
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveAndPost}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve & Post
                  </button>
                  <button
                    onClick={handleGenerateResponse}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setAiDraft("")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateResponse}
                disabled={isGenerating}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors",
                  isGenerating
                    ? "cursor-wait text-muted-foreground"
                    : "text-primary hover:bg-primary/5",
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating AI Response...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Response
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
