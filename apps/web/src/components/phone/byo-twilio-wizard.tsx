"use client";

import { useState, useCallback } from "react";
import {
  AlertTriangle,
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
import { apiClient, tryFetch, ApiRequestError } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import {
  MOCK_NUMBERS,
  formatPhoneNumber,
  type PhoneNumber,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Shared sub-components                                                      */
/* -------------------------------------------------------------------------- */

function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Demo mode</span> — connect your API to use real Twilio numbers
      </p>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-popover border border-border p-3 text-xs text-popover-foreground shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 h-2 w-2 rotate-45 bg-popover border-r border-b border-border" />
        </div>
      )}
    </span>
  );
}

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
  const [isLive, setIsLive] = useState(false);
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
    const path = buildPath("/orgs/:orgId/phone-system/numbers");
    const result = await tryFetch(() =>
      apiClient.get<{ numbers: PhoneNumber[] }>(path),
    );

    if (result !== null) {
      setPhoneNumbers(result.numbers);
      setIsLive(true);
    } else {
      setPhoneNumbers(MOCK_NUMBERS);
      setIsLive(false);
    }
    setNumbersLoading(false);
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectLoading(true);
    setConnectError(null);

    const path = buildPath("/orgs/:orgId/phone-system/connect");

    try {
      const result = await tryFetch(() =>
        apiClient.post<{ success: boolean; accountName: string }>(path, {
          accountSid,
          authToken,
          provider: "byo-twilio",
        }),
      );

      if (result !== null) {
        setIsLive(true);
        setStep(1);
        await fetchNumbers();
      } else {
        setIsLive(false);
        setPhoneNumbers(MOCK_NUMBERS);
        setStep(1);
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setConnectError(err.message);
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
          if (step === 0) {
            handleConnect();
            return;
          }
          setStep((s) => Math.min(s + 1, wizardSteps.length - 1));
        }}
        onBack={() => {
          if (step === 0) {
            onBack();
            return;
          }
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
                Connect your Twilio account so MyBizOS can manage your phone numbers.
                You keep full control and pay Twilio directly for usage.
              </p>
            </div>

            <a
              href="https://www.twilio.com/try-twilio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Don't have a Twilio account? Create one free
            </a>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Account SID
                  <Tooltip text="In Twilio, go to your Dashboard. You'll see 'Account SID' near the top. Copy and paste it here. It starts with 'AC'." />
                </label>
                <input
                  type="text"
                  value={accountSid}
                  onChange={(e) => {
                    setAccountSid(e.target.value);
                    setConnectError(null);
                  }}
                  placeholder="Starts with AC..."
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Auth Token
                  <Tooltip text="Right below the Account SID on your Twilio Dashboard, you'll see 'Auth Token'. Click the eye icon to reveal it, then copy and paste it here." />
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={authToken}
                    onChange={(e) => {
                      setAuthToken(e.target.value);
                      setConnectError(null);
                    }}
                    placeholder="Paste your Auth Token here"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is encrypted and never shown again after you connect.
                </p>
              </div>
            </div>

            {/* Where do I find these? */}
            <details className="rounded-lg border border-border">
              <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <CircleHelp className="h-4 w-4" />
                Where do I find these?
              </summary>
              <div className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Go to{" "}
                    <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      twilio.com/console
                    </a>
                  </li>
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
            {!isLive && <DemoBanner />}

            {numbersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading your phone numbers from Twilio...
                </span>
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-6 text-center space-y-3">
                <Phone className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-sm font-medium text-foreground">No phone numbers found</p>
                <p className="text-sm text-muted-foreground">
                  You don't have any phone numbers in your Twilio account yet.
                </p>
                <a
                  href="https://www.twilio.com/console/phone-numbers/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buy a number on twilio.com
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the phone number(s) you want to use with MyBizOS:
                </p>
                <div className="space-y-2">
                  {phoneNumbers.map((num) => {
                    const isSelected = selectedNumbers.has(num.sid);
                    return (
                      <label
                        key={num.sid}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedNumbers((prev) => {
                              const next = new Set(prev);
                              if (next.has(num.sid)) {
                                next.delete(num.sid);
                              } else {
                                next.add(num.sid);
                              }
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold font-mono text-foreground">
                              {formatPhoneNumber(num.phoneNumber)}
                            </span>
                            {num.friendlyName && (
                              <span className="text-xs text-muted-foreground">{num.friendlyName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {num.voiceEnabled && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                <Phone className="h-3 w-3" /> Voice
                              </span>
                            )}
                            {num.smsEnabled && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                                <MessageSquare className="h-3 w-3" /> SMS
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Success */}
        {step === 2 && (
          <SuccessCelebration
            title="Your Phone System is Ready!"
            message="Calls to your selected numbers will be answered by AI immediately. You can customise everything from the settings page."
          />
        )}
      </SetupWizard>
    </SectionCard>
  );
}
