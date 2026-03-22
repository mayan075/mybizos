"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { apiClient, tryFetch } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import { ModelSelector } from "@/components/phone/model-selector";
import { MyBizOSWizard } from "@/components/phone/mybizos-wizard";
import { BYOTwilioWizard } from "@/components/phone/byo-twilio-wizard";
import { NumberList } from "@/components/phone/number-list";
import { NumberConfig, type NumberConfigPayload } from "@/components/phone/number-config";
import {
  MOCK_NUMBERS,
  type PhoneModel,
  type PhoneNumber,
  type PhoneSystemStatus,
} from "@/components/phone/pricing-data";

type ViewState = "loading" | "model-select" | "mybizos-wizard" | "byo-wizard" | "connected" | "configure-number";

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
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const fetchStatus = useCallback(async () => {
    const path = buildPath("/orgs/:orgId/phone-system/status");
    const result = await tryFetch(() => apiClient.get<PhoneSystemStatus>(path));
    if (result !== null) {
      setIsLive(true);
      if (result.connected) {
        setConnectedProvider(result.provider ?? "byo-twilio");
        setAccountName(result.accountName ?? null);
        setView("connected");
        return;
      }
    } else {
      setIsLive(false);
    }
    setView("model-select");
  }, []);

  const fetchNumbers = useCallback(async () => {
    setNumbersLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/numbers");
    const result = await tryFetch(() => apiClient.get<{ numbers: PhoneNumber[] }>(path));
    if (result !== null) { setPhoneNumbers(result.numbers); setIsLive(true); }
    else { setPhoneNumbers(MOCK_NUMBERS); setIsLive(false); }
    setNumbersLoading(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnectLoading(true);
    const path = buildPath("/orgs/:orgId/phone-system/disconnect");
    await tryFetch(() => apiClient.delete<{ success: boolean }>(path));
    setConnectedProvider(null); setAccountName(null); setPhoneNumbers([]);
    setDisconnectLoading(false); setView("model-select");
    showToast("Phone system disconnected");
  }, []);

  const handleConfigureSave = useCallback(async (numberSid: string, config: NumberConfigPayload) => {
    setSaveLoading(true);
    const path = buildPath(`/orgs/:orgId/phone-system/numbers/${numberSid}/configure`);
    const result = await tryFetch(() => apiClient.post<{ success: boolean }>(path, config));
    showToast(result !== null ? "Phone number settings saved!" : "Settings saved locally (API offline)");
    setSaveLoading(false);
    setTimeout(() => { setConfiguringNumberSid(null); setView("connected"); }, 800);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { if (view === "connected") fetchNumbers(); }, [view, fetchNumbers]);

  const configuringNumber = phoneNumbers.find((n) => n.sid === configuringNumberSid);

  const toastEl = toast && (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top-2 duration-200">
      <CheckCircle2 className="h-4 w-4" />{toast}
    </div>
  );

  if (view === "loading") return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (view === "configure-number" && configuringNumberSid && configuringNumber) {
    return <>{toastEl}<NumberConfig number={configuringNumber} isLive={isLive} saveLoading={saveLoading} onSave={(cfg) => handleConfigureSave(configuringNumberSid, cfg)} onBack={() => { setConfiguringNumberSid(null); setView("connected"); }} /></>;
  }

  if (view === "mybizos-wizard") {
    return <div className="space-y-6 max-w-3xl">{toastEl}<div className="flex items-center gap-3"><button onClick={() => setView("model-select")} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-xl font-bold text-foreground">Get a MyBizOS Phone Number</h1><p className="text-sm text-muted-foreground mt-0.5">We handle everything behind the scenes</p></div></div><MyBizOSWizard onComplete={() => { showToast("You're on the waitlist! We'll email you when your number is ready."); setView("model-select"); }} onBack={() => setView("model-select")} /></div>;
  }

  if (view === "byo-wizard") {
    return <div className="space-y-6 max-w-3xl">{toastEl}<div className="flex items-center gap-3"><button onClick={() => setView("model-select")} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-xl font-bold text-foreground">Connect Your Own Twilio</h1><p className="text-sm text-muted-foreground mt-0.5">Link your existing Twilio account to MyBizOS</p></div></div><BYOTwilioWizard onComplete={() => { setConnectedProvider("byo-twilio"); setView("connected"); showToast("Phone system connected successfully!"); }} onBack={() => setView("model-select")} /></div>;
  }

  if (view === "connected") {
    return <>{toastEl}<NumberList numbers={phoneNumbers} provider={connectedProvider} accountName={accountName} isLive={isLive} numbersLoading={numbersLoading} disconnectLoading={disconnectLoading} onConfigure={(sid) => { setConfiguringNumberSid(sid); setView("configure-number"); }} onDisconnect={handleDisconnect} /></>;
  }

  // model-select (default)
  return (
    <div className="space-y-6 max-w-4xl">
      {toastEl}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-2xl font-bold text-foreground">Phone System</h1><p className="text-sm text-muted-foreground mt-0.5">Choose how you want to set up your business phone</p></div>
      </div>
      <ModelSelector onSelectModel={(model) => setView(model === "mybizos" ? "mybizos-wizard" : "byo-wizard")} />
    </div>
  );
}
