"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Hash,
  Loader2,
  MessageSquare,
  Phone,
  Settings2,
  Trash2,
} from "lucide-react";
import { DemoBanner, SectionCard } from "./shared-ui";
import {
  formatPhoneNumber,
  type PhoneModel,
  type PhoneNumber,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Number List                                                                */
/* -------------------------------------------------------------------------- */

interface NumberListProps {
  numbers: PhoneNumber[];
  provider: PhoneModel | null;
  accountName: string | null;
  isLive: boolean;
  numbersLoading: boolean;
  disconnectLoading: boolean;
  onConfigure: (numberSid: string) => void;
  onDisconnect: () => void;
}

export function NumberList({
  numbers,
  provider,
  accountName,
  isLive,
  numbersLoading,
  disconnectLoading,
  onConfigure,
  onDisconnect,
}: NumberListProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phone System</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your business phone numbers</p>
        </div>
      </div>

      {!isLive && <DemoBanner />}

      {/* Connected status banner */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Phone System Connected</p>
            <p className="text-xs text-muted-foreground">
              {provider === "mybizos" ? "MyBizOS Phone" : "Your Twilio Account"}
              {accountName ? ` \u00b7 ${accountName}` : ""}
              {" \u00b7 "}{numbers.length} number{numbers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button onClick={onDisconnect} disabled={disconnectLoading} className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
          {disconnectLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Disconnect
        </button>
      </div>

      {/* Phone Numbers List */}
      <SectionCard title="Your Phone Numbers" description="Manage your business phone numbers and how calls are handled" icon={Hash}>
        {numbersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading numbers...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {numbers.map((pn) => (
              <div key={pn.sid} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Phone className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{formatPhoneNumber(pn.phoneNumber)}</p>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pn.friendlyName}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {pn.voiceEnabled && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> Voice</span>}
                      {pn.smsEnabled && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> SMS</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => onConfigure(pn.sid)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                  <Settings2 className="h-3.5 w-3.5" /> Configure
                </button>
              </div>
            ))}
            {numbers.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No phone numbers found.{" "}
                {provider === "byo-twilio" ? (
                  <>Purchase one from your <a href="https://www.twilio.com/console/phone-numbers/search" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twilio console</a>, then refresh this page.</>
                ) : "Your number is being provisioned. Check back shortly."}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
