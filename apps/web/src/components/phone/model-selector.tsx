"use client";

import {
  Check,
  ChevronRight,
  Settings2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhoneModel } from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Model Card (internal)                                                      */
/* -------------------------------------------------------------------------- */

function ModelCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeVariant,
  features,
  buttonText,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "recommended" | "advanced";
  features: string[];
  buttonText: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 p-6 transition-all cursor-pointer group",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-muted-foreground/40 bg-card hover:shadow-md",
      )}
      onClick={onSelect}
    >
      {/* Badge */}
      <span
        className={cn(
          "absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          badgeVariant === "recommended"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {badgeVariant === "recommended" && <Sparkles className="h-3 w-3" />}
        {badgeVariant === "advanced" && <Settings2 className="h-3 w-3" />}
        {badge}
      </span>

      {/* Icon */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl mb-4 transition-colors",
          selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5",
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 transition-colors",
            selected ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        />
      </div>

      {/* Title + Subtitle */}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

      {/* Features */}
      <ul className="mt-4 space-y-2 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Button */}
      <button
        className={cn(
          "mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
          selected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-foreground hover:bg-muted/80",
        )}
      >
        {buttonText}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Model Selector                                                             */
/* -------------------------------------------------------------------------- */

interface ModelSelectorProps {
  onSelectModel: (model: PhoneModel) => void;
}

export function ModelSelector({ onSelectModel }: ModelSelectorProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ModelCard
        selected={false}
        onSelect={() => onSelectModel("mybizos")}
        icon={Sparkles}
        title="Get a MyBizOS Phone Number"
        subtitle="We handle everything. Get a number in 60 seconds."
        badge="Recommended"
        badgeVariant="recommended"
        features={[
          "No technical setup required",
          "AI answers calls immediately",
          "Numbers from 100+ countries",
          "Simple monthly pricing",
        ]}
        buttonText="Get Started"
      />

      <ModelCard
        selected={false}
        onSelect={() => onSelectModel("byo-twilio")}
        icon={Settings2}
        title="Connect Your Own Twilio"
        subtitle="For businesses that already have a Twilio account."
        badge="Advanced"
        badgeVariant="advanced"
        features={[
          "Use your existing numbers",
          "Direct Twilio billing",
          "Full API access",
          "Complete control",
        ]}
        buttonText="Connect Twilio"
      />
    </div>
  );
}
