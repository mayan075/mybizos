"use client";

import { useState, useMemo } from "react";
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

// ── Types ──

interface Review {
  id: string;
  platform: "google" | "facebook" | "yelp" | "internal";
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  reviewerEmail: string | null;
  reviewerPhone: string | null;
  aiResponse: string | null;
  responsePosted: boolean;
  reviewUrl: string | null;
  sentiment: "positive" | "neutral" | "negative";
  createdAt: Date;
}

// ── Mock Data (matching IDs from the reviews list page) ──

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    platform: "google",
    rating: 5,
    reviewText:
      "Absolutely outstanding service! Dave came out within 2 hours of my call for a burst pipe emergency. He was professional, explained everything clearly, and had it fixed in under an hour. Will definitely use Smith Plumbing again.",
    reviewerName: "Sarah Johnson",
    reviewerEmail: "sarah.j@email.com",
    reviewerPhone: "(555) 234-5678",
    aiResponse: null,
    responsePosted: false,
    reviewUrl: "https://g.co/review/abc123",
    sentiment: "positive",
    createdAt: new Date("2026-03-21T14:30:00"),
  },
  {
    id: "r2",
    platform: "google",
    rating: 5,
    reviewText:
      "Best plumber in town! They installed our new tankless water heater and the whole process was seamless. Fair pricing, showed up on time, cleaned up after themselves. 10/10.",
    reviewerName: "Mike Chen",
    reviewerEmail: "mike.chen@email.com",
    reviewerPhone: null,
    aiResponse:
      "Thank you so much for the wonderful 5-star review, Mike! We're thrilled to hear the tankless water heater installation went smoothly. Your kind words mean the world to our team. We look forward to serving you again!",
    responsePosted: true,
    reviewUrl: "https://g.co/review/def456",
    sentiment: "positive",
    createdAt: new Date("2026-03-19T10:00:00"),
  },
  {
    id: "r3",
    platform: "google",
    rating: 4,
    reviewText:
      "Good work on fixing our kitchen faucet. The tech was knowledgeable and friendly. Only reason for 4 stars is the scheduling — had to wait 3 days for the appointment. Otherwise great service.",
    reviewerName: "Lisa Wang",
    reviewerEmail: null,
    reviewerPhone: "(555) 345-6789",
    aiResponse: null,
    responsePosted: false,
    reviewUrl: "https://g.co/review/ghi789",
    sentiment: "positive",
    createdAt: new Date("2026-03-18T16:45:00"),
  },
  {
    id: "r9",
    platform: "yelp",
    rating: 2,
    reviewText:
      "Had a leak fixed but it started dripping again two weeks later. Had to call them back out. They fixed it at no charge which was good, but shouldn't have happened in the first place.",
    reviewerName: "Tom Bradley",
    reviewerEmail: "tom.b@email.com",
    reviewerPhone: "(555) 456-7890",
    aiResponse: null,
    responsePosted: false,
    reviewUrl: "https://yelp.com/biz/review/stu901",
    sentiment: "negative",
    createdAt: new Date("2026-03-12T08:30:00"),
  },
];

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// ── Main Page ──

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;

  const [aiDraft, setAiDraft] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const review = useMemo(() => {
    return MOCK_REVIEWS.find((r) => r.id === reviewId) ?? null;
  }, [reviewId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleGenerateResponse() {
    if (!review) return;
    setIsGenerating(true);

    // Simulate AI generation
    setTimeout(() => {
      let response: string;
      if (review.rating >= 4) {
        response = `Thank you so much for the wonderful ${review.rating}-star review, ${review.reviewerName}! We're thrilled to hear about your positive experience. Your feedback means the world to our team and motivates us to keep delivering excellent service. We look forward to serving you again in the future!`;
      } else if (review.rating === 3) {
        response = `Thank you for your feedback, ${review.reviewerName}. We appreciate you taking the time to share your experience. We're always looking to improve and would love to hear more about how we can better serve you. Please don't hesitate to reach out to us directly so we can address your concerns.`;
      } else {
        response = `${review.reviewerName}, thank you for bringing this to our attention. We sincerely apologize for the experience you had. This is not the level of service we strive for. We'd like to make this right — please contact us directly at your earliest convenience so we can resolve this for you. Your satisfaction is our top priority.`;
      }
      setAiDraft(response);
      setIsGenerating(false);
    }, 1500);
  }

  function handleApproveAndPost() {
    setIsPosted(true);
    showToast("Response posted successfully!");
  }

  if (!review) {
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

      {/* Contact Information */}
      {(review.reviewerEmail || review.reviewerPhone) && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Contact Information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {review.reviewerEmail && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <span className="text-xs font-medium text-muted-foreground">Email:</span>
                <span className="text-sm text-foreground">{review.reviewerEmail}</span>
              </div>
            )}
            {review.reviewerPhone && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <span className="text-xs font-medium text-muted-foreground">Phone:</span>
                <span className="text-sm text-foreground">{review.reviewerPhone}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
