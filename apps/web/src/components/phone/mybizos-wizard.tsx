"use client";

import { useState } from "react";
import {
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Phone,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard } from "@/app/dashboard/settings/phone/setup-wizard";
import {
  TWILIO_PRICING,
  TWILIO_PRICING_URL,
  formatPrice,
  type NumberType,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Shared sub-component                                                       */
/* -------------------------------------------------------------------------- */

function SectionCard({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MyBizOS Wizard                                                             */
/* -------------------------------------------------------------------------- */

interface MyBizOSWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MyBizOSWizard({ onComplete, onBack }: MyBizOSWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedNumberType, setSelectedNumberType] = useState<NumberType | null>(null);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");

  const selectedCountryData = TWILIO_PRICING.find((c) => c.code === selectedCountry);

  const wizardSteps = [
    { title: "Country", description: "Choose your country" },
    { title: "Number Type", description: "Choose a number type" },
    { title: "Get Number", description: "Reserve your number" },
  ];

  const canProceed =
    step === 0
      ? selectedCountry !== null
      : step === 1
        ? selectedNumberType !== null
        : step === 2
          ? waitlistName.length > 1 && waitlistEmail.includes("@")
          : true;

  return (
    <SectionCard title="Set Up Your Number" icon={Sparkles}>
      <SetupWizard
        steps={wizardSteps}
        currentStep={step}
        onNext={() => setStep((s) => Math.min(s + 1, wizardSteps.length - 1))}
        onBack={() => {
          if (step === 0) {
            onBack();
            return;
          }
          setStep((s) => Math.max(s - 1, 0));
        }}
        onComplete={onComplete}
        canProceed={canProceed}
      >
        {/* Step 1: Select Country */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Where is your business located? We'll show you available number types and pricing.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {TWILIO_PRICING.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                    selectedCountry === country.code
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <span className="text-3xl">{country.flag}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{country.name}</p>
                    <p className="text-xs text-muted-foreground">
                      From {formatPrice(Math.min(...country.numberTypes.map((t) => t.monthlyPrice)))}/mo
                    </p>
                  </div>
                  {selectedCountry === country.code && (
                    <Check className="h-5 w-5 text-primary ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors pt-1">
              <Globe className="h-4 w-4" />
              More countries coming soon
            </button>
          </div>
        )}

        {/* Step 2: Choose Number Type */}
        {step === 1 && selectedCountryData && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a number type for {selectedCountryData.flag} {selectedCountryData.name}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {selectedCountryData.numberTypes.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => setSelectedNumberType(nt.type)}
                  disabled={!nt.available}
                  className={cn(
                    "relative flex flex-col items-center rounded-xl border-2 p-5 text-center transition-all",
                    selectedNumberType === nt.type
                      ? "border-primary bg-primary/5 shadow-sm"
                      : nt.available
                        ? "border-border hover:border-muted-foreground/30"
                        : "border-border opacity-50 cursor-not-allowed",
                  )}
                >
                  {nt.type === "local" && (
                    <span className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Popular
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full mb-3",
                      selectedNumberType === nt.type ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    {nt.type === "local" && <Phone className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                    {nt.type === "mobile" && <Phone className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                    {nt.type === "toll-free" && <Zap className={cn("h-5 w-5", selectedNumberType === nt.type ? "text-primary" : "text-muted-foreground")} />}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{nt.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatPrice(nt.monthlyPrice)}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                  {selectedNumberType === nt.type && (
                    <div className="absolute top-3 left-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <span>Prices from Twilio as of March 2026. Actual prices may vary.</span>
              <a
                href={TWILIO_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
              >
                See current pricing
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Step 3: Reserve / Waitlist */}
        {step === 2 && selectedCountryData && selectedNumberType && (
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCountryData.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedCountryData.name} {selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.label} Number
                  </p>
                  <p className="text-sm text-primary font-bold">
                    {formatPrice(selectedCountryData.numberTypes.find((t) => t.type === selectedNumberType)?.monthlyPrice ?? 0)}/month
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                <p className="text-sm font-medium text-foreground">Coming Soon</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We're setting up our managed phone service. Enter your details below to be first in line when it launches. We'll email you as soon as your number is ready.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input
                  type="text"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder="e.g., Smith's Plumbing"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <p className="text-xs text-muted-foreground">
                  We'll only use this to notify you when your number is ready
                </p>
              </div>
            </div>
          </div>
        )}
      </SetupWizard>
    </SectionCard>
  );
}
