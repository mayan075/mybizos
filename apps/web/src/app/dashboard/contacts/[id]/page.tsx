import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  CalendarCheck,
  Star,
  Clock,
  TrendingUp,
  User,
  MapPin,
  Building2,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const mockContact = {
  id: "c1",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  phone: "(555) 234-5678",
  company: "Johnson Residence",
  address: "742 Evergreen Terrace, Springfield, IL",
  source: "Phone",
  score: 92,
  tags: ["Hot Lead", "HVAC"],
  createdAt: "Mar 15, 2026",
};

const timeline = [
  {
    id: "t1",
    type: "call" as const,
    icon: Phone,
    title: "AI answered inbound call",
    description:
      "Customer inquired about AC maintenance. AI qualified as high-intent lead and scheduled callback.",
    time: "2 hours ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t2",
    type: "appointment" as const,
    icon: CalendarCheck,
    title: "Appointment booked",
    description: "AC Tune-Up — Tomorrow at 10:00 AM",
    time: "2 hours ago",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    id: "t3",
    type: "sms" as const,
    icon: MessageSquare,
    title: "SMS confirmation sent",
    description:
      "Automated confirmation message sent with appointment details.",
    time: "2 hours ago",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "t4",
    type: "score" as const,
    icon: TrendingUp,
    title: "AI score updated: 72 → 92",
    description: "Score increased due to appointment booking and engagement.",
    time: "2 hours ago",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "t5",
    type: "email" as const,
    icon: Mail,
    title: "Follow-up email sent",
    description: "Service estimate PDF attached — AC Tune-Up package details.",
    time: "1 day ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t6",
    type: "call" as const,
    icon: Phone,
    title: "Initial call — AI agent",
    description:
      "First contact. Customer asked about HVAC services. AI collected contact details and service needs.",
    time: "3 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Contact header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg font-bold">
            SJ
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {mockContact.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                Score: {mockContact.score}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {mockContact.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {mockContact.phone}
              </span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {mockContact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Phone className="h-4 w-4" />
            Call
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Contact details */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Full name</p>
                  <p className="text-foreground">{mockContact.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="text-foreground">{mockContact.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Address</p>
                  <p className="text-foreground">{mockContact.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Star className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="text-foreground">{mockContact.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="text-foreground">{mockContact.createdAt}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Phone, label: "Call", color: "text-primary" },
                { icon: MessageSquare, label: "SMS", color: "text-info" },
                { icon: Mail, label: "Email", color: "text-warning" },
                {
                  icon: CalendarCheck,
                  label: "Book Appt",
                  color: "text-success",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <action.icon className={cn("h-4 w-4", action.color)} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Timeline — 2 cols */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Activity Timeline
              </h2>
            </div>
            <div className="p-5">
              <div className="relative space-y-6">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                {timeline.map((event) => (
                  <div key={event.id} className="relative flex gap-4 pl-1">
                    <div
                      className={cn(
                        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        event.bg,
                      )}
                    >
                      <event.icon
                        className={cn("h-4 w-4", event.color)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {event.title}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {event.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
