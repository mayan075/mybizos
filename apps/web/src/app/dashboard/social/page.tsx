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

const FALLBACK_ACCOUNTS: ConnectedAccount[] = [
  { platform: "facebook", name: "Northern Removals", connected: true, avatarInitials: "NR" },
  { platform: "instagram", name: "", connected: false, avatarInitials: "" },
  { platform: "google_business", name: "Northern Removals — Melbourne", connected: true, avatarInitials: "NR" },
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

const SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: "sp1",
    platforms: ["facebook", "google_business"],
    text: "Spring is here! Time for a big cleanout. Book your rubbish removal today and save 15%.",
    scheduledAt: new Date(weekStart.getTime() + 0 * 86400000 + 9 * 3600000), // Monday 9am
    status: "published",
    imageUrl: null,
  },
  {
    id: "sp2",
    platforms: ["facebook"],
    text: "Did you know? The average household has 300kg of junk they no longer need. Clear the clutter and feel the difference!",
    scheduledAt: new Date(weekStart.getTime() + 1 * 86400000 + 12 * 3600000), // Tuesday noon
    status: "published",
    imageUrl: null,
  },
  {
    id: "sp3",
    platforms: ["facebook", "google_business"],
    text: "Another 5-star review! Thanks to the Martinez family for trusting us with their estate clearance.",
    scheduledAt: new Date(weekStart.getTime() + 2 * 86400000 + 14 * 3600000), // Wednesday 2pm
    status: "scheduled",
    imageUrl: null,
  },
  {
    id: "sp4",
    platforms: ["google_business"],
    text: "Weekend emergency? We're available for same-day pickups. Call us anytime!",
    scheduledAt: new Date(weekStart.getTime() + 4 * 86400000 + 10 * 3600000), // Friday 10am
    status: "scheduled",
    imageUrl: null,
  },
  {
    id: "sp5",
    platforms: ["facebook", "google_business"],
    text: "Happy Saturday! Here's a quick tip: Schedule regular pickups to keep your property clutter-free and looking its best.",
    scheduledAt: new Date(weekStart.getTime() + 5 * 86400000 + 8 * 3600000), // Saturday 8am
    status: "scheduled",
    imageUrl: null,
  },
];

const RECENT_POSTS: RecentPost[] = [
  {
    id: "rp1",
    platforms: ["facebook", "google_business"],
    text: "Spring is here! Time for a big cleanout. Book your rubbish removal today and save 15%.",
    postedAt: new Date("2026-03-22T09:00:00"),
    status: "published",
    likes: 24,
    comments: 5,
    shares: 8,
    reach: 1247,
  },
  {
    id: "rp2",
    platforms: ["facebook"],
    text: "Did you know? The average household has 300kg of junk they no longer need. Clear the clutter and feel the difference!",
    postedAt: new Date("2026-03-21T12:00:00"),
    status: "published",
    likes: 31,
    comments: 7,
    shares: 12,
    reach: 1893,
  },
  {
    id: "rp3",
    platforms: ["facebook", "google_business"],
    text: "We're hiring! Looking for experienced removalists to join our growing team. Great pay, benefits, and company truck.",
    postedAt: new Date("2026-03-20T10:00:00"),
    status: "published",
    likes: 45,
    comments: 12,
    shares: 23,
    reach: 3421,
  },
  {
    id: "rp4",
    platforms: ["google_business"],
    text: "Thanks to the Williams family for the 5-star review! We love serving our Austin community.",
    postedAt: new Date("2026-03-19T14:00:00"),
    status: "published",
    likes: 18,
    comments: 3,
    shares: 2,
    reach: 876,
  },
  {
    id: "rp5",
    platforms: ["facebook"],
    text: "Moving tip: Label your boxes by room and pack heavier items at the bottom. Need help? Call us!",
    postedAt: new Date("2026-03-18T11:00:00"),
    status: "published",
    likes: 52,
    comments: 8,
    shares: 31,
    reach: 4102,
  },
  {
    id: "rp6",
    platforms: ["facebook", "google_business"],
    text: "New blog post: 7 Signs It's Time for a Big Cleanout. Link in comments!",
    postedAt: new Date("2026-03-17T09:00:00"),
    status: "failed",
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
  },
];

const AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "ai1",
    title: "5 Signs It's Time for a Big Cleanout",
    text: "Is clutter taking over your home? Here are 5 signs it's time to call in the professionals:\n\n1. You can't park in your own garage\n2. There are rooms you avoid because of junk\n3. You're tripping over things regularly\n4. You've been saying 'I'll deal with it later' for months\n5. You're moving and need a fresh start\n\nDon't wait -- call us for a free quote today! #DeclutterYourLife #RubbishRemoval #CleanSpace",
    category: "educational",
  },
  {
    id: "ai2",
    title: "Customer Spotlight: The Johnson Family's Estate Clearance",
    text: "We're so proud of the estate clearance we completed for the Johnson family! Three truckloads of furniture, appliances, and general rubbish -- all gone in a single day.\n\nMrs. Johnson said: \"The team was incredibly professional and finished ahead of schedule. The house looks brand new!\"\n\nThank you for trusting Northern Removals! #CustomerSpotlight #EstateClearance #CleanStart",
    category: "social_proof",
  },
  {
    id: "ai3",
    title: "Spring Cleanout Special -- Save 20% until April 15",
    text: "Spring is here and it's the perfect time for a big cleanout!\n\nFor a limited time, save 20% on all removal services.\n\nWe handle:\n- Furniture and appliance removal\n- Garden and green waste\n- Hard rubbish and e-waste\n- Full house cleanouts\n- Commercial waste\n\nOffer valid through April 15. Call or book online today! #SpringCleanout #RubbishRemoval #SaveMoney",
    category: "promotional",
  },
];

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
    for (const post of SCHEDULED_POSTS) {
      const postDate = new Date(post.scheduledAt);
      const dayDiff = Math.floor((postDate.getTime() - currentWeekStart.getTime()) / 86400000);
      if (dayDiff >= 0 && dayDiff < 7) {
        map.get(dayDiff)?.push(post);
      }
    }
    return map;
  }, [currentWeekStart]);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleAiWrite = () => {
    setPostText(
      "Is your garage overflowing? The average household accumulates over 300kg of unused items. That's space you could be using!\n\nHere are 3 tips for a quick declutter:\n1. Start with one room at a time\n2. If you haven't used it in 12 months, it goes\n3. Call us for the heavy lifting\n\nNeed a hand? Call Northern Removals for fast, affordable pickups. Same-day service available! #DeclutterTips #RubbishRemoval #CleanSpace",
    );
  };

  const handleUseSuggestion = (suggestion: AiSuggestion) => {
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
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Write
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
              disabled={!postText || selectedPlatforms.length === 0 || isOverLimit}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
                !postText || selectedPlatforms.length === 0 || isOverLimit
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
              )}
            >
              {scheduleMode === "now" ? (
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
          <h2 className="text-sm font-semibold text-foreground">Recent Posts</h2>
        </div>
        <div className="divide-y divide-border">
          {RECENT_POSTS.map((post) => {
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
          {AI_SUGGESTIONS.map((suggestion) => {
            const catBadge = getCategoryBadge(suggestion.category);
            return (
              <div key={suggestion.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        {suggestion.title}
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
