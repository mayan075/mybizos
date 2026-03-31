"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import { apiClient, tryFetch, ApiRequestError } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { ModelSelector } from "@/components/phone/model-selector";
import { ManagedPhoneWizard } from "@/components/phone/managed-phone-wizard";
import { BYOTwilioWizard } from "@/components/phone/byo-twilio-wizard";
import { NumberList } from "@/components/phone/number-list";
import { NumberConfig, type NumberConfigPayload } from "@/components/phone/number-config";
import {
  type PhoneModel,
  type PhoneNumber,
  type PhoneSystemStatus,
} from "@/components/phone/pricing-data";

type ViewState = "loading" | "model-select" | "managed-wizard" | "byo-wizard" | "connected" | "configure-number";

export default function PhoneSettingsPage() {
  const [view, setView] = useState<ViewState>("loading");
  const [connectedProvider, setConnectedProvider] = useState<PhoneModel | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [configuringNumberSid, setConfiguringNumberSid] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const toast = useToast();
  const [apiOffline, setApiOffline] = useState(false);

  const fetchStatus = useCallback(async () => {
    const path = buildPath("/orgs/:orgId/phone-system/status");
    if (!path) return;
    const result = await tryFetch(() => apiClient.get<PhoneSystemStatus>(path));

    if (result !== null) {
      setIsLive(true);
      setApiOffline(false);
      if (result.connected) {
        setConnectedProvider(result.provider ?? "byo-twilio");
        setAccountName(result.accountName ?? null);
        setView("connected");
        return;
      }
    } else {
      // API unreachable
      setIsLive(false);
      setApiOffline(true);
    }
    setView("model-select");
  }, []);

  const fetchNumbers = useCallback(async () => {
    setNumbersLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/numbers");
    if (!path) return;
    try {
      const result = await apiClient.get<{ numbers: PhoneNumber[] }>(path);
      setPhoneNumbers(result.numbers);
      setIsLive(true);
    } catch {
      // If numbers fail to load, show empty state
      setPhoneNumbers([]);
    }
    setNumbersLoading(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnectLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/disconnect");
    if (!path) return;
    await tryFetch(() => apiClient.delete<{ success: boolean }>(path));
    setConnectedProvider(null);
    setAccountName(null);
    setPhoneNumbers([]);
    setDisconnectLoading(false);
    setView("model-select");
    toast.success("Phone system disconnected");
  }, []);

  const handleConfigureSave = useCallback(async (numberSid: string, config: NumberConfigPayload) => {
    setSaveLoading(true);
    const path = buildPath(`/orgs/:orgId/phone-system/numbers/${numberSid}/configure`);
    if (!path) return;
    const result = await tryFetch(() => apiClient.post<{ success: boolean }>(path, config));
    if (result !== null) {
      toast.success("Phone number settings saved!");
    } else {
      toast.error("Failed to save settings. Please try again.");
    }
    setSaveLoading(false);
    setTimeout(() => { setConfiguringNumberSid(null); setView("connected"); }, 800);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { if (view === "connected") fetchNumbers(); }, [view, fetchNumbers]);

  const configuringNumber = phoneNumbers.find((n) => n.sid === configuringNumberSid);


  if (view === "loading") return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (view === "configure-number" && configuringNumberSid && configuringNumber) {
    return <>{/* Toast handled by centralized ToastProvider */}<NumberConfig number={configuringNumber} isLive={isLive} saveLoading={saveLoading} onSave={(cfg) => handleConfigureSave(configuringNumberSid, cfg)} onBack={() => { setConfiguringNumberSid(null); setView("connected"); }} /></>;
  }

  if (view === "managed-wizard") {
    return <div className="space-y-6 max-w-3xl">{/* Toast handled by centralized ToastProvider */}<div className="flex items-center gap-3"><button onClick={() => setView("model-select")} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-xl font-bold text-foreground">Get a HararAI Phone Number</h1><p className="text-sm text-muted-foreground mt-0.5">We handle everything behind the scenes</p></div></div><ManagedPhoneWizard onComplete={() => { toast.success("You're on the waitlist! We'll email you when your number is ready."); setView("model-select"); }} onBack={() => setView("model-select")} /></div>;
  }

  if (view === "byo-wizard") {
    return <div className="space-y-6 max-w-3xl">{/* Toast handled by centralized ToastProvider */}<div className="flex items-center gap-3"><button onClick={() => setView("model-select")} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-xl font-bold text-foreground">Connect Your Own Twilio</h1><p className="text-sm text-muted-foreground mt-0.5">Link your existing Twilio account to HararAI</p></div></div><BYOTwilioWizard onComplete={() => { setConnectedProvider("byo-twilio"); setView("connected"); toast.success("Phone system connected successfully!"); }} onBack={() => setView("model-select")} /></div>;
  }

  if (view === "connected") {
    return <>{/* Toast handled by centralized ToastProvider */}<NumberList numbers={phoneNumbers} provider={connectedProvider} accountName={accountName} isLive={isLive} numbersLoading={numbersLoading} disconnectLoading={disconnectLoading} onConfigure={(sid) => { setConfiguringNumberSid(sid); setView("configure-number"); }} onDisconnect={handleDisconnect} onRefresh={fetchNumbers} /></>;
  }

  // model-select (default)
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast handled by centralized ToastProvider */}
      {apiOffline && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            API server not reachable. Start the backend with <code className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs">cd apps/api && npx tsx src/index.ts</code> to connect your real Twilio account.
          </p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-2xl font-bold text-foreground">Phone System</h1><p className="text-sm text-muted-foreground mt-0.5">Choose how you want to set up your business phone</p></div>
      </div>
      <ModelSelector onSelectModel={(model) => setView(model === "managed" ? "managed-wizard" : "byo-wizard")} />
    </div>
  );
}
