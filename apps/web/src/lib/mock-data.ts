/**
 * Centralized mock data for all dashboard pages.
 * Used as fallback when the API is unavailable.
 */

// ============================================================
// Contacts
// ============================================================

export interface MockContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  score: number;
  lastActivity: string;
  tags: string[];
  source: string;
}

export interface MockContactDetail extends MockContact {
  company: string;
  address: string;
  createdAt: string;
}

export interface MockTimelineEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  iconName: string;
  color: string;
  bg: string;
}

export const mockContacts: MockContact[] = [
  {
    id: "c1",
    name: "Sarah Johnson",
    phone: "(555) 234-5678",
    email: "sarah@example.com",
    score: 92,
    lastActivity: "2 hours ago",
    tags: ["Hot Lead", "HVAC"],
    source: "Phone",
  },
  {
    id: "c2",
    name: "Mike Chen",
    phone: "(555) 345-6789",
    email: "mike.chen@email.com",
    score: 78,
    lastActivity: "5 hours ago",
    tags: ["Plumbing"],
    source: "Web Form",
  },
  {
    id: "c3",
    name: "David Park",
    phone: "(555) 456-7890",
    email: "dpark@gmail.com",
    score: 85,
    lastActivity: "1 day ago",
    tags: ["Hot Lead", "Furnace"],
    source: "AI Call",
  },
  {
    id: "c4",
    name: "Lisa Wang",
    phone: "(555) 567-8901",
    email: "lwang@company.com",
    score: 64,
    lastActivity: "2 days ago",
    tags: ["Maintenance"],
    source: "Referral",
  },
  {
    id: "c5",
    name: "James Wilson",
    phone: "(555) 678-9012",
    email: "jwilson@email.com",
    score: 45,
    lastActivity: "3 days ago",
    tags: ["HVAC", "Commercial"],
    source: "Google Ads",
  },
  {
    id: "c6",
    name: "Emily Davis",
    phone: "(555) 789-0123",
    email: "emily.d@mail.com",
    score: 91,
    lastActivity: "30 min ago",
    tags: ["Hot Lead", "Emergency"],
    source: "Phone",
  },
  {
    id: "c7",
    name: "Robert Martinez",
    phone: "(555) 890-1234",
    email: "rmartinez@business.com",
    score: 56,
    lastActivity: "4 days ago",
    tags: ["Plumbing"],
    source: "Yelp",
  },
  {
    id: "c8",
    name: "Amanda Taylor",
    phone: "(555) 901-2345",
    email: "ataylor@home.com",
    score: 73,
    lastActivity: "1 day ago",
    tags: ["HVAC", "Residential"],
    source: "SMS",
  },
  {
    id: "c9",
    name: "Carlos Hernandez",
    phone: "(555) 012-3456",
    email: "carlos.h@gmail.com",
    score: 88,
    lastActivity: "6 hours ago",
    tags: ["Hot Lead", "Plumbing"],
    source: "AI Call",
  },
  {
    id: "c10",
    name: "Karen Thompson",
    phone: "(555) 123-4568",
    email: "kthompson@mail.com",
    score: 35,
    lastActivity: "1 week ago",
    tags: ["HVAC"],
    source: "Google Ads",
  },
];

export const mockContactDetails: Record<string, MockContactDetail> = {
  c1: {
    id: "c1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "(555) 234-5678",
    company: "Johnson Residence",
    address: "742 Evergreen Terrace, Springfield, IL",
    source: "Phone",
    score: 92,
    tags: ["Hot Lead", "HVAC"],
    lastActivity: "2 hours ago",
    createdAt: "Mar 15, 2026",
  },
  c2: {
    id: "c2",
    name: "Mike Chen",
    email: "mike.chen@email.com",
    phone: "(555) 345-6789",
    company: "Chen Properties LLC",
    address: "123 Oak Street, Springfield, IL",
    source: "Web Form",
    score: 78,
    tags: ["Plumbing"],
    lastActivity: "5 hours ago",
    createdAt: "Mar 10, 2026",
  },
  c3: {
    id: "c3",
    name: "David Park",
    email: "dpark@gmail.com",
    phone: "(555) 456-7890",
    company: "Park Family Home",
    address: "456 Pine Ave, Springfield, IL",
    source: "AI Call",
    score: 85,
    tags: ["Hot Lead", "Furnace"],
    lastActivity: "1 day ago",
    createdAt: "Mar 12, 2026",
  },
  c6: {
    id: "c6",
    name: "Emily Davis",
    email: "emily.d@mail.com",
    phone: "(555) 789-0123",
    company: "Davis Apartments",
    address: "321 Elm Street, Springfield, IL",
    source: "Phone",
    score: 91,
    tags: ["Hot Lead", "Emergency"],
    lastActivity: "30 min ago",
    createdAt: "Mar 18, 2026",
  },
};

export const mockDefaultContact: MockContactDetail = {
  id: "c0",
  name: "Unknown Contact",
  email: "unknown@example.com",
  phone: "(555) 000-0000",
  company: "Unknown",
  address: "Springfield, IL",
  source: "Unknown",
  score: 50,
  tags: [],
  lastActivity: "Unknown",
  createdAt: "Mar 20, 2026",
};

export const mockTimeline: MockTimelineEntry[] = [
  {
    id: "t1",
    type: "call",
    iconName: "Phone",
    title: "AI answered inbound call",
    description:
      "Customer inquired about AC maintenance. AI qualified as high-intent lead and scheduled callback.",
    time: "2 hours ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t2",
    type: "appointment",
    iconName: "CalendarCheck",
    title: "Appointment booked",
    description: "AC Tune-Up \u2014 Tomorrow at 10:00 AM",
    time: "2 hours ago",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    id: "t3",
    type: "sms",
    iconName: "MessageSquare",
    title: "SMS confirmation sent",
    description:
      "Automated confirmation message sent with appointment details.",
    time: "2 hours ago",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "t4",
    type: "score",
    iconName: "TrendingUp",
    title: "AI score updated: 72 -> 92",
    description: "Score increased due to appointment booking and engagement.",
    time: "2 hours ago",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "t5",
    type: "email",
    iconName: "Mail",
    title: "Follow-up email sent",
    description: "Service estimate PDF attached \u2014 AC Tune-Up package details.",
    time: "1 day ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t6",
    type: "call",
    iconName: "Phone",
    title: "Initial call \u2014 AI agent",
    description:
      "First contact. Customer asked about HVAC services. AI collected contact details and service needs.",
    time: "3 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t7",
    type: "sms",
    iconName: "MessageSquare",
    title: "SMS received",
    description: "Customer replied: 'Thanks for the info, I'll think about it.'",
    time: "3 days ago",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    id: "t8",
    type: "ai",
    iconName: "Bot",
    title: "AI auto-response sent",
    description: "AI sent follow-up message with seasonal maintenance tips and a special offer.",
    time: "3 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t9",
    type: "score",
    iconName: "TrendingUp",
    title: "AI score updated: 45 -> 72",
    description: "Score increased \u2014 customer engaged with SMS and opened email.",
    time: "4 days ago",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    id: "t10",
    type: "email",
    iconName: "Mail",
    title: "Welcome email sent",
    description: "Automated welcome email with company brochure and service menu.",
    time: "5 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: "t11",
    type: "call",
    iconName: "Phone",
    title: "First inbound call",
    description: "Customer called main number. AI agent answered and collected initial requirements.",
    time: "5 days ago",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

// ============================================================
// Pipeline / Deals
// ============================================================

export interface MockDeal {
  id: string;
  title: string;
  contact: string;
  value: number;
  daysInStage: number;
  score: number;
  tags: string[];
}

export interface MockPipelineColumn {
  id: string;
  title: string;
  color: string;
}

export const mockPipelineColumns: MockPipelineColumn[] = [
  { id: "new_lead", title: "New Lead", color: "bg-info" },
  { id: "quoted", title: "Quoted", color: "bg-warning" },
  { id: "scheduled", title: "Scheduled", color: "bg-primary" },
  { id: "won", title: "Won", color: "bg-success" },
];

export const mockDeals: Record<string, MockDeal[]> = {
  new_lead: [
    { id: "d1", title: "AC Installation", contact: "Sarah Johnson", value: 4500, daysInStage: 1, score: 92, tags: ["HVAC", "Residential"] },
    { id: "d2", title: "Furnace Replacement", contact: "David Park", value: 6200, daysInStage: 2, score: 85, tags: ["HVAC"] },
    { id: "d3", title: "Pipe Repair", contact: "Amanda Taylor", value: 800, daysInStage: 0, score: 73, tags: ["Plumbing"] },
    { id: "d7", title: "Duct Cleaning", contact: "Tom Bradley", value: 350, daysInStage: 1, score: 60, tags: ["HVAC", "Maintenance"] },
  ],
  quoted: [
    { id: "d4", title: "Water Heater Install", contact: "Mike Chen", value: 2800, daysInStage: 3, score: 78, tags: ["Plumbing"] },
    { id: "d5", title: "HVAC Maintenance Plan", contact: "Lisa Wang", value: 1200, daysInStage: 5, score: 64, tags: ["HVAC", "Contract"] },
  ],
  scheduled: [
    { id: "d8", title: "Boiler Inspection", contact: "Carlos Hernandez", value: 450, daysInStage: 1, score: 88, tags: ["HVAC"] },
    { id: "d9", title: "Drain Cleaning", contact: "Karen Thompson", value: 300, daysInStage: 0, score: 55, tags: ["Plumbing"] },
  ],
  won: [
    { id: "d6", title: "Emergency Pipe Fix", contact: "James Wilson", value: 950, daysInStage: 0, score: 45, tags: ["Plumbing", "Emergency"] },
    { id: "d10", title: "AC Tune-Up", contact: "Emily Davis", value: 189, daysInStage: 2, score: 91, tags: ["HVAC"] },
  ],
};

// ============================================================
// Conversations / Inbox
// ============================================================

export interface MockConversation {
  id: string;
  contact: string;
  initials: string;
  channel: "sms" | "email" | "call";
  lastMessage: string;
  time: string;
  unread: boolean;
  aiHandled: boolean;
  status: "open" | "closed";
}

export interface MockChatMessage {
  id: string;
  sender: "contact" | "user" | "ai";
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
}

export const mockConversations: MockConversation[] = [
  {
    id: "conv1",
    contact: "Sarah Johnson",
    initials: "SJ",
    channel: "sms",
    lastMessage: "Great, I'll see your technician tomorrow at 10 AM!",
    time: "2m ago",
    unread: true,
    aiHandled: false,
    status: "open",
  },
  {
    id: "conv2",
    contact: "Mike Chen",
    initials: "MC",
    channel: "sms",
    lastMessage: "Can you send me the estimate for the water heater?",
    time: "15m ago",
    unread: true,
    aiHandled: true,
    status: "open",
  },
  {
    id: "conv3",
    contact: "David Park",
    initials: "DP",
    channel: "email",
    lastMessage: "Re: Furnace Replacement Quote \u2014 Thanks for the detailed...",
    time: "1h ago",
    unread: false,
    aiHandled: false,
    status: "open",
  },
  {
    id: "conv4",
    contact: "Lisa Wang",
    initials: "LW",
    channel: "call",
    lastMessage: "AI Call Summary: Customer inquired about maintenance plans",
    time: "3h ago",
    unread: false,
    aiHandled: true,
    status: "open",
  },
  {
    id: "conv5",
    contact: "James Wilson",
    initials: "JW",
    channel: "sms",
    lastMessage: "Thanks for the quick fix! 5 stars from me.",
    time: "1d ago",
    unread: false,
    aiHandled: false,
    status: "closed",
  },
  {
    id: "conv6",
    contact: "Emily Davis",
    initials: "ED",
    channel: "call",
    lastMessage: "AI Call Summary: Emergency plumbing request \u2014 escalated to...",
    time: "1d ago",
    unread: false,
    aiHandled: true,
    status: "closed",
  },
  {
    id: "conv7",
    contact: "Carlos Hernandez",
    initials: "CH",
    channel: "sms",
    lastMessage: "What time should I expect the technician?",
    time: "2d ago",
    unread: true,
    aiHandled: true,
    status: "open",
  },
  {
    id: "conv8",
    contact: "Karen Thompson",
    initials: "KT",
    channel: "email",
    lastMessage: "Re: Seasonal Maintenance \u2014 I'd like to schedule...",
    time: "3d ago",
    unread: false,
    aiHandled: false,
    status: "open",
  },
];

export const mockMessages: Record<string, MockChatMessage[]> = {
  conv1: [
    { id: "m1", sender: "contact", text: "Hi, I need to schedule an AC tune-up. What times do you have available this week?", time: "10:23 AM", status: "read" },
    { id: "m2", sender: "ai", text: "Hi Sarah! This is Acme HVAC's AI assistant. I'd be happy to help you schedule an AC tune-up. We have availability tomorrow (Wednesday) at 10 AM, 1 PM, or 3 PM. We also have Thursday morning slots. Which works best for you?", time: "10:23 AM", status: "read" },
    { id: "m3", sender: "contact", text: "Tomorrow at 10 AM works perfectly.", time: "10:25 AM", status: "read" },
    { id: "m4", sender: "ai", text: "I've booked you for an AC tune-up tomorrow, Wednesday at 10:00 AM. Our technician will arrive at your address on file. The service typically takes about an hour and starts at $89. You'll receive a confirmation text shortly. Is there anything else I can help with?", time: "10:25 AM", status: "read" },
    { id: "m5", sender: "contact", text: "Great, I'll see your technician tomorrow at 10 AM!", time: "10:26 AM", status: "read" },
  ],
  conv2: [
    { id: "m2-1", sender: "contact", text: "Hi, I got a quote for a water heater installation but I lost the email. Can you resend it?", time: "9:45 AM", status: "read" },
    { id: "m2-2", sender: "ai", text: "Hi Mike! This is Acme HVAC's AI assistant. I'd be happy to resend your water heater installation quote. I've forwarded it to your email on file (mike.chen@email.com). The quote was for a 50-gallon tankless unit at $2,800 installed. Would you like to schedule the installation?", time: "9:45 AM", status: "read" },
    { id: "m2-3", sender: "contact", text: "Can you send me the estimate for the water heater?", time: "9:50 AM", status: "read" },
  ],
  conv3: [
    { id: "m3-1", sender: "user", text: "Hi David, following up on your furnace replacement inquiry. I've attached a detailed quote with three options ranging from $4,200 to $6,800 depending on the model.", time: "Yesterday", status: "read" },
    { id: "m3-2", sender: "contact", text: "Thanks for the detailed breakdown. I'm leaning towards the mid-range option. Can we schedule a time to discuss the installation timeline?", time: "1h ago", status: "read" },
  ],
  conv4: [
    { id: "m4-1", sender: "ai", text: "AI Call Summary: Lisa Wang called to inquire about annual HVAC maintenance plans. She has a 3-year-old system and wants preventive care. Quoted $29/month plan. She asked to receive details via email before deciding.", time: "3h ago", status: "read" },
  ],
  conv5: [
    { id: "m5-1", sender: "user", text: "Hi James! Glad we could get that pipe fixed quickly. Is everything working well now?", time: "Yesterday", status: "read" },
    { id: "m5-2", sender: "contact", text: "Everything's great! No more leaking. Thanks for the quick fix! 5 stars from me.", time: "1d ago", status: "read" },
  ],
  conv6: [
    { id: "m6-1", sender: "ai", text: "AI Call Summary: Emergency plumbing request from Emily Davis. Reported water leak under kitchen sink. Flagged as emergency. AI escalated to on-call technician immediately. Estimated arrival time communicated: 45 minutes.", time: "1d ago", status: "read" },
  ],
  conv7: [
    { id: "m7-1", sender: "ai", text: "Hi Carlos! This is Acme HVAC's AI assistant. Your boiler inspection is confirmed for this Friday at 9 AM. Our technician will arrive at your address.", time: "2d ago", status: "read" },
    { id: "m7-2", sender: "contact", text: "What time should I expect the technician?", time: "2d ago", status: "read" },
  ],
  conv8: [
    { id: "m8-1", sender: "contact", text: "I got your flyer about seasonal maintenance specials. I'd like to schedule an HVAC check before summer.", time: "3d ago", status: "read" },
    { id: "m8-2", sender: "user", text: "Hi Karen! Great timing. We have openings next week for seasonal tune-ups. Would Tuesday or Wednesday work for you?", time: "3d ago", status: "read" },
  ],
};

// ============================================================
// Appointments / Scheduling
// ============================================================

export interface MockAppointment {
  id: string;
  title: string;
  customer: string;
  time: string;
  duration: number;
  dayIndex: number;
  hourStart: number;
  status: "scheduled" | "confirmed" | "completed";
  location: string;
}

export const mockAppointments: MockAppointment[] = [
  {
    id: "a1",
    title: "AC Tune-Up",
    customer: "Sarah Johnson",
    time: "10:00 AM - 11:00 AM",
    duration: 1,
    dayIndex: 0,
    hourStart: 10,
    status: "confirmed",
    location: "742 Evergreen Terrace",
  },
  {
    id: "a2",
    title: "Plumbing Inspection",
    customer: "Mike Chen",
    time: "2:00 PM - 3:30 PM",
    duration: 1.5,
    dayIndex: 1,
    hourStart: 14,
    status: "scheduled",
    location: "123 Oak Street",
  },
  {
    id: "a3",
    title: "Furnace Repair",
    customer: "Lisa Wang",
    time: "9:00 AM - 11:00 AM",
    duration: 2,
    dayIndex: 3,
    hourStart: 9,
    status: "scheduled",
    location: "456 Pine Avenue",
  },
  {
    id: "a4",
    title: "Water Heater Install",
    customer: "James Wilson",
    time: "1:00 PM - 4:00 PM",
    duration: 3,
    dayIndex: 2,
    hourStart: 13,
    status: "confirmed",
    location: "789 Maple Drive",
  },
  {
    id: "a5",
    title: "AC Maintenance",
    customer: "Emily Davis",
    time: "11:00 AM - 12:00 PM",
    duration: 1,
    dayIndex: 4,
    hourStart: 11,
    status: "scheduled",
    location: "321 Elm Street",
  },
  {
    id: "a6",
    title: "Drain Cleaning",
    customer: "Carlos Hernandez",
    time: "9:00 AM - 10:00 AM",
    duration: 1,
    dayIndex: 4,
    hourStart: 9,
    status: "confirmed",
    location: "555 Birch Lane",
  },
];

// ============================================================
// Dashboard Stats
// ============================================================

export interface MockStat {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  iconName: string;
  color: string;
  bg: string;
  href: string;
}

export interface MockActivityItem {
  id: string;
  type: string;
  iconName: string;
  title: string;
  description: string;
  time: string;
  color: string;
}

export interface MockUpcomingAppointment {
  id: string;
  customer: string;
  service: string;
  time: string;
  date: string;
  status: "confirmed" | "scheduled";
}

export const mockStats: MockStat[] = [
  {
    label: "Leads Today",
    value: "12",
    change: "+18%",
    trend: "up",
    iconName: "Users",
    color: "text-info",
    bg: "bg-info/10",
    href: "/dashboard/contacts",
  },
  {
    label: "Appointments Booked",
    value: "8",
    change: "+25%",
    trend: "up",
    iconName: "CalendarCheck",
    color: "text-success",
    bg: "bg-success/10",
    href: "/dashboard/scheduling",
  },
  {
    label: "AI Calls Answered",
    value: "47",
    change: "+34%",
    trend: "up",
    iconName: "Phone",
    color: "text-primary",
    bg: "bg-primary/10",
    href: "/dashboard/calls",
  },
  {
    label: "Revenue This Month",
    value: "$12,400",
    change: "+12%",
    trend: "up",
    iconName: "DollarSign",
    color: "text-warning",
    bg: "bg-warning/10",
    href: "/dashboard/pipeline",
  },
];

export const mockActivity: MockActivityItem[] = [
  {
    id: "1",
    type: "call",
    iconName: "Phone",
    title: "AI answered call from (555) 123-4567",
    description: "Qualified lead \u2014 HVAC maintenance inquiry",
    time: "2 min ago",
    color: "text-primary",
  },
  {
    id: "2",
    type: "appointment",
    iconName: "CalendarCheck",
    title: "Appointment booked \u2014 Sarah Johnson",
    description: "AC Tune-Up \u2014 Tomorrow at 10:00 AM",
    time: "15 min ago",
    color: "text-success",
  },
  {
    id: "3",
    type: "message",
    iconName: "MessageSquare",
    title: "SMS from Mike Chen",
    description: "Confirming service appointment for Friday",
    time: "1 hr ago",
    color: "text-info",
  },
  {
    id: "4",
    type: "lead",
    iconName: "TrendingUp",
    title: "New lead scored: 85/100",
    description: "David Park \u2014 Furnace replacement inquiry",
    time: "2 hr ago",
    color: "text-warning",
  },
  {
    id: "5",
    type: "call",
    iconName: "Phone",
    title: "AI answered call from (555) 987-6543",
    description: "Plumbing emergency \u2014 routed to on-call tech",
    time: "3 hr ago",
    color: "text-primary",
  },
  {
    id: "6",
    type: "alert",
    iconName: "AlertTriangle",
    title: "Emergency keyword detected \u2014 Gas leak",
    description: "AI escalated to owner. Customer: Emily Davis",
    time: "4 hr ago",
    color: "text-destructive",
  },
];

export const mockUpcomingAppointments: MockUpcomingAppointment[] = [
  {
    id: "1",
    customer: "Sarah Johnson",
    service: "AC Tune-Up",
    time: "10:00 AM",
    date: "Tomorrow",
    status: "confirmed",
  },
  {
    id: "2",
    customer: "Mike Chen",
    service: "Plumbing Inspection",
    time: "2:00 PM",
    date: "Friday",
    status: "scheduled",
  },
  {
    id: "3",
    customer: "Lisa Wang",
    service: "Furnace Repair",
    time: "9:00 AM",
    date: "Monday",
    status: "scheduled",
  },
];
