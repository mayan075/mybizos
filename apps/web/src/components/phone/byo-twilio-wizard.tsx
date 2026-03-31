"use client";

import { useState, useCallback } from "react";
import {
  CircleHelp,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Phone,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupWizard, SuccessCelebration } from "@/app/dashboard/settings/phone/setup-wizard";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import { DemoBanner, SectionCard, Tooltip } from "./shared-ui";
import {
  formatPhoneNumber,
  type PhoneNumber,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  BYO Twilio Wizard                                                          */
/* -------------------------------------------------------------------------- */

interface BYOTwilioWizardProps {
  onComplete: (numbers: PhoneNumber[]) => void;
  onBack: () => void;
}

export function BYOTwilioWizard({ onComplete, onBack }: BYOTwilioWizardProps) {
  const [step, setStep] = useState(0);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  const wizardSteps = [
    { title: "Connect Account", description: "Link your Twilio account" },
    { title: "Choose Numbers", description: "Select your phone numbers" },
    { title: "All Done!", description: "Your phone system is ready" },
  ];

  const canProceed =
    step === 0
      ? accountSid.length > 10 && authToken.length > 10 && !connectLoading
      : step === 1
        ? selectedNumbers.size > 0
        : true;

  const fetchNumbers = useCallback(async () => {
    setNumbersLoading(true);
    try {
      const path = buildPath("/orgs/:orgId/phone-system/numbers");
      if (!path) return;
      const result = await apiClient.get<{ numbers: PhoneNumber[] }>(path);
      setPhoneNumbers(result.numbers);
      // Auto-select all numbers by default
      setSelectedNumbers(new Set(result.numbers.map((n) => n.sid)));
    } catch (err) {
      const message = err instanceof ApiRequestError
        ? err.message
        : "Failed to load phone numbers from Twilio. Please try again.";
      setConnectError(message);
      setPhoneNumbers([]);
    } finally {
      setNumbersLoading(false);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectLoading(true);
    setConnectError(null);

    try {
      const path = buildPath("/orgs/:orgId/phone-system/connect");
      if (!path) return;
      await apiClient.post<{ success: boolean; accountName: string }>(path, {
        accountSid,
        authToken,
        provider: "byo-twilio",
      });

      // Credentials validated — move to step 2 and fetch real numbers
      setStep(1);
      await fetchNumbers();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setConnectError(err.message);
      } else if (err instanceof TypeError) {
        // Network error — API server not running
        setConnectError(
          "Cannot reach the API server. Make sure the backend is running.",
        );
      } else {
        setConnectError("Failed to connect. Please check your credentials and try again.");
      }
    } finally {
      setConnectLoading(false);
    }
  }, [accountSid, authToken, fetchNumbers]);

  return (
    <SectionCard title="Connect Twilio Account" icon={Settings2}>
      <SetupWizard
        steps={wizardSteps}
        currentStep={step}
        onNext={() => {
          if (step === 0) { handleConnect(); return; }
          setStep((s) => Math.min(s + 1, wizardSteps.length - 1));
        }}
        onBack={() => {
          if (step === 0) { onBack(); return; }
          setConnectError(null);
          setStep((s) => Math.max(s - 1, 0));
        }}
        onComplete={() => {
          const selected = phoneNumbers.filter((n) => selectedNumbers.has(n.sid));
          onComplete(selected.length > 0 ? selected : phoneNumbers);
        }}
        canProceed={canProceed}
        isLoading={connectLoading}
      >
        {/* Step 1: Credentials */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">How it works</p>
              <p className="text-sm text-muted-foreground">
                Connect your Twilio account so HararAI can manage your phone numbers.
                Your credentials are validated live against the Twilio API.
                You keep full control and pay Twilio directly for usage.
              </p>
            </div>
            <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors">
              <ExternalLink className="h-4 w-4" /> Don't have a Twilio account? Create one free
            </a>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Account SID
                  <Tooltip text="In Twilio, go to your Dashboard. You'll see 'Account SID' near the top. Copy and paste it here. It starts with 'AC'." />
                </label>
                <input type="text" value={accountSid} onChange={(e) => { setAccountSid(e.target.value); setConnectError(null); }} placeholder="Starts with AC..." className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Auth Token
                  <Tooltip text="Right below the Account SID on your Twilio Dashboard, you'll see 'Auth Token'. Click the eye icon to reveal it, then copy and paste it here." />
                </label>
                <div className="relative">
                  <input type={showToken ? "text" : "password"} value={authToken} onChange={(e) => { setAuthToken(e.target.value); setConnectError(null); }} placeholder="Paste your Auth Token here" className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono" />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">This is encrypted and never shown again after you connect.</p>
              </div>
            </div>
            <details className="rounded-lg border border-border">
              <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <CircleHelp className="h-4 w-4" /> Where do I find these?
              </summary>
              <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Go to <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com/console</a></li>
                  <li>Sign in to your Twilio account</li>
                  <li>On the dashboard, you'll see <strong className="text-foreground">Account SID</strong> and <strong className="text-foreground">Auth Token</strong></li>
                  <li>Click the copy icon next to each to copy them</li>
                  <li>Paste them in the fields above</li>
                </ol>
              </div>
            </details>
            {connectError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3 animate-in fade-in duration-200">
                <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{connectError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Your Numbers */}
        {step === 1 && (
          <div className="space-y-4">
            {numbersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading your phone numbers from Twilio...</span>
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-6 text-center space-y-3">
                <Phone className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-sm font-medium text-foreground">No phone numbers found</p>
                <p className="text-sm text-muted-foreground">You don't have any phone numbers in your Twilio account yet.</p>
                <a href="https://www.twilio.com/console/phone-numbers/search" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Buy a number on twilio.com
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select the phone number(s) you want to use with HararAI:</p>
                <div className="space-y-2">
                  {phoneNumbers.map((num) => {
                    const isSelected = selectedNumbers.has(num.sid);
                    return (
                      <label key={num.sid} className={cn("flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors", isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                        <input type="checkbox" checked={isSelected} onChange={() => { setSelectedNumbers((prev) => { const next = new Set(prev); if (next.has(num.sid)) next.delete(num.sid); else next.add(num.sid); return next; }); }} className="h-4 w-4 rounded border-input accent-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold font-mono text-foreground">{formatPhoneNumber(num.phoneNumber)}</span>
                            {num.friendlyName && <span className="text-xs text-muted-foreground">{num.friendlyName}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {num.voiceEnabled && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"><Phone className="h-3 w-3" /> Voice</span>}
                            {num.smsEnabled && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400"><MessageSquare className="h-3 w-3" /> SMS</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {connectError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3 animate-in fade-in duration-200">
                <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{connectError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Success */}
        {step === 2 && (
          <SuccessCelebration title="Your Phone System is Ready!" message="Calls to your selected numbers will be answered by AI immediately. You can customise everything from the settings page." />
        )}
      </SetupWizard>
    </SectionCard>
  );
}
