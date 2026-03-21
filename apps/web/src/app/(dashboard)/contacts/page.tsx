"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockContacts = [
  {
    id: "c1",
    name: "Sarah Johnson",
    phone: "(555) 234-5678",
    email: "sarah@example.com",
    score: 92,
    lastActivity: "2 hours ago",
    tags: ["Hot Lead", "HVAC"],
    source: "Phone" as const,
  },
  {
    id: "c2",
    name: "Mike Chen",
    phone: "(555) 345-6789",
    email: "mike.chen@email.com",
    score: 78,
    lastActivity: "5 hours ago",
    tags: ["Plumbing"],
    source: "Web Form" as const,
  },
  {
    id: "c3",
    name: "David Park",
    phone: "(555) 456-7890",
    email: "dpark@gmail.com",
    score: 85,
    lastActivity: "1 day ago",
    tags: ["Hot Lead", "Furnace"],
    source: "AI Call" as const,
  },
  {
    id: "c4",
    name: "Lisa Wang",
    phone: "(555) 567-8901",
    email: "lwang@company.com",
    score: 64,
    lastActivity: "2 days ago",
    tags: ["Maintenance"],
    source: "Referral" as const,
  },
  {
    id: "c5",
    name: "James Wilson",
    phone: "(555) 678-9012",
    email: "jwilson@email.com",
    score: 45,
    lastActivity: "3 days ago",
    tags: ["HVAC", "Commercial"],
    source: "Google Ads" as const,
  },
  {
    id: "c6",
    name: "Emily Davis",
    phone: "(555) 789-0123",
    email: "emily.d@mail.com",
    score: 91,
    lastActivity: "30 min ago",
    tags: ["Hot Lead", "Emergency"],
    source: "Phone" as const,
  },
  {
    id: "c7",
    name: "Robert Martinez",
    phone: "(555) 890-1234",
    email: "rmartinez@business.com",
    score: 56,
    lastActivity: "4 days ago",
    tags: ["Plumbing"],
    source: "Yelp" as const,
  },
  {
    id: "c8",
    name: "Amanda Taylor",
    phone: "(555) 901-2345",
    email: "ataylor@home.com",
    score: 73,
    lastActivity: "1 day ago",
    tags: ["HVAC", "Residential"],
    source: "SMS" as const,
  },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-success/10 text-success"
      : score >= 60
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

export default function ContactsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockContacts.length} total contacts
          </p>
        </div>
        <button
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
        <button className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <button className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <button className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <button className="flex items-center gap-1">
                    Score
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
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
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
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
                    <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-auto">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
