"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Star,
  MessageSquare,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Smartphone,
  Mail,
  Zap,
  Plus,
  X,
  Check,
  Loader2,
  ArrowUpRight,
  Shield,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import {
  useReviews,
  useReviewStats,
  useReviewCampaigns,
  type Review as ApiReview,
  type ReviewCampaign as ApiReviewCampaign,
} from "@/lib/hooks/use-reviews";
import { buildPath } from "@/lib/hooks/use-api";
import { apiClient, tryFetch } from "@/lib/api-client";

type Review = ApiReview;
type ReviewCampaign = ApiReviewCampaign;

// ── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn(starSize, i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />
      ))}
    </div>
  );
}

const platformConfig: Record<Review["platform"], { label: string; short: string; bg: string; text: string }> = {
  google: { label: "Google", short: "G", bg: "bg-blue-500/10", text: "text-blue-600" },
  facebook: { label: "Facebook", short: "f", bg: "bg-indigo-500/10", text: "text-indigo-600" },
  yelp: { label: "Yelp", short: "Y", bg: "bg-red-500/10", text: "text-red-600" },
  internal: { label: "Internal", short: "★", bg: "bg-emerald-500/10", text: "text-emerald-600" },
};

function PlatformIcon({ platform }: { platform: Review["platform"] }) {
  const cfg = platformConfig[platform];
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", cfg.bg, cfg.text)}>
      {cfg.short}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Review["platform"] }) {
  const cfg = platformConfig[platform];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-0.5 w-10 justify-end">
        <span className="text-xs text-muted-foreground tabular-nums">{stars}</span>
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

type FilterTab = "all" | "needs_response" | "positive" | "negative";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  usePageTitle("Reviews");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [aiDraft, setAiDraft] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  const { data: reviewsData, isLoading: reviewsLoading } = useReviews();
  const { data: statsData } = useReviewStats();
  const { data: campaignsData, isLoading: campaignsLoading } = useReviewCampaigns();

  const reviews: Review[] = Array.isArray(reviewsData) ? reviewsData : [];
  const campaigns: ReviewCampaign[] = Array.isArray(campaignsData) ? campaignsData : [];

  const stats = useMemo(() => {
    const total = statsData?.totalReviews ?? reviews.length;
    const avgRating = statsData?.averageRating ?? (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
    const responded = reviews.filter((r) => r.responsePosted).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    const distribution: Record<number, number> = statsData?.ratingDistribution
      ? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, ...statsData.ratingDistribution }
      : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!statsData?.ratingDistribution) {
      for (const r of reviews) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    }

    const now = new Date();
    const thisMonth = reviews.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = reviews.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).length;

    const needsResponse = reviews.filter((r) => !r.responsePosted).length;
    return { total, avgRating, responseRate, distribution, thisMonth, lastMonth, needsResponse };
  }, [reviews, statsData]);

  const filteredReviews = useMemo(() => {
    switch (activeTab) {
      case "needs_response": return reviews.filter((r) => !r.responsePosted);
      case "positive": return reviews.filter((r) => r.rating >= 4);
      case "negative": return reviews.filter((r) => r.rating <= 3);
      default: return reviews;
    }
  }, [activeTab, reviews]);

  const handleGenerateResponse = useCallback(async (reviewId: string) => {
    setGeneratingId(reviewId);
    try {
      const path = buildPath(`/orgs/:orgId/reviews/${reviewId}/generate-response`);
      if (!path) return;
      const result = await tryFetch(() => apiClient.post<{ response: string }>(path, {}));
      if (result?.response) setAiDraft((prev) => ({ ...prev, [reviewId]: result.response }));
    } catch {
      const review = reviews.find((r) => r.id === reviewId);
      if (review) {
        const response = review.rating >= 4
          ? `Thank you so much for the wonderful ${review.rating}-star review, ${review.reviewerName}! We're thrilled to hear about your positive experience. Your feedback means the world to our team!`
          : review.rating === 3
            ? `Thank you for your feedback, ${review.reviewerName}. We appreciate you taking the time to share your experience and are always looking to improve.`
            : `${review.reviewerName}, thank you for bringing this to our attention. We sincerely apologize for your experience and would love to make it right. Please contact us directly.`;
        setAiDraft((prev) => ({ ...prev, [reviewId]: response }));
      }
    }
    setGeneratingId(null);
  }, [reviews]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: reviews.length },
    { key: "needs_response", label: "Needs Response", count: stats.needsResponse },
    { key: "positive", label: "Positive", count: reviews.filter((r) => r.rating >= 4).length },
    { key: "negative", label: "Negative", count: reviews.filter((r) => r.rating <= 3).length },
  ];

  if (reviewsLoading) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Reputation Management</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Monitor reviews, respond with AI, and grow your online reputation.
          </p>
        </div>
        {stats.needsResponse > 0 && (
          <button
            onClick={() => setActiveTab("needs_response")}
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 px-4 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shrink-0"
          >
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {stats.needsResponse} need{stats.needsResponse !== 1 ? "" : "s"} a response
            </span>
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average Rating */}
        <div className="relative rounded-xl bg-card border border-border/60 border-t-2 border-t-amber-500 p-5 shadow-sm">
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg. Rating</p>
          <p className="mt-3 text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
          </p>
          <div className="mt-1.5"><StarRating rating={Math.round(stats.avgRating)} /></div>
        </div>

        {/* Total Reviews */}
        <div className="relative rounded-xl bg-card border border-border/60 border-t-2 border-t-blue-500 p-5 shadow-sm">
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Reviews</p>
          <p className="mt-3 text-4xl font-extrabold text-foreground tabular-nums tracking-tight">{stats.total}</p>
          <div className="mt-1.5 flex items-center gap-1 text-xs">
            {stats.thisMonth >= stats.lastMonth ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={cn("font-medium", stats.thisMonth >= stats.lastMonth ? "text-success" : "text-destructive")}>
              {stats.thisMonth} this month
            </span>
          </div>
        </div>

        {/* Response Rate */}
        <div className="relative rounded-xl bg-card border border-border/60 border-t-2 border-t-emerald-500 p-5 shadow-sm">
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <Shield className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Response Rate</p>
          <p className="mt-3 text-4xl font-extrabold text-foreground tabular-nums tracking-tight">{stats.responseRate}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${stats.responseRate}%` }} />
          </div>
        </div>

        {/* Distribution */}
        <div className="rounded-xl bg-card border border-border/60 border-t-2 border-t-violet-500 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Distribution</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <RatingBar key={r} stars={r} count={stats.distribution[r] ?? 0} total={stats.total} />
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground tracking-tight">Recent Reviews</h2>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                  activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                    activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted-foreground/15 text-muted-foreground",
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 mb-4">
                <Star className="h-7 w-7 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No reviews here</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                {activeTab === "needs_response"
                  ? "All reviews have been responded to. Great work!"
                  : "Connect Google Business to start collecting reviews automatically."}
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="group px-5 py-4 hover:bg-muted/20 transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <PlatformIcon platform={review.platform} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{review.reviewerName}</span>
                      <PlatformBadge platform={review.platform} />
                      <StarRating rating={review.rating} />
                      {!review.responsePosted && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          Needs Response
                        </span>
                      )}
                      {review.responsePosted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                          <Check className="h-2.5 w-2.5" />
                          Responded
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground/60 shrink-0">{formatRelative(review.createdAt)}</span>
                    </div>

                    {review.reviewText && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        &ldquo;{review.reviewText}&rdquo;
                      </p>
                    )}

                    {review.responsePosted && review.aiResponse && (
                      <div className="mt-3 rounded-lg border border-success/20 bg-success/5 px-4 py-3">
                        <p className="text-[11px] font-semibold text-success uppercase tracking-wide mb-1">Your Response</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{review.aiResponse}</p>
                      </div>
                    )}

                    {!review.responsePosted && aiDraft[review.id] && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <p className="text-xs font-semibold text-primary">AI-Generated Response</p>
                        </div>
                        <textarea
                          className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          rows={3}
                          value={aiDraft[review.id]}
                          onChange={(e) => setAiDraft((prev) => ({ ...prev, [review.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Check className="h-3.5 w-3.5" />
                            Approve & Post
                          </button>
                          <button
                            onClick={() => setAiDraft((prev) => { const next = { ...prev }; delete next[review.id]; return next; })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Discard
                          </button>
                        </div>
                      </div>
                    )}

                    {!review.responsePosted && !aiDraft[review.id] && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleGenerateResponse(review.id)}
                          disabled={generatingId === review.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                            generatingId === review.id
                              ? "cursor-wait bg-muted text-muted-foreground"
                              : "bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15",
                          )}
                        >
                          {generatingId === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {generatingId === review.id ? "Generating..." : "Generate AI Response"}
                        </button>
                      </div>
                    )}
                  </div>

                  {review.reviewUrl && (
                    <a href={review.reviewUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      title="View on platform"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Campaigns */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">Review Campaigns</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-request reviews after key events.</p>
          </div>
          <button
            onClick={() => setShowCampaignForm(!showCampaignForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </button>
        </div>

        {showCampaignForm && (
          <div className="border-b border-border/60 bg-muted/30 px-5 py-5">
            <div className="mx-auto max-w-2xl space-y-4">
              <h3 className="text-sm font-semibold text-foreground">New Review Campaign</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Campaign Name</label>
                  <input type="text" placeholder="e.g., Post-Service Follow-Up"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Trigger</label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="after_appointment">After Appointment</option>
                    <option value="after_deal_won">After Deal Won</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Channel</label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Delay (hours)</label>
                  <input type="number" defaultValue={24} min={0}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Message Template</label>
                <textarea rows={3} placeholder="Hi {first_name}, thank you for choosing {business_name}! We'd love your feedback. {review_link}"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Create Campaign
                </button>
                <button onClick={() => setShowCampaignForm(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {campaignsLoading ? (
            <div className="col-span-2 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center px-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 mb-3">
                <Zap className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No campaigns yet</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Create a campaign to automatically request reviews after appointments or completed jobs.
              </p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-border/60 bg-background p-4 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {campaign.triggerType === "after_appointment" ? "After appointment" : campaign.triggerType === "after_deal_won" ? "After deal won" : "Manual"}{" "}
                      · {campaign.delayHours}h delay
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    campaign.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                  )}>
                    {campaign.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {campaign.channel === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : campaign.channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    <span className="capitalize">{campaign.channel}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-foreground tabular-nums">{campaign.sentCount}</span>
                    <span className="text-muted-foreground"> sent</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-foreground tabular-nums">{campaign.reviewCount}</span>
                    <span className="text-muted-foreground"> reviews</span>
                  </div>
                  {campaign.sentCount > 0 && (
                    <div className="text-xs ml-auto">
                      <span className="font-semibold text-success tabular-nums">
                        {Math.round((campaign.reviewCount / campaign.sentCount) * 100)}%
                      </span>
                      <span className="text-muted-foreground"> rate</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
