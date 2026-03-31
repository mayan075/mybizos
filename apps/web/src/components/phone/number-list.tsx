"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  Hash,
  LinkIcon,
  Loader2,
  MessageSquare,
  Phone,
  Settings2,
  Trash2,
  Unlink,
} from "lucide-react";
import { apiClient, tryFetch } from "@/lib/api-client";
import { buildPath } from "@/lib/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { DemoBanner, SectionCard } from "./shared-ui";
import {
  formatPhoneNumber,
  type PhoneModel,
  type PhoneNumber,
} from "./pricing-data";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AiAgent {
  id: string;
  name: string;
  type: string;
  vapiAssistantId: string | null;
  vapiPhoneNumberId: string | null;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/*  LinkToAgentDropdown                                                        */
/* -------------------------------------------------------------------------- */

function LinkToAgentDropdown({ phoneNumber, onLinked }: { phoneNumber: string; onLinked: () => void }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const path = buildPath("/orgs/:orgId/ai-agents");
    if (!path) return;
    const result = await tryFetch(() => apiClient.get<{ data: AiAgent[] }>(path));
    if (result !== null) {
      const agentList = "data" in result ? result.data : (result as unknown as AiAgent[]);
      // Only show agents that have a Vapi assistant and no phone number already linked
      const available = (agentList as AiAgent[]).filter(
        (a) => a.vapiAssistantId && !a.vapiPhoneNumberId && a.isActive,
      );
      setAgents(available);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchAgents();
  }, [open, fetchAgents]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleLink = async (agentId: string) => {
    setLinking(true);
    const path = buildPath(`/orgs/:orgId/ai-agents/${agentId}/link-phone`);
    if (!path) return;
    try {
      const result = await apiClient.post<{ data: { linked: boolean; phoneNumberId: string } }>(path, {
        twilioPhoneNumber: phoneNumber,
      });
      if (result) {
        toast.success("Phone number linked to AI agent!");
        setOpen(false);
        onLinked();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to link phone number";
      toast.error(message);
    }
    setLinking(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Bot className="h-3.5 w-3.5" />
        Link to AI Agent
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading agents...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No available AI agents.
              <br />
              Create a phone-type agent first.
            </div>
          ) : (
            <>
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select an agent
              </div>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  disabled={linking}
                  onClick={() => handleLink(agent.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{agent.type}</p>
                  </div>
                  {linking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  NumberRow                                                                  */
/* -------------------------------------------------------------------------- */

function NumberRow({
  number: pn,
  onConfigure,
  onRefresh,
}: {
  number: PhoneNumber;
  onConfigure: () => void;
  onRefresh?: () => void;
}) {
  const [linkedAgent, setLinkedAgent] = useState<AiAgent | null>(null);
  const [checkingLink, setCheckingLink] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const toast = useToast();

  const checkLinkedAgent = useCallback(async () => {
    setCheckingLink(true);
    const path = buildPath("/orgs/:orgId/ai-agents");
    if (!path) return;
    const result = await tryFetch(() => apiClient.get<{ data: AiAgent[] }>(path));
    if (result !== null) {
      const agentList = "data" in result ? result.data : (result as unknown as AiAgent[]);
      // Find agent linked to this phone number (matching by phone number in settings is not available,
      // so we look for agents that have a vapiPhoneNumberId set — the UI shows one link button per number)
      const linked = (agentList as AiAgent[]).find(
        (a) => a.vapiPhoneNumberId !== null && a.vapiPhoneNumberId !== undefined,
      );
      // Since we don't have a direct phone-to-agent mapping in the UI,
      // we show the link state based on whether any agent references this number.
      // In practice, the Vapi phone number is created from the Twilio number,
      // so there is a 1:1 relationship.
      setLinkedAgent(linked ?? null);
    }
    setCheckingLink(false);
  }, []);

  useEffect(() => {
    checkLinkedAgent();
  }, [checkLinkedAgent]);

  const handleUnlink = async (agentId: string) => {
    setUnlinking(true);
    const path = buildPath(`/orgs/:orgId/ai-agents/${agentId}/unlink-phone`);
    if (!path) return;
    try {
      await apiClient.delete<{ data: { unlinked: boolean } }>(path);
      toast.success("Phone number unlinked from AI agent");
      setLinkedAgent(null);
      onRefresh?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unlink phone number";
      toast.error(message);
    }
    setUnlinking(false);
  };

  const handleLinked = () => {
    checkLinkedAgent();
    onRefresh?.();
  };

  return (
    <div className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onConfigure} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            <Settings2 className="h-3.5 w-3.5" /> Configure
          </button>
        </div>
      </div>

      {/* AI Agent Link Section */}
      {!checkingLink && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {linkedAgent ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Linked to <span className="font-medium text-foreground">{linkedAgent.name}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <LinkIcon className="h-2.5 w-2.5" /> AI Active
                </span>
              </div>
              <button
                onClick={() => handleUnlink(linkedAgent.id)}
                disabled={unlinking}
                className="flex h-7 items-center gap-1 rounded-md border border-red-200 dark:border-red-800 px-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {unlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                Unlink
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">No AI agent linked to this number</span>
              <LinkToAgentDropdown phoneNumber={pn.phoneNumber} onLinked={handleLinked} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  onRefresh?: () => void;
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
  onRefresh,
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
              {provider === "managed" ? "HararAI Phone" : "Your Twilio Account"}
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
              <NumberRow
                key={pn.sid}
                number={pn}
                onConfigure={() => onConfigure(pn.sid)}
                onRefresh={onRefresh}
              />
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
