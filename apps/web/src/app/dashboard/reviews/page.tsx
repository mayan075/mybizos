"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Send,
  Sparkles,
  Filter,
  ChevronDown,
  ExternalLink,
  Smartphone,
  Mail,
  Zap,
  Plus,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

// ── Types ──

interface Review {
  id: string;
  platform: "google" | "facebook" | "yelp" | "internal";
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  aiResponse: string | null;
  responsePosted: boolean;
  reviewUrl: string | null;
  sentiment: "positive" | "neutral" | "negative";
  createdAt: Date;
}

interface ReviewCampaign {
  id: string;
  name: string;
  triggerType: "after_appointment" | "after_deal_won" | "manual";
  delayHours: number;
  channel: "sms" | "email" | "both";
  isActive: boolean;
  sentCount: number;
  reviewCount: number;
}

// Real reviews will come from the API; start with empty arrays
const MOCK_REVIEWS: Review[] = [];

const MOCK_CAMPAIGNS: ReviewCampaign[] = [];

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

function PlatformIcon({ platform }: { platform: Review["platform"] }) {
  const configs: Record<
    Review["platform"],
    { label: string; bg: string; text: string }
  > = {
    google: { label: "G", bg: "bg-blue-500/10", text: "text-blue-600" },
    facebook: { label: "f", bg: "bg-indigo-500/10", text: "text-indigo-600" },
    yelp: { label: "Y", bg: "bg-red-500/10", text: "text-red-600" },
    internal: { label: "I", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  };
  const cfg = configs[platform];
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
        cfg.bg,
        cfg.text,
      )}
    >
      {cfg.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Review["platform"] }) {
  const labels: Record<Review["platform"], string> = {
    google: "Google",
    facebook: "Facebook",
    yelp: "Yelp",
    internal: "Internal",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {labels[platform]}
    </span>
  );
}

function RatingBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-right text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ── Filter Tabs ──

type FilterTab = "all" | "needs_response" | "positive" | "negative";

// ── Main Page ──

export default function ReviewsPage() {
  usePageTitle("Reviews");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [aiDraft, setAiDraft] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  // Compute stats
  const stats = useMemo(() => {
    const total = MOCK_REVIEWS.length;
    const avgRating =
      total > 0
        ? MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;
    const responded = MOCK_REVIEWS.filter((r) => r.responsePosted).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of MOCK_REVIEWS) {
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    }

    const now = new Date();
    const thisMonth = MOCK_REVIEWS.filter(
      (r) =>
        r.createdAt.getMonth() === now.getMonth() &&
        r.createdAt.getFullYear() === now.getFullYear(),
    ).length;

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = MOCK_REVIEWS.filter(
      (r) =>
        r.createdAt.getMonth() === lastMonthDate.getMonth() &&
        r.createdAt.getFullYear() === lastMonthDate.getFullYear(),
    ).length;

    return { total, avgRating, responseRate, distribution, thisMonth, lastMonth };
  }, []);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    switch (activeTab) {
      case "needs_response":
        return MOCK_REVIEWS.filter((r) => !r.responsePosted);
      case "positive":
        return MOCK_REVIEWS.filter((r) => r.rating >= 4);
      case "negative":
        return MOCK_REVIEWS.filter((r) => r.rating <= 3);
      default:
        return MOCK_REVIEWS;
    }
  }, [activeTab]);

  const handleGenerateResponse = (reviewId: string) => {
    setGeneratingId(reviewId);
    const review = MOCK_REVIEWS.find((r) => r.id === reviewId);
    if (!review) return;

    // Simulate AI generation delay
    setTimeout(() => {
      let response: string;
      if (review.rating >= 4) {
        response = `Thank you so much for the wonderful ${review.rating}-star review, ${review.reviewerName}! We're thrilled to hear about your positive experience. Your feedback means the world to our team. We look forward to serving you again!`;
      } else if (review.rating === 3) {
        response = `Thank you for your feedback, ${review.reviewerName}. We appreciate you taking the time to share your experience. We're always looking to improve and would love to hear more about how we can better serve you. Please don't hesitate to reach out to us directly.`;
      } else {
        response = `${review.reviewerName}, thank you for bringing this to our attention. We sincerely apologize for the experience you had. This is not the level of service we strive for. Please contact us directly so we can make this right. Your satisfaction is our top priority.`;
      }
      setAiDraft((prev) => ({ ...prev, [reviewId]: response }));
      setGeneratingId(null);
    }, 1500);
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: MOCK_REVIEWS.length },
    {
      key: "needs_response",
      label: "Needs Response",
      count: MOCK_REVIEWS.filter((r) => !r.responsePosted).length,
    },
    {
      key: "positive",
      label: "Positive (4-5\u2605)",
      count: MOCK_REVIEWS.filter((r) => r.rating >= 4).length,
    },
    {
      key: "negative",
      label: "Negative (1-3\u2605)",
      count: MOCK_REVIEWS.filter((r) => r.rating <= 3).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reputation Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor reviews, manage responses, and grow your online reputation.
        </p>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Average Rating */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Average Rating
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">
              {stats.avgRating.toFixed(1)}
            </span>
            <StarRating rating={Math.round(stats.avgRating)} size="lg" />
          </div>
        </div>

        {/* Total Reviews */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Reviews
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">{stats.total}</span>
            <div className="mb-1 flex items-center gap-1 text-sm">
              {stats.thisMonth >= stats.lastMonth ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  "font-medium",
                  stats.thisMonth >= stats.lastMonth
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {stats.thisMonth} this month
              </span>
            </div>
          </div>
        </div>

        {/* Response Rate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Response Rate
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">
              {stats.responseRate}%
            </span>
            <MessageSquare className="mb-1 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Rating Distribution
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <RatingBar
                key={r}
                label={`${r}\u2605`}
                count={stats.distribution[r] ?? 0}
                total={stats.total}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Reviews ── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Reviews</h2>
          {/* Filter Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px]">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Review Cards */}
        <div className="divide-y divide-border">
          {filteredReviews.map((review) => (
            <div key={review.id} className="px-5 py-4">
              <div className="flex items-start gap-4">
                <PlatformIcon platform={review.platform} />

                <div className="min-w-0 flex-1">
                  {/* Top row: name, platform, stars, date */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/reviews/${review.id}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {review.reviewerName}
                    </Link>
                    <PlatformBadge platform={review.platform} />
                    <StarRating rating={review.rating} />
                    {!review.responsePosted && !review.aiResponse && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Needs Response
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelative(review.createdAt)}
                    </span>
                  </div>

                  {/* Review text */}
                  {review.reviewText && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {review.reviewText}
                    </p>
                  )}

                  {/* Existing posted response */}
                  {review.responsePosted && review.aiResponse && (
                    <div className="mt-3 rounded-lg border border-success/20 bg-success/5 px-4 py-3">
                      <p className="text-xs font-medium text-success">
                        Response Posted
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {review.aiResponse}
                      </p>
                    </div>
                  )}

                  {/* AI Draft area */}
                  {!review.responsePosted && aiDraft[review.id] && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-primary">
                        AI-Generated Response
                      </p>
                      <textarea
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                        value={aiDraft[review.id]}
                        onChange={(e) =>
                          setAiDraft((prev) => ({
                            ...prev,
                            [review.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex gap-2">
                        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                          <Check className="h-3.5 w-3.5" />
                          Approve & Post
                        </button>
                        <button
                          onClick={() =>
                            setAiDraft((prev) => {
                              const next = { ...prev };
                              delete next[review.id];
                              return next;
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generate button */}
                  {!review.responsePosted && !aiDraft[review.id] && (
                    <div className="mt-2.5">
                      <button
                        onClick={() => handleGenerateResponse(review.id)}
                        disabled={generatingId === review.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                          generatingId === review.id
                            ? "cursor-wait text-muted-foreground"
                            : "text-primary hover:bg-primary/5",
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {generatingId === review.id
                          ? "Generating..."
                          : "Generate AI Response"}
                      </button>
                    </div>
                  )}
                </div>

                {/* External link */}
                {review.reviewUrl && (
                  <a
                    href={review.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="View on platform"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {filteredReviews.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Star className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No reviews yet</p>
              <p className="text-sm text-muted-foreground">
                Connect Google Business to start collecting reviews.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Campaigns ── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">Review Campaigns</h2>
          <button
            onClick={() => setShowCampaignForm(!showCampaignForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </button>
        </div>

        {/* Campaign creation form (inline) */}
        {showCampaignForm && (
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <div className="mx-auto max-w-2xl space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Quick Setup: New Review Campaign
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Post-Service Follow-Up"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Trigger
                  </label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="after_appointment">After Appointment</option>
                    <option value="after_deal_won">After Deal Won</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Channel
                  </label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Delay (hours)
                  </label>
                  <input
                    type="number"
                    defaultValue={24}
                    min={0}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Message Template
                </label>
                <textarea
                  rows={3}
                  placeholder="Hi {first_name}, thank you for choosing {business_name}! We'd love to hear about your experience. Could you leave us a quick review? {review_link}"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowCampaignForm(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Cards */}
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {MOCK_CAMPAIGNS.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {campaign.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {campaign.triggerType === "after_appointment"
                      ? "Triggers after appointment"
                      : campaign.triggerType === "after_deal_won"
                        ? "Triggers after deal won"
                        : "Manual trigger"}
                    {" \u00b7 "}
                    {campaign.delayHours}h delay
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    campaign.isActive
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {campaign.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {campaign.channel === "sms" ? (
                    <Smartphone className="h-3.5 w-3.5" />
                  ) : campaign.channel === "email" ? (
                    <Mail className="h-3.5 w-3.5" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  <span className="capitalize">{campaign.channel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {campaign.sentCount}
                  </span>{" "}
                  sent
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {campaign.reviewCount}
                  </span>{" "}
                  reviews
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-success">
                    {campaign.sentCount > 0
                      ? Math.round(
                          (campaign.reviewCount / campaign.sentCount) * 100,
                        )
                      : 0}
                    %
                  </span>{" "}
                  conversion
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Date formatting ──

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
