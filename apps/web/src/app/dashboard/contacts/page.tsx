"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Phone,
  Mail,
  Users,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, useCreateContact } from "@/lib/hooks/use-contacts";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import type { MockContact } from "@/lib/mock-data";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-success/10 text-success"
      : score >= 50
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        color,
      )}
    >
      {score}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    "Hot Lead": "bg-destructive/10 text-destructive",
    HVAC: "bg-info/10 text-info",
    Plumbing: "bg-primary/10 text-primary",
    Furnace: "bg-warning/10 text-warning",
    Emergency: "bg-destructive/10 text-destructive",
    Maintenance: "bg-muted text-muted-foreground",
    Commercial: "bg-primary/10 text-primary",
    Residential: "bg-success/10 text-success",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colors[tag] ?? "bg-muted text-muted-foreground",
      )}
    >
      {tag}
    </span>
  );
}

type SortKey = "name" | "score";
type SortDir = "asc" | "desc";

export default function ContactsPage() {
  usePageTitle("Contacts");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Local additions (optimistic UI for when API is offline)
  const [localContacts, setLocalContacts] = useState<MockContact[]>([]);

  // New contact form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState("Phone");

  // Hook: fetches from API, falls back to mock data
  const { data: apiContacts } = useContacts({ search });
  const { mutate: createContact } = useCreateContact();

  // Merge API/mock contacts with locally added ones
  const contacts = useMemo(() => {
    return [...localContacts, ...apiContacts];
  }, [localContacts, apiContacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(search),
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "score") {
        cmp = a.score - b.score;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [contacts, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAddContact() {
    if (!newName.trim()) return;
    const id = `c${Date.now()}`;
    const newContact: MockContact = {
      id,
      name: newName.trim(),
      phone: newPhone.trim() || "(555) 000-0000",
      email: newEmail.trim() || `${newName.trim().toLowerCase().replace(/\s/g, ".")}@email.com`,
      score: Math.floor(Math.random() * 40) + 30,
      lastActivity: "Just now",
      tags: [],
      source: newSource,
    };

    // Optimistically add to local state
    setLocalContacts((prev) => [newContact, ...prev]);

    // Try to persist via API
    await createContact({
      name: newContact.name,
      phone: newContact.phone,
      email: newContact.email,
      source: newContact.source,
    });

    setShowModal(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewSource("Phone");
    showToast(`Contact "${newContact.name}" added successfully`);
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Add Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">Add Contact</h2>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Smith"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  <option value="Phone">Phone</option>
                  <option value="Web Form">Web Form</option>
                  <option value="AI Call">AI Call</option>
                  <option value="Referral">Referral</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Yelp">Yelp</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={!newName.trim()}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                  newName.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length} total contacts
            {selected.size > 0 && ` \u00b7 ${selected.size} selected`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <button
          onClick={() => showToast("Filters coming soon")}
          className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <button
          onClick={() => showToast("Export started \u2014 CSV download will begin shortly")}
          className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Empty state when no contacts exist */}
      {contacts.length === 0 && !search && (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start building your customer database. You can add them manually or they will appear automatically when customers call or text."
          actionLabel="Add Your First Contact"
          onAction={() => setShowModal(true)}
          className="rounded-xl border border-border bg-card"
        />
      )}

      {/* Table (shown when contacts exist or search is active) */}
      {(contacts.length > 0 || search) && (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Name
                    <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleSort("score")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      AI Score
                      <SortIcon col="score" />
                    </button>
                    <Tooltip
                      content="AI Score (0-100) predicts how likely this lead is to convert. It updates automatically based on engagement: calls answered, messages replied, appointments booked, and more."
                      position="bottom"
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Activity
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    selected.has(contact.id) && "bg-accent/30",
                  )}
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/contacts/${contact.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {contact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          via {contact.source}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {contact.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {contact.email}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <ScoreBadge score={contact.score} />
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {contact.lastActivity}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => showToast(`Actions for ${contact.name}`)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-auto"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No contacts found matching &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
