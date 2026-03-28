"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  MessageSquare,
  Check,
  Sparkles,
  Send,
  Clock,
  Users,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useCreateCampaign } from "@/lib/hooks/use-campaigns";
import type { CreateCampaignInput } from "@/lib/hooks/use-campaigns";

// ── Types ──

type CampaignType = "email" | "sms" | null;

interface AudienceFilter {
  allContacts: boolean;
  tags: string[];
  minScore: number;
  maxScore: number;
  source: string;
}

interface CampaignDraft {
  type: CampaignType;
  name: string;
  audience: AudienceFilter;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sendNow: boolean;
  scheduledDate: string;
  scheduledTime: string;
}

// ── Constants ──

const AVAILABLE_TAGS = [
  "Hot Lead",
  "Removals",
  "Rubbish",
  "Full Load",
  "Emergency",
  "Maintenance",
  "Commercial",
  "Residential",
];

const AVAILABLE_SOURCES = [
  "phone",
  "sms",
  "email",
  "webform",
  "referral",
  "google_ads",
  "facebook_ads",
  "yelp",
];

// Real contact count will come from the API
const MOCK_CONTACT_COUNT = 0;

// ── Step Components ──

function StepTypeSelection({
  selected,
  onSelect,
}: {
  selected: CampaignType;
  onSelect: (type: CampaignType) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Choose Campaign Type
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select whether you want to send an email or SMS campaign.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <button
          onClick={() => onSelect("email")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 p-8 transition-all",
            selected === "email"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30 hover:bg-muted/30",
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl",
              selected === "email"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Mail className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Email</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rich HTML emails with images
            </p>
          </div>
          {selected === "email" && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Check className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          )}
        </button>

        <button
          onClick={() => onSelect("sms")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 p-8 transition-all",
            selected === "sms"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30 hover:bg-muted/30",
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl",
              selected === "sms"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <MessageSquare className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">SMS</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Short text messages (160 chars)
            </p>
          </div>
          {selected === "sms" && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Check className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function StepAudience({
  audience,
  onChange,
}: {
  audience: AudienceFilter;
  onChange: (audience: AudienceFilter) => void;
}) {
  function toggleTag(tag: string) {
    const tags = audience.tags.includes(tag)
      ? audience.tags.filter((t) => t !== tag)
      : [...audience.tags, tag];
    onChange({ ...audience, tags, allContacts: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Select Audience
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose who will receive this campaign.
        </p>
      </div>

      {/* All contacts toggle */}
      <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/30 transition-colors">
        <input
          type="checkbox"
          checked={audience.allContacts}
          onChange={(e) =>
            onChange({
              ...audience,
              allContacts: e.target.checked,
              tags: e.target.checked ? [] : audience.tags,
              source: e.target.checked ? "" : audience.source,
            })
          }
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <div>
          <p className="text-sm font-medium text-foreground">All Contacts</p>
          <p className="text-xs text-muted-foreground">
            Send to your entire contact list ({MOCK_CONTACT_COUNT} contacts)
          </p>
        </div>
      </label>

      {!audience.allContacts && (
        <div className="space-y-5">
          {/* Tags filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Filter by Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    audience.tags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Score range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Min Score
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={audience.minScore}
                onChange={(e) =>
                  onChange({
                    ...audience,
                    minScore: parseInt(e.target.value) || 0,
                  })
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Max Score
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={audience.maxScore}
                onChange={(e) =>
                  onChange({
                    ...audience,
                    maxScore: parseInt(e.target.value) || 100,
                  })
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          </div>

          {/* Source filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Filter by Source
            </label>
            <select
              value={audience.source}
              onChange={(e) =>
                onChange({ ...audience, source: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <option value="">All Sources</option>
              {AVAILABLE_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Estimated recipients */}
      <div className="flex items-center gap-2 rounded-lg bg-info/5 border border-info/20 p-3">
        <Users className="h-4 w-4 text-info" />
        <p className="text-sm text-info">
          Estimated recipients:{" "}
          <span className="font-semibold">
            {audience.allContacts
              ? MOCK_CONTACT_COUNT
              : Math.floor(
                  MOCK_CONTACT_COUNT *
                    (audience.tags.length > 0 ? 0.3 : 1) *
                    ((audience.maxScore - audience.minScore) / 100),
                )}
          </span>
        </p>
      </div>
    </div>
  );
}

function StepContent({
  draft,
  onChange,
}: {
  draft: CampaignDraft;
  onChange: (updates: Partial<CampaignDraft>) => void;
}) {
  const [aiLoading, setAiLoading] = useState(false);

  const smsCharCount = draft.bodyText.length;
  const smsSegments = Math.max(1, Math.ceil(smsCharCount / 160));

  const handleAiWrite = useCallback(() => {
    setAiLoading(true);
    // Mock AI generation
    setTimeout(() => {
      if (draft.type === "email") {
        onChange({
          subject: "Spring Cleanout Special — Save 20% This Month!",
          bodyHtml: `<h2>Spring is Here — Time for Your Cleanout Special!</h2>
<p>Hi there,</p>
<p>As temperatures start to rise, now is the perfect time to make sure your service area is running at peak efficiency. Our experienced team will inspect, clean, and optimize your space in no time.</p>
<h3>What's Included:</h3>
<ul>
<li>Full system inspection and diagnostics</li>
<li>Filter replacement</li>
<li>Coil cleaning</li>
<li>Thermostat calibration</li>
<li>Refrigerant level check</li>
</ul>
<p><strong>Book your tune-up today and save 20%!</strong></p>
<p>Use code <strong>SPRING20</strong> when scheduling online or mention it when you call.</p>
<p>Best regards,<br/>The Northern Removals Team</p>`,
        });
      } else {
        onChange({
          bodyText:
            "Spring cleanout special! Save 20% this month. Book now at northernremovals.com.au/book or call (555) 123-4567. Use code SPRING20. Reply STOP to opt out.",
        });
      }
      setAiLoading(false);
    }, 1500);
  }, [draft.type, onChange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {draft.type === "email" ? "Email Content" : "SMS Content"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {draft.type === "email"
              ? "Write your email subject and body."
              : "Write your SMS message."}
          </p>
        </div>
        <button
          onClick={handleAiWrite}
          disabled={aiLoading}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
            aiLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:bg-accent/80",
          )}
        >
          <Sparkles className={cn("h-4 w-4", aiLoading && "animate-spin")} />
          {aiLoading ? "Generating..." : "AI Write"}
        </button>
      </div>

      {/* Campaign name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Campaign Name *
        </label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Spring Cleanout Special"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />
      </div>

      {draft.type === "email" ? (
        <>
          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Subject Line *
            </label>
            <input
              value={draft.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="Enter email subject..."
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* Email body — simple textarea with basic formatting buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email Body *
            </label>
            <div className="rounded-lg border border-input overflow-hidden">
              <div className="flex items-center gap-1 border-b border-input bg-muted/30 p-2">
                <button
                  onClick={() =>
                    onChange({
                      bodyHtml: draft.bodyHtml + "<strong></strong>",
                    })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() =>
                    onChange({ bodyHtml: draft.bodyHtml + "<em></em>" })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded text-xs italic text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() =>
                    onChange({ bodyHtml: draft.bodyHtml + "<h2></h2>" })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Heading"
                >
                  H
                </button>
                <div className="h-4 w-px bg-border mx-1" />
                <button
                  onClick={() =>
                    onChange({
                      bodyHtml:
                        draft.bodyHtml + '<a href="">Link text</a>',
                    })
                  }
                  className="flex h-7 items-center justify-center rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Link"
                >
                  Link
                </button>
                <button
                  onClick={() =>
                    onChange({
                      bodyHtml:
                        draft.bodyHtml + "<ul><li></li></ul>",
                    })
                  }
                  className="flex h-7 items-center justify-center rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="List"
                >
                  List
                </button>
              </div>
              <textarea
                value={draft.bodyHtml}
                onChange={(e) => onChange({ bodyHtml: e.target.value })}
                placeholder="Write your email content here (HTML supported)..."
                rows={12}
                className="w-full bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* SMS body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                SMS Message *
              </label>
              <span
                className={cn(
                  "text-xs font-medium",
                  smsCharCount > 160
                    ? "text-warning"
                    : "text-muted-foreground",
                )}
              >
                {smsCharCount}/160{" "}
                {smsSegments > 1 && `(${smsSegments} segments)`}
              </span>
            </div>
            <textarea
              value={draft.bodyText}
              onChange={(e) => onChange({ bodyText: e.target.value })}
              placeholder="Type your SMS message..."
              rows={4}
              maxLength={640}
              className="w-full rounded-lg border border-input bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground">
              SMS messages are split into 160-character segments. Each segment
              counts as one message.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StepReview({
  draft,
  estimatedRecipients,
  onChange,
}: {
  draft: CampaignDraft;
  estimatedRecipients: number;
  onChange: (updates: Partial<CampaignDraft>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Review &amp; Schedule
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your campaign before sending.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {draft.type === "email" ? (
              <Mail className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {draft.type === "email" ? "Email" : "SMS"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Recipients</p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {estimatedRecipients.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Campaign</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {draft.name || "Untitled"}
          </p>
        </div>
      </div>

      {/* Message preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Message Preview
        </h3>
        <div className="rounded-lg border border-border bg-card p-5">
          {draft.type === "email" ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="text-sm font-medium text-foreground">
                  {draft.subject || "(No subject)"}
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: draft.bodyHtml || "<em>No content yet</em>",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-xs mx-auto">
              <div className="rounded-2xl bg-primary/10 px-4 py-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {draft.bodyText || "(No message yet)"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          When to Send
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => onChange({ sendNow: true })}
            className={cn(
              "flex-1 flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
              draft.sendNow
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <Send
              className={cn(
                "h-5 w-5",
                draft.sendNow ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Send Now</p>
              <p className="text-xs text-muted-foreground">
                Campaign will be sent immediately
              </p>
            </div>
          </button>
          <button
            onClick={() => onChange({ sendNow: false })}
            className={cn(
              "flex-1 flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
              !draft.sendNow
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <Clock
              className={cn(
                "h-5 w-5",
                !draft.sendNow ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Schedule
              </p>
              <p className="text-xs text-muted-foreground">
                Pick a date and time
              </p>
            </div>
          </button>
        </div>

        {!draft.sendNow && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Date
              </label>
              <input
                type="date"
                value={draft.scheduledDate}
                onChange={(e) =>
                  onChange({ scheduledDate: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Time
              </label>
              <input
                type="time"
                value={draft.scheduledTime}
                onChange={(e) =>
                  onChange({ scheduledTime: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──

const STEPS = ["Type", "Audience", "Content", "Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const toast = useToast();
  const { mutate: createCampaign, isLoading: isCreating } = useCreateCampaign();

  const [draft, setDraft] = useState<CampaignDraft>({
    type: null,
    name: "",
    audience: {
      allContacts: true,
      tags: [],
      minScore: 0,
      maxScore: 100,
      source: "",
    },
    subject: "",
    bodyHtml: "",
    bodyText: "",
    sendNow: true,
    scheduledDate: "",
    scheduledTime: "09:00",
  });

  function updateDraft(updates: Partial<CampaignDraft>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case 0:
        return draft.type !== null;
      case 1:
        return true;
      case 2:
        if (!draft.name.trim()) return false;
        if (draft.type === "email")
          return draft.subject.trim().length > 0 && draft.bodyHtml.trim().length > 0;
        return draft.bodyText.trim().length > 0;
      case 3:
        if (!draft.sendNow && !draft.scheduledDate) return false;
        return true;
      default:
        return false;
    }
  }

  const estimatedRecipients = draft.audience.allContacts
    ? MOCK_CONTACT_COUNT
    : Math.floor(
        MOCK_CONTACT_COUNT *
          (draft.audience.tags.length > 0 ? 0.3 : 1) *
          ((draft.audience.maxScore - draft.audience.minScore) / 100),
      );

  async function handleSend() {
    if (!draft.type) return;

    // Build the scheduled time if scheduling
    let scheduledAt: string | undefined;
    if (!draft.sendNow && draft.scheduledDate) {
      const dateTime = `${draft.scheduledDate}T${draft.scheduledTime || "09:00"}:00`;
      scheduledAt = new Date(dateTime).toISOString();
    }

    const input: CreateCampaignInput = {
      name: draft.name,
      type: draft.type,
      subject: draft.type === "email" ? draft.subject : undefined,
      bodyHtml: draft.type === "email" ? draft.bodyHtml : undefined,
      bodyText: draft.type === "sms" ? draft.bodyText : undefined,
      segmentFilter: {
        allContacts: draft.audience.allContacts,
        tags: draft.audience.tags.length > 0 ? draft.audience.tags : undefined,
        minScore: draft.audience.minScore > 0 ? draft.audience.minScore : undefined,
        maxScore: draft.audience.maxScore < 100 ? draft.audience.maxScore : undefined,
        source: draft.audience.source || undefined,
      },
      scheduledAt,
    };

    const result = await createCampaign(input);

    if (result) {
      toast.success(
        draft.sendNow
          ? "Campaign created successfully!"
          : `Campaign scheduled for ${draft.scheduledDate} at ${draft.scheduledTime}`,
      );
      setTimeout(() => {
        router.push(`/dashboard/campaigns/${result.id}`);
      }, 1500);
    } else {
      toast.error("Failed to create campaign. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/campaigns"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create Campaign
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                if (i < currentStep) setCurrentStep(i);
              }}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-colors",
                i === currentStep
                  ? "text-primary"
                  : i < currentStep
                    ? "text-foreground cursor-pointer hover:text-primary"
                    : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : i < currentStep
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < currentStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span className="hidden sm:inline">{step}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 rounded-full",
                  i < currentStep ? "bg-success" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {currentStep === 0 && (
          <StepTypeSelection
            selected={draft.type}
            onSelect={(type) => updateDraft({ type })}
          />
        )}
        {currentStep === 1 && (
          <StepAudience
            audience={draft.audience}
            onChange={(audience) => updateDraft({ audience })}
          />
        )}
        {currentStep === 2 && (
          <StepContent draft={draft} onChange={updateDraft} />
        )}
        {currentStep === 3 && (
          <StepReview
            draft={draft}
            estimatedRecipients={estimatedRecipients}
            onChange={updateDraft}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
            currentStep === 0
              ? "text-muted-foreground cursor-not-allowed"
              : "border border-input text-foreground hover:bg-muted",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              canProceed()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canProceed() || isCreating}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              canProceed() && !isCreating
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isCreating ? "Creating..." : draft.sendNow ? "Send Campaign" : "Schedule Campaign"}
          </button>
        )}
      </div>
    </div>
  );
}
