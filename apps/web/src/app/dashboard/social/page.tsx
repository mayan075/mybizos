"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Share2,
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Home,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  Clock,
  Send,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Image as ImageIcon,
  X,
  Check,
  Plug,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { apiClient, tryFetch } from "@/lib/api-client";
import { useSocialPosts, useCreatePost, useAiSuggestions, type SocialPost, type AiSuggestion as ApiAiSuggestion } from "@/lib/hooks/use-social";

// ── Types ──

type Platform = "facebook" | "instagram" | "google_business" | "linkedin" | "nextdoor";

interface ConnectedAccount {
  platform: Platform;
  name: string;
  connected: boolean;
  avatarInitials: string;
}

interface ScheduledPost {
  id: string;
  platforms: Platform[];
  text: string;
  scheduledAt: Date;
  status: "scheduled" | "published" | "failed";
  imageUrl: string | null;
}

interface RecentPost {
  id: string;
  platforms: Platform[];
  text: string;
  postedAt: Date;
  status: "published" | "scheduled" | "failed";
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

interface AiSuggestion {
  id: string;
  title: string;
  text: string;
  category: "educational" | "social_proof" | "promotional";
}

// ── Platform Config ──

const platformConfig: Record<Platform, { label: string; color: string; bgColor: string; charLimit: number }> = {
  facebook: { label: "Facebook", color: "text-blue-600", bgColor: "bg-blue-50", charLimit: 63206 },
  instagram: { label: "Instagram", color: "text-pink-600", bgColor: "bg-pink-50", charLimit: 2200 },
  google_business: { label: "Google Business", color: "text-emerald-600", bgColor: "bg-emerald-50", charLimit: 1500 },
  linkedin: { label: "LinkedIn", color: "text-sky-700", bgColor: "bg-sky-50", charLimit: 3000 },
  nextdoor: { label: "Nextdoor", color: "text-green-600", bgColor: "bg-green-50", charLimit: 2000 },
};

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const baseClass = cn("h-4 w-4", className);
  switch (platform) {
    case "facebook":
      return <Facebook className={cn(baseClass, "text-blue-600")} />;
    case "instagram":
      return <Instagram className={cn(baseClass, "text-pink-600")} />;
    case "google_business":
      return <MapPin className={cn(baseClass, "text-emerald-600")} />;
    case "linkedin":
      return <Linkedin className={cn(baseClass, "text-sky-700")} />;
    case "nextdoor":
      return <Home className={cn(baseClass, "text-green-600")} />;
  }
}

// ── API Integration Types ──

interface IntegrationConnectionStatus {
  connected: boolean;
  provider: string;
  accountName: string | null;
  accountId: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  credentialsConfigured: boolean;
  displayName: string;
}

const PLATFORM_TO_PROVIDER: Record<Platform, string | null> = {
  facebook: "facebook",
  instagram: "instagram",
  google_business: "google_business",
  linkedin: null, // Not yet supported via OAuth
  nextdoor: null, // Not yet supported via OAuth
};

// ── Mock Data (fallback when API is unavailable) ──

// All accounts start as disconnected; real status comes from the API
const FALLBACK_ACCOUNTS: ConnectedAccount[] = [
  { platform: "facebook", name: "", connected: false, avatarInitials: "" },
  { platform: "instagram", name: "", connected: false, avatarInitials: "" },
  { platform: "google_business", name: "", connected: false, avatarInitials: "" },
  { platform: "linkedin", name: "", connected: false, avatarInitials: "" },
  { platform: "nextdoor", name: "", connected: false, avatarInitials: "" },
];

const today = new Date("2026-03-22T10:00:00");

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekStart = getWeekStart(today);

// Posts and suggestions now come from API hooks inside the component.

// ── Helpers ──

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getCategoryBadge(cat: AiSuggestion["category"]): { label: string; className: string } {
  switch (cat) {
    case "educational":
      return { label: "Educational", className: "bg-blue-50 text-blue-700" };
    case "social_proof":
      return { label: "Social Proof", className: "bg-amber-50 text-amber-700" };
    case "promotional":
      return { label: "Promotional", className: "bg-purple-50 text-purple-700" };
  }
}

function getStatusBadge(status: RecentPost["status"]): { label: string; className: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case "published":
      return { label: "Published", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 };
    case "scheduled":
      return { label: "Scheduled", className: "bg-blue-50 text-blue-700", icon: Clock };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700", icon: AlertCircle };
  }
}

// ── Main Component ──

export default function SocialPage() {
  usePageTitle("Social");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["facebook", "google_business"]);
  const [postText, setPostText] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, IntegrationConnectionStatus>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<ApiAiSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // ── API hooks ──
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useSocialPosts();
  const { mutate: createPost } = useCreatePost();
  const { mutate: fetchSuggestionsApi } = useAiSuggestions();

  // Fetch real integration statuses from API
  const fetchIntegrationStatuses = useCallback(async () => {
    setStatusLoading(true);
    try {
      const result = await tryFetch(() =>
        apiClient.get<{ status: Record<string, IntegrationConnectionStatus> }>(
          "/orgs/demo/integrations/status",
        ),
      );
      if (result) {
        setIntegrationStatuses(result.status);
      }
    } catch {
      // Fall back to mock data silently
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrationStatuses();
  }, [fetchIntegrationStatuses]);

  // Build connected accounts from real statuses, falling back to mock data
  const CONNECTED_ACCOUNTS: ConnectedAccount[] = useMemo(() => {
    if (Object.keys(integrationStatuses).length === 0) {
      return FALLBACK_ACCOUNTS;
    }

    return FALLBACK_ACCOUNTS.map((fallback) => {
      const providerKey = PLATFORM_TO_PROVIDER[fallback.platform];
      if (!providerKey) return fallback;

      const apiStatus = integrationStatuses[providerKey];
      if (!apiStatus) return fallback;

      return {
        ...fallback,
        connected: apiStatus.connected,
        name: apiStatus.accountName ?? fallback.name,
        avatarInitials: apiStatus.accountName
          ? apiStatus.accountName.substring(0, 2).toUpperCase()
          : fallback.avatarInitials,
      };
    });
  }, [integrationStatuses]);

  // Derive scheduled and recent posts from API data
  const scheduledPosts: ScheduledPost[] = useMemo(() => {
    if (!postsData || !Array.isArray(postsData)) return [];
    return postsData
      .filter((p) => p.status === "scheduled")
      .map((p) => ({
        id: p.id,
        platforms: p.platforms as Platform[],
        text: p.text,
        scheduledAt: new Date(p.scheduledAt ?? p.createdAt),
        status: p.status as ScheduledPost["status"],
        imageUrl: p.imageUrl,
      }));
  }, [postsData]);

  const recentPosts: RecentPost[] = useMemo(() => {
    if (!postsData || !Array.isArray(postsData)) return [];
    return postsData
      .filter((p) => p.status === "published" || p.status === "failed")
      .map((p) => ({
        id: p.id,
        platforms: p.platforms as Platform[],
        text: p.text,
        postedAt: new Date(p.publishedAt ?? p.createdAt),
        status: p.status as RecentPost["status"],
        likes: p.metrics?.likes ?? 0,
        comments: p.metrics?.comments ?? 0,
        shares: p.metrics?.shares ?? 0,
        reach: p.metrics?.reach ?? 0,
      }));
  }, [postsData]);

  // Current week calculation
  const currentWeekStart = useMemo(() => {
    const ws = getWeekStart(today);
    ws.setDate(ws.getDate() + weekOffset * 7);
    return ws;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  // Posts grouped by day of week
  const postsByDay = useMemo(() => {
    const map = new Map<number, ScheduledPost[]>();
    for (let i = 0; i < 7; i++) {
      map.set(i, []);
    }
    for (const post of scheduledPosts) {
      const postDate = new Date(post.scheduledAt);
      const dayDiff = Math.floor((postDate.getTime() - currentWeekStart.getTime()) / 86400000);
      if (dayDiff >= 0 && dayDiff < 7) {
        map.get(dayDiff)?.push(post);
      }
    }
    return map;
  }, [currentWeekStart, scheduledPosts]);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleAiWrite = async () => {
    setSuggestionsLoading(true);
    try {
      const result = await fetchSuggestionsApi(undefined as unknown as void);
      if (result && Array.isArray(result) && result.length > 0) {
        setAiSuggestions(result);
        // Use the first suggestion as immediate post text
        setPostText(result[0].text);
      }
    } catch {
      // Silently fail — the user can try again
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleUseSuggestion = (suggestion: ApiAiSuggestion) => {
    setPostText(suggestion.text);
    // Auto-select connected platforms
    setSelectedPlatforms(
      CONNECTED_ACCOUNTS.filter((a) => a.connected).map((a) => a.platform),
    );
    // Scroll to create section
    document.getElementById("create-post")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDayClick = (dayIndex: number) => {
    setSelectedCalendarDay(dayIndex);
    setScheduleMode("schedule");
    const targetDate = weekDays[dayIndex];
    if (targetDate) {
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getDate()).padStart(2, "0");
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
    }
    document.getElementById("create-post")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmitPost = async () => {
    if (!postText || selectedPlatforms.length === 0 || isOverLimit) return;
    setPostSubmitting(true);
    try {
      const input: { text: string; platforms: string[]; status: "draft" | "scheduled"; scheduledAt?: string } = {
        text: postText,
        platforms: selectedPlatforms,
        status: scheduleMode === "schedule" ? "scheduled" : "draft",
      };
      if (scheduleMode === "schedule" && scheduleDate) {
        input.scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }
      await createPost(input);
      // Clear form on success
      setPostText("");
      setSelectedCalendarDay(null);
      setScheduleDate("");
      setScheduleTime("09:00");
      // Refresh posts list
      refetchPosts();
    } catch {
      // Error is surfaced by the hook
    } finally {
      setPostSubmitting(false);
    }
  };

  // Fetch AI suggestions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestionsLoading(true);
      try {
        const result = await fetchSuggestionsApi(undefined as unknown as void);
        if (!cancelled && result && Array.isArray(result)) {
          setAiSuggestions(result);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Character limit for smallest selected platform
  const charLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return 2200;
    return Math.min(...selectedPlatforms.map((p) => platformConfig[p].charLimit));
  }, [selectedPlatforms]);

  const charCount = postText.length;
  const isOverLimit = charCount > charLimit;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Media</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, schedule, and manage posts across all your social platforms.
          </p>
        </div>
        <button
          onClick={() => document.getElementById("create-post")?.scrollIntoView({ behavior: "smooth" })}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* Connected Accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Connected Accounts
            {statusLoading && <Loader2 className="inline-block h-3 w-3 animate-spin ml-2" />}
          </h2>
          <Link
            href="/dashboard/integrations"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Plug className="h-3 w-3" />
            Manage Integrations
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CONNECTED_ACCOUNTS.map((account) => (
            <div
              key={account.platform}
              className={cn(
                "rounded-xl border p-4 transition-shadow",
                account.connected
                  ? "border-border bg-card hover:shadow-md"
                  : "border-dashed border-border/60 bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  account.connected
                    ? platformConfig[account.platform].bgColor
                    : "bg-muted",
                )}>
                  <PlatformIcon
                    platform={account.platform}
                    className={cn("h-5 w-5", !account.connected && "text-muted-foreground")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {platformConfig[account.platform].label}
                  </p>
                  {account.connected ? (
                    <p className="text-sm font-medium text-foreground truncate">
                      {account.name}
                    </p>
                  ) : (
                    <Link
                      href="/dashboard/integrations"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Plug className="h-3 w-3" />
                      Connect
                    </Link>
                  )}
                </div>
                {account.connected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Calendar */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Content Calendar
            {postsLoading && <Loader2 className="inline-block h-3 w-3 animate-spin ml-2" />}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-border">
          {weekDays.map((day, i) => {
            const isToday =
              day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();
            const dayPosts = postsByDay.get(i) ?? [];

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[160px] cursor-pointer transition-colors hover:bg-muted/40",
                  selectedCalendarDay === i && "bg-primary/5",
                )}
                onClick={() => handleDayClick(i)}
              >
                {/* Day header */}
                <div className={cn(
                  "px-3 py-2 text-center border-b border-border/50",
                  isToday && "bg-primary/10",
                )}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {DAY_NAMES[i]}
                  </p>
                  <p className={cn(
                    "text-lg font-bold mt-0.5",
                    isToday ? "text-primary" : "text-foreground",
                  )}>
                    {day.getDate()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {day.toLocaleDateString("en-US", { month: "short" })}
                  </p>
                </div>

                {/* Posts for this day */}
                <div className="p-2 space-y-1.5">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className={cn(
                        "rounded-lg p-2 text-xs",
                        post.status === "published"
                          ? "bg-emerald-50 border border-emerald-200"
                          : post.status === "failed"
                          ? "bg-red-50 border border-red-200"
                          : "bg-blue-50 border border-blue-200",
                      )}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {post.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p} className="h-3 w-3" />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatTime(post.scheduledAt)}
                        </span>
                      </div>
                      <p className="text-foreground line-clamp-2 leading-tight">
                        {post.text.substring(0, 60)}...
                      </p>
                    </div>
                  ))}

                  {dayPosts.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-muted-foreground/40">
                      <Plus className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Post Section */}
      <div id="create-post" className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Create Post</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compose and schedule a post across multiple platforms.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Platform selector */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Post to</label>
            <div className="flex flex-wrap gap-2">
              {CONNECTED_ACCOUNTS.map((account) => {
                const isSelected = selectedPlatforms.includes(account.platform);
                const config = platformConfig[account.platform];
                return (
                  <button
                    key={account.platform}
                    onClick={() => account.connected && togglePlatform(account.platform)}
                    disabled={!account.connected}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      !account.connected && "opacity-40 cursor-not-allowed border-dashed",
                      account.connected && isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : account.connected
                        ? "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <PlatformIcon platform={account.platform} className="h-4 w-4" />
                    {config.label}
                    {account.connected && isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                    {!account.connected && (
                      <span className="text-[10px] text-muted-foreground">Not connected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Post Content</label>
              <button
                onClick={handleAiWrite}
                disabled={suggestionsLoading}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {suggestionsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {suggestionsLoading ? "Generating..." : "AI Write"}
              </button>
            </div>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What would you like to share with your audience?"
              rows={6}
              className={cn(
                "w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all",
                isOverLimit ? "border-red-400 focus:ring-red-200 focus:border-red-400" : "border-border",
              )}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-muted-foreground">
                {selectedPlatforms.length > 0
                  ? `Limit: ${charLimit.toLocaleString()} chars (${platformConfig[selectedPlatforms.reduce((a, b) => platformConfig[a].charLimit < platformConfig[b].charLimit ? a : b)].label})`
                  : "Select a platform above"}
              </p>
              <p className={cn(
                "text-xs font-medium",
                isOverLimit ? "text-red-500" : charCount > charLimit * 0.9 ? "text-amber-500" : "text-muted-foreground",
              )}>
                {charCount.toLocaleString()} / {charLimit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Image upload zone */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Media</label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-6 py-8 transition-colors hover:border-primary/40 hover:bg-muted/30 cursor-pointer">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  Drag & drop images here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse. PNG, JPG up to 10MB.
                </p>
              </div>
            </div>
          </div>

          {/* Schedule options */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Schedule</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScheduleMode("now")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  scheduleMode === "now"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Send className="h-4 w-4" />
                Post Now
              </button>
              <button
                onClick={() => setScheduleMode("schedule")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  scheduleMode === "schedule"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Clock className="h-4 w-4" />
                Schedule
              </button>
            </div>

            {scheduleMode === "schedule" && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Preview cards */}
          {postText && selectedPlatforms.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">Preview</label>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedPlatforms.map((platform) => {
                  const config = platformConfig[platform];
                  const account = CONNECTED_ACCOUNTS.find((a) => a.platform === platform);
                  return (
                    <div key={platform} className="rounded-xl border border-border bg-background p-4">
                      {/* Preview header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.bgColor)}>
                          <PlatformIcon platform={platform} className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {account?.name || "Your Business"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {scheduleMode === "now" ? "Just now" : scheduleDate ? `Scheduled for ${scheduleDate} at ${scheduleTime}` : "Scheduled"}
                          </p>
                        </div>
                        <span className={cn("ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full", config.bgColor, config.color)}>
                          {config.label}
                        </span>
                      </div>
                      {/* Preview body */}
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {postText.length > 280
                          ? postText.substring(0, 280) + "..."
                          : postText}
                      </p>
                      {/* Preview footer */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                          <Heart className="h-3.5 w-3.5" /> Like
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <MessageCircle className="h-3.5 w-3.5" /> Comment
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Share2 className="h-3.5 w-3.5" /> Share
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmitPost}
              disabled={!postText || selectedPlatforms.length === 0 || isOverLimit || postSubmitting}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
                !postText || selectedPlatforms.length === 0 || isOverLimit || postSubmitting
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
              )}
            >
              {postSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {scheduleMode === "now" ? "Posting..." : "Scheduling..."}
                </>
              ) : scheduleMode === "now" ? (
                <>
                  <Send className="h-4 w-4" />
                  Post Now
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  Schedule Post
                </>
              )}
            </button>
            {postText && (
              <button
                onClick={() => {
                  setPostText("");
                  setSelectedCalendarDay(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Posts
            {postsLoading && <Loader2 className="inline-block h-3 w-3 animate-spin ml-2" />}
          </h2>
        </div>
        <div className="divide-y divide-border">
          {recentPosts.length === 0 && !postsLoading && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No posts yet. Create your first post above!
            </div>
          )}
          {recentPosts.map((post) => {
            const badge = getStatusBadge(post.status);
            const BadgeIcon = badge.icon;
            return (
              <div key={post.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Platform icons */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    {post.platforms.map((p) => (
                      <div
                        key={p}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg",
                          platformConfig[p].bgColor,
                        )}
                      >
                        <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                      </div>
                    ))}
                  </div>

                  {/* Post content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                      {post.text}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(post.postedAt)}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Engagement stats */}
                  {post.status === "published" && (
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1" title="Likes">
                        <Heart className="h-3.5 w-3.5 text-rose-400" />
                        <span className="font-medium text-foreground">{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                        <span className="font-medium text-foreground">{post.comments}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Shares">
                        <Repeat2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-medium text-foreground">{post.shares}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Reach">
                        <Eye className="h-3.5 w-3.5 text-purple-400" />
                        <span className="font-medium text-foreground">{post.reach.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Content Suggestions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Suggested Posts This Week
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated content ideas based on your business and audience.
          </p>
        </div>
        <div className="divide-y divide-border">
          {suggestionsLoading && aiSuggestions.length === 0 && (
            <div className="px-5 py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating suggestions...
            </div>
          )}
          {!suggestionsLoading && aiSuggestions.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No suggestions yet. Click &quot;AI Write&quot; above to generate ideas.
            </div>
          )}
          {aiSuggestions.map((suggestion, idx) => {
            const catBadge = getCategoryBadge((suggestion.category || "educational") as AiSuggestion["category"]);
            return (
              <div key={idx} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {suggestion.text.substring(0, 50)}{suggestion.text.length > 50 ? "..." : ""}
                      </h3>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", catBadge.className)}>
                        {catBadge.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line leading-relaxed">
                      {suggestion.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Use This
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
