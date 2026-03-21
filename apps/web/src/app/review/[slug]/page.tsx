"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Star, ExternalLink, Send, CheckCircle2, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function slugToBusinessName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Star Rating                                                               */
/* -------------------------------------------------------------------------- */

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="group p-1 transition-transform hover:scale-110 active:scale-95"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 transition-colors",
                isFilled
                  ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                  : "fill-none text-gray-300 group-hover:text-yellow-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Rating Labels                                                             */
/* -------------------------------------------------------------------------- */

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Okay",
  4: "Great",
  5: "Excellent!",
};

/* -------------------------------------------------------------------------- */
/*  High-rating flow (4-5 stars)                                              */
/* -------------------------------------------------------------------------- */

function HighRatingView({
  businessName,
  rating,
  slug,
}: {
  businessName: string;
  rating: number;
  slug: string;
}) {
  const [extraFeedback, setExtraFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const googleReviewUrl = `https://www.google.com/maps/search/${encodeURIComponent(businessName)}`;

  const handleSubmitExtra = async () => {
    try {
      await fetch(`http://localhost:3001/public/review/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback: extraFeedback, type: "positive" }),
      });
    } catch {
      // API might not be up
    }
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Heart className="h-8 w-8 text-green-600 fill-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">
          We are so glad you had a great experience!
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Your feedback means the world to us
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">
          Would you mind sharing your feedback on Google?
        </p>
        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-8 py-4 text-base font-bold text-white hover:bg-green-700 transition-all shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30"
        >
          <ExternalLink className="h-5 w-5" />
          Leave a Google Review
        </a>
      </div>

      <div className="border-t border-gray-200 pt-5 space-y-3">
        <p className="text-sm text-gray-500">Anything else you would like to share?</p>
        <textarea
          rows={3}
          value={extraFeedback}
          onChange={(e) => setExtraFeedback(e.target.value)}
          placeholder="Tell us what you loved..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition resize-none"
        />
        {extraFeedback.trim() && !submitted && (
          <button
            type="button"
            onClick={handleSubmitExtra}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Send Feedback
          </button>
        )}
        {submitted && (
          <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Thank you for your kind words!
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Low-rating flow (1-3 stars)                                               */
/* -------------------------------------------------------------------------- */

function LowRatingView({
  rating,
  slug,
}: {
  rating: number;
  slug: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`http://localhost:3001/public/review/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback, type: "private" }),
      });
    } catch {
      // API might not be up
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <MessageCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Thank you for your feedback</h2>
        <p className="text-sm text-gray-500">
          Our team will review your comments and follow up with you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          We are sorry to hear that
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          We would love to make things right. Please let us know what happened.
        </p>
      </div>

      <div className="text-left space-y-2">
        <label htmlFor="low-feedback" className="block text-sm font-medium text-gray-700">
          What could we have done better?
        </label>
        <textarea
          id="low-feedback"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Please share your experience so we can improve..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!feedback.trim() || submitting}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all",
          feedback.trim() && !submitting
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
            : "bg-gray-200 text-gray-400 cursor-not-allowed",
        )}
      >
        <Send className="h-4 w-4" />
        {submitting ? "Sending..." : "Submit Private Feedback"}
      </button>

      <p className="text-xs text-gray-400">
        This feedback is sent directly to the team and will not be posted publicly.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main review page                                                          */
/* -------------------------------------------------------------------------- */

export default function ReviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "your-business";
  const businessName = slugToBusinessName(slug);

  const [rating, setRating] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-600/25">
            {businessName.charAt(0)}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-12">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Rating prompt — always visible */}
            <div className="space-y-5 mb-6">
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  How was your experience with {businessName}?
                </h2>
                <p className="text-sm text-gray-500 mt-1">Tap to rate</p>
              </div>

              <StarRating value={rating} onChange={setRating} />

              {rating > 0 && (
                <p className="text-center text-sm font-medium text-gray-600 animate-[fadeIn_0.2s_ease-out]">
                  {RATING_LABELS[rating]}
                </p>
              )}
            </div>

            {/* Conditional flow */}
            {rating >= 4 && (
              <HighRatingView
                businessName={businessName}
                rating={rating}
                slug={slug}
              />
            )}
            {rating >= 1 && rating <= 3 && (
              <LowRatingView rating={rating} slug={slug} />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold text-gray-500">MyBizOS</span>
        </p>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
