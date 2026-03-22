/**
 * Mock data service — returns realistic plumbing/HVAC business data
 * so the API always returns useful responses even without a database.
 *
 * Used as a fallback when database queries fail (no DB configured).
 */

// ── Contacts ──

export interface MockContact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  tags: string[];
  customFields: Record<string, string>;
  leadScore: number;
  createdAt: string;
  updatedAt: string;
}

const mockContacts: MockContact[] = [
  {
    id: 'cnt_01',
    orgId: 'org_01',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@email.com',
    phone: '+15551234001',
    company: null,
    source: 'phone',
    status: 'active',
    tags: ['hvac', 'residential'],
    customFields: {},
    leadScore: 85,
    createdAt: '2026-03-18T10:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
  },
  {
    id: 'cnt_02',
    orgId: 'org_01',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+15551234002',
    company: 'Chen Property Management',
    source: 'webform',
    status: 'active',
    tags: ['plumbing', 'commercial', 'vip'],
    customFields: { propertyCount: '12' },
    leadScore: 92,
    createdAt: '2026-03-15T08:00:00Z',
    updatedAt: '2026-03-21T09:15:00Z',
  },
  {
    id: 'cnt_03',
    orgId: 'org_01',
    firstName: 'Marcus',
    lastName: 'Johnson',
    email: 'marcus.j@email.com',
    phone: '+15551234003',
    company: null,
    source: 'referral',
    status: 'active',
    tags: ['hvac', 'residential', 'new-construction'],
    customFields: {},
    leadScore: 78,
    createdAt: '2026-03-10T15:30:00Z',
    updatedAt: '2026-03-19T11:00:00Z',
  },
  {
    id: 'cnt_04',
    orgId: 'org_01',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.r@email.com',
    phone: '+15551234004',
    company: 'Sunrise Senior Living',
    source: 'google_ads',
    status: 'active',
    tags: ['plumbing', 'commercial', 'emergency'],
    customFields: {},
    leadScore: 95,
    createdAt: '2026-03-08T09:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 'cnt_05',
    orgId: 'org_01',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@email.com',
    phone: '+15551234005',
    company: null,
    source: 'sms',
    status: 'active',
    tags: ['hvac', 'residential', 'maintenance-plan'],
    customFields: {},
    leadScore: 70,
    createdAt: '2026-03-05T12:00:00Z',
    updatedAt: '2026-03-18T16:45:00Z',
  },
  {
    id: 'cnt_06',
    orgId: 'org_01',
    firstName: 'Lisa',
    lastName: 'Thompson',
    email: 'lisa.t@email.com',
    phone: '+15551234006',
    company: null,
    source: 'yelp',
    status: 'inactive',
    tags: ['plumbing'],
    customFields: {},
    leadScore: 45,
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
];

export function getMockContacts(filters?: {
  search?: string;
  status?: string;
  source?: string;
  tag?: string;
  page?: number;
  limit?: number;
}): { contacts: MockContact[]; total: number } {
  let filtered = [...mockContacts];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.firstName.toLowerCase().includes(s) ||
        c.lastName.toLowerCase().includes(s) ||
        (c.email?.toLowerCase().includes(s) ?? false) ||
        (c.phone?.includes(s) ?? false)
    );
  }
  if (filters?.status) {
    filtered = filtered.filter((c) => c.status === filters.status);
  }
  if (filters?.source) {
    filtered = filtered.filter((c) => c.source === filters.source);
  }
  if (filters?.tag) {
    filtered = filtered.filter((c) => c.tags.includes(filters.tag as string));
  }

  const total = filtered.length;
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return { contacts: paged, total };
}

export function getMockContactById(id: string): MockContact | null {
  return mockContacts.find((c) => c.id === id) ?? null;
}

// ── Deals ──

export interface MockDeal {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  stageName: string;
  contactId: string;
  contactName: string;
  title: string;
  value: string;
  currency: string;
  expectedCloseDate: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

const mockDeals: MockDeal[] = [
  {
    id: 'deal_01',
    orgId: 'org_01',
    pipelineId: 'pipe_01',
    stageId: 'stage_03',
    stageName: 'Qualified',
    contactId: 'cnt_01',
    contactName: 'James Wilson',
    title: 'AC Unit Replacement — Wilson Residence',
    value: '5500',
    currency: 'USD',
    expectedCloseDate: '2026-04-01',
    assignedTo: null,
    createdAt: '2026-03-18T10:30:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
  },
  {
    id: 'deal_02',
    orgId: 'org_01',
    pipelineId: 'pipe_01',
    stageId: 'stage_04',
    stageName: 'Quote Sent',
    contactId: 'cnt_02',
    contactName: 'Sarah Chen',
    title: 'Commercial Plumbing — Chen Properties (3 units)',
    value: '12000',
    currency: 'USD',
    expectedCloseDate: '2026-03-30',
    assignedTo: null,
    createdAt: '2026-03-15T08:30:00Z',
    updatedAt: '2026-03-21T09:15:00Z',
  },
  {
    id: 'deal_03',
    orgId: 'org_01',
    pipelineId: 'pipe_01',
    stageId: 'stage_01',
    stageName: 'New Lead',
    contactId: 'cnt_03',
    contactName: 'Marcus Johnson',
    title: 'New Construction HVAC — Johnson Home',
    value: '18000',
    currency: 'USD',
    expectedCloseDate: '2026-05-15',
    assignedTo: null,
    createdAt: '2026-03-19T11:00:00Z',
    updatedAt: '2026-03-19T11:00:00Z',
  },
  {
    id: 'deal_04',
    orgId: 'org_01',
    pipelineId: 'pipe_01',
    stageId: 'stage_02',
    stageName: 'Contacted',
    contactId: 'cnt_04',
    contactName: 'Emily Rodriguez',
    title: 'Emergency Plumbing Repair — Sunrise Senior Living',
    value: '3200',
    currency: 'USD',
    expectedCloseDate: '2026-03-25',
    assignedTo: null,
    createdAt: '2026-03-22T08:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 'deal_05',
    orgId: 'org_01',
    pipelineId: 'pipe_01',
    stageId: 'stage_06',
    stageName: 'Won',
    contactId: 'cnt_05',
    contactName: 'David Kim',
    title: 'Annual HVAC Maintenance Plan — Kim Residence',
    value: '1200',
    currency: 'USD',
    expectedCloseDate: null,
    assignedTo: null,
    createdAt: '2026-03-05T12:30:00Z',
    updatedAt: '2026-03-18T16:45:00Z',
  },
];

export function getMockDeals(): MockDeal[] {
  return mockDeals;
}

// ── Pipelines ──

export interface MockPipelineStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  dealCount: number;
  totalValue: number;
}

export interface MockPipeline {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  stages: MockPipelineStage[];
  createdAt: string;
}

const mockPipelines: MockPipeline[] = [
  {
    id: 'pipe_01',
    orgId: 'org_01',
    name: 'Sales Pipeline',
    isDefault: true,
    stages: [
      { id: 'stage_01', name: 'New Lead', slug: 'new_lead', color: '#6366f1', position: 0, dealCount: 1, totalValue: 18000 },
      { id: 'stage_02', name: 'Contacted', slug: 'contacted', color: '#8b5cf6', position: 1, dealCount: 1, totalValue: 3200 },
      { id: 'stage_03', name: 'Qualified', slug: 'qualified', color: '#3b82f6', position: 2, dealCount: 1, totalValue: 5500 },
      { id: 'stage_04', name: 'Quote Sent', slug: 'quote_sent', color: '#f59e0b', position: 3, dealCount: 1, totalValue: 12000 },
      { id: 'stage_05', name: 'Negotiation', slug: 'negotiation', color: '#ef4444', position: 4, dealCount: 0, totalValue: 0 },
      { id: 'stage_06', name: 'Won', slug: 'won', color: '#22c55e', position: 5, dealCount: 1, totalValue: 1200 },
      { id: 'stage_07', name: 'Lost', slug: 'lost', color: '#71717a', position: 6, dealCount: 0, totalValue: 0 },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export function getMockPipelines(): MockPipeline[] {
  return mockPipelines;
}

export function getMockPipelineById(id: string): MockPipeline | null {
  return mockPipelines.find((p) => p.id === id) ?? null;
}

// ── Conversations ──

export interface MockMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'call';
  senderType: 'contact' | 'user' | 'ai';
  body: string;
  status: string;
  createdAt: string;
}

export interface MockConversation {
  id: string;
  orgId: string;
  contactId: string;
  contactName: string;
  channel: 'sms' | 'email' | 'call';
  status: 'open' | 'closed' | 'snoozed';
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  aiHandled: boolean;
  messages: MockMessage[];
}

const mockConversations: MockConversation[] = [
  {
    id: 'conv_01',
    orgId: 'org_01',
    contactId: 'cnt_01',
    contactName: 'James Wilson',
    channel: 'sms',
    status: 'open',
    lastMessageAt: '2026-03-22T09:15:00Z',
    lastMessagePreview: 'Thanks! What time works for the AC inspection?',
    unreadCount: 1,
    aiHandled: true,
    messages: [
      {
        id: 'msg_01',
        conversationId: 'conv_01',
        direction: 'inbound',
        channel: 'sms',
        senderType: 'contact',
        body: 'Hi, my AC unit stopped blowing cold air. Can someone come take a look?',
        status: 'delivered',
        createdAt: '2026-03-22T08:45:00Z',
      },
      {
        id: 'msg_02',
        conversationId: 'conv_01',
        direction: 'outbound',
        channel: 'sms',
        senderType: 'ai',
        body: "Hi James! This is Acme HVAC & Plumbing's AI assistant. I am sorry to hear about your AC issue. We can definitely help! An inspection typically starts around $75-150. Would you like to schedule a service appointment?",
        status: 'delivered',
        createdAt: '2026-03-22T08:46:00Z',
      },
      {
        id: 'msg_03',
        conversationId: 'conv_01',
        direction: 'inbound',
        channel: 'sms',
        senderType: 'contact',
        body: 'Thanks! What time works for the AC inspection?',
        status: 'delivered',
        createdAt: '2026-03-22T09:15:00Z',
      },
    ],
  },
  {
    id: 'conv_02',
    orgId: 'org_01',
    contactId: 'cnt_04',
    contactName: 'Emily Rodriguez',
    channel: 'email',
    status: 'open',
    lastMessageAt: '2026-03-22T07:30:00Z',
    lastMessagePreview: 'We have a burst pipe at Sunrise Senior Living...',
    unreadCount: 1,
    aiHandled: false,
    messages: [
      {
        id: 'msg_04',
        conversationId: 'conv_02',
        direction: 'inbound',
        channel: 'email',
        senderType: 'contact',
        body: 'We have a burst pipe at Sunrise Senior Living on 3rd floor. Water is leaking into units below. This is urgent — can you send someone ASAP?',
        status: 'delivered',
        createdAt: '2026-03-22T07:30:00Z',
      },
    ],
  },
  {
    id: 'conv_03',
    orgId: 'org_01',
    contactId: 'cnt_02',
    contactName: 'Sarah Chen',
    channel: 'sms',
    status: 'open',
    lastMessageAt: '2026-03-21T16:00:00Z',
    lastMessagePreview: 'Quote received. Let me review with my partner and get back to you.',
    unreadCount: 0,
    aiHandled: false,
    messages: [
      {
        id: 'msg_05',
        conversationId: 'conv_03',
        direction: 'outbound',
        channel: 'sms',
        senderType: 'user',
        body: 'Hi Sarah, just sent over the quote for the 3-unit plumbing job. Let me know if you have any questions!',
        status: 'delivered',
        createdAt: '2026-03-21T15:30:00Z',
      },
      {
        id: 'msg_06',
        conversationId: 'conv_03',
        direction: 'inbound',
        channel: 'sms',
        senderType: 'contact',
        body: 'Quote received. Let me review with my partner and get back to you.',
        status: 'delivered',
        createdAt: '2026-03-21T16:00:00Z',
      },
    ],
  },
];

export function getMockConversations(filters?: {
  channel?: string;
  status?: string;
}): MockConversation[] {
  let result = [...mockConversations];
  if (filters?.channel) {
    result = result.filter((c) => c.channel === filters.channel);
  }
  if (filters?.status) {
    result = result.filter((c) => c.status === filters.status);
  }
  return result.map(({ messages: _m, ...rest }) => ({ ...rest, messages: [] }));
}

export function getMockMessages(conversationId: string): MockMessage[] {
  const conv = mockConversations.find((c) => c.id === conversationId);
  return conv?.messages ?? [];
}

// ── Appointments ──

export interface MockAppointment {
  id: string;
  orgId: string;
  contactId: string;
  contactName: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  assignedTo: string | null;
  location: string;
  bookedBy: string;
  createdAt: string;
}

const mockAppointments: MockAppointment[] = [
  {
    id: 'apt_01',
    orgId: 'org_01',
    contactId: 'cnt_01',
    contactName: 'James Wilson',
    title: 'AC Inspection — Wilson Residence',
    description: 'AC unit not blowing cold air. Needs diagnostic.',
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T10:30:00Z',
    status: 'scheduled',
    assignedTo: null,
    location: '456 Oak Street, Springfield, IL',
    bookedBy: 'ai_phone',
    createdAt: '2026-03-22T09:20:00Z',
  },
  {
    id: 'apt_02',
    orgId: 'org_01',
    contactId: 'cnt_04',
    contactName: 'Emily Rodriguez',
    title: 'Emergency Plumbing — Sunrise Senior Living',
    description: 'Burst pipe on 3rd floor. Water leaking into units below.',
    startTime: '2026-03-22T14:00:00Z',
    endTime: '2026-03-22T17:00:00Z',
    status: 'confirmed',
    assignedTo: null,
    location: '200 Sunrise Blvd, Springfield, IL',
    bookedBy: 'manual',
    createdAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 'apt_03',
    orgId: 'org_01',
    contactId: 'cnt_05',
    contactName: 'David Kim',
    title: 'Annual HVAC Maintenance — Kim Residence',
    description: 'Routine annual furnace and AC maintenance.',
    startTime: '2026-03-25T10:00:00Z',
    endTime: '2026-03-25T11:30:00Z',
    status: 'scheduled',
    assignedTo: null,
    location: '789 Maple Drive, Springfield, IL',
    bookedBy: 'manual',
    createdAt: '2026-03-18T16:45:00Z',
  },
  {
    id: 'apt_04',
    orgId: 'org_01',
    contactId: 'cnt_03',
    contactName: 'Marcus Johnson',
    title: 'New Construction HVAC Estimate — Johnson Home',
    description: 'Walk-through and estimate for new construction HVAC system.',
    startTime: '2026-03-26T13:00:00Z',
    endTime: '2026-03-26T14:30:00Z',
    status: 'scheduled',
    assignedTo: null,
    location: '101 Builder Lane, Springfield, IL',
    bookedBy: 'ai_sms',
    createdAt: '2026-03-19T11:30:00Z',
  },
];

export function getMockAppointments(): MockAppointment[] {
  return mockAppointments;
}

// ── Dashboard Stats ──

export interface MockDashboardStats {
  totalContacts: number;
  activeDeals: number;
  totalPipelineValue: number;
  openConversations: number;
  upcomingAppointments: number;
  aiCallsToday: number;
  aiCallsThisWeek: number;
  leadsQualifiedThisWeek: number;
  conversionRate: number;
  averageDealValue: number;
  revenueThisMonth: number;
  averageResponseTime: string;
}

export function getMockDashboardStats(): MockDashboardStats {
  return {
    totalContacts: mockContacts.length,
    activeDeals: mockDeals.filter((d) => d.stageName !== 'Won' && d.stageName !== 'Lost').length,
    totalPipelineValue: mockDeals.reduce((sum, d) => sum + Number(d.value), 0),
    openConversations: mockConversations.filter((c) => c.status === 'open').length,
    upcomingAppointments: mockAppointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length,
    aiCallsToday: 3,
    aiCallsThisWeek: 18,
    leadsQualifiedThisWeek: 7,
    conversionRate: 34.5,
    averageDealValue: 7980,
    revenueThisMonth: 24500,
    averageResponseTime: '2m 15s',
  };
}

// ── Campaigns (mock) ──

export function getMockCampaigns() {
  return {
    campaigns: [
      {
        id: 'camp_01',
        orgId: 'org_01',
        name: 'Spring HVAC Tune-Up Special',
        type: 'email' as const,
        status: 'sent' as const,
        subject: 'Get Your AC Ready for Summer — 20% Off Tune-Ups!',
        recipientCount: 245,
        sentCount: 240,
        openCount: 156,
        clickCount: 42,
        createdAt: '2026-03-01T00:00:00Z',
        scheduledAt: '2026-03-10T09:00:00Z',
      },
      {
        id: 'camp_02',
        orgId: 'org_01',
        name: 'Emergency Service Reminder',
        type: 'sms' as const,
        status: 'draft' as const,
        subject: null,
        recipientCount: 0,
        sentCount: 0,
        openCount: 0,
        clickCount: 0,
        createdAt: '2026-03-20T00:00:00Z',
        scheduledAt: null,
      },
    ],
    total: 2,
  };
}

// ── Reviews (mock) ──

export function getMockReviews() {
  return {
    reviews: [
      {
        id: 'rev_01',
        orgId: 'org_01',
        platform: 'google',
        rating: 5,
        reviewerName: 'David K.',
        reviewText: 'Excellent HVAC service! The technician was on time, professional, and fixed our furnace quickly.',
        sentiment: 'positive',
        responded: true,
        responseText: 'Thank you for the kind review, David! We are glad we could help.',
        createdAt: '2026-03-15T00:00:00Z',
      },
      {
        id: 'rev_02',
        orgId: 'org_01',
        platform: 'yelp',
        rating: 4,
        reviewerName: 'Sarah C.',
        reviewText: 'Good plumbing work. A bit pricey but they did quality work on our commercial property.',
        sentiment: 'positive',
        responded: false,
        responseText: null,
        createdAt: '2026-03-18T00:00:00Z',
      },
      {
        id: 'rev_03',
        orgId: 'org_01',
        platform: 'google',
        rating: 3,
        reviewerName: 'Mike T.',
        reviewText: 'Took a while to schedule but the work itself was fine.',
        sentiment: 'neutral',
        responded: false,
        responseText: null,
        createdAt: '2026-03-20T00:00:00Z',
      },
    ],
    total: 3,
  };
}

export function getMockReviewStats() {
  return {
    averageRating: 4.3,
    totalReviews: 47,
    ratingDistribution: { 5: 22, 4: 14, 3: 6, 2: 3, 1: 2 },
    platforms: {
      google: { count: 28, average: 4.5 },
      yelp: { count: 12, average: 4.0 },
      facebook: { count: 7, average: 4.3 },
    },
    responseRate: 72,
    sentimentBreakdown: { positive: 36, neutral: 8, negative: 3 },
  };
}

// ── Sequences (mock) ──

export function getMockSequences() {
  return [
    {
      id: 'seq_01',
      orgId: 'org_01',
      name: 'New Lead Follow-Up',
      description: 'Automated follow-up sequence for new inbound leads',
      triggerType: 'contact_created',
      status: 'active',
      enrolledCount: 12,
      completedCount: 8,
      stepsCount: 4,
      createdAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'seq_02',
      orgId: 'org_01',
      name: 'Post-Service Review Request',
      description: 'Request reviews after appointment completion',
      triggerType: 'appointment_completed',
      status: 'active',
      enrolledCount: 45,
      completedCount: 38,
      stepsCount: 3,
      createdAt: '2026-01-15T00:00:00Z',
    },
  ];
}

// ── Auth mock ──

export function getMockAuthResult() {
  return {
    user: {
      id: 'usr_01',
      email: 'demo@mybizos.com',
      name: 'Demo Owner',
      role: 'owner' as const,
    },
    org: {
      id: 'org_01',
      name: 'Acme HVAC & Plumbing',
      slug: 'acme-hvac',
      vertical: 'hvac',
    },
    token: 'mock-jwt-token-for-development',
  };
}

// ── Frontend-compatible data transforms ──
// These functions return data matching the shapes expected by the
// frontend hooks (apps/web/src/lib/mock-data.ts types).

/**
 * Returns contacts in the shape the frontend useContacts hook expects.
 */
export function getFrontendContacts(filters?: {
  search?: string;
  status?: string;
  source?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  const { contacts, total } = getMockContacts(filters);
  return {
    data: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone ?? '(555) 000-0000',
      email: c.email ?? '',
      score: c.leadScore,
      lastActivity: getRelativeTime(c.updatedAt),
      tags: c.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
      source: c.source.charAt(0).toUpperCase() + c.source.slice(1).replace(/_/g, ' '),
    })),
    total,
  };
}

/**
 * Returns a single contact with timeline in the shape useContact expects.
 */
export function getFrontendContactById(id: string) {
  const c = getMockContactById(id);
  if (!c) return null;
  return {
    contact: {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone ?? '(555) 000-0000',
      email: c.email ?? '',
      score: c.leadScore,
      lastActivity: getRelativeTime(c.updatedAt),
      tags: c.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
      source: c.source.charAt(0).toUpperCase() + c.source.slice(1).replace(/_/g, ' '),
      company: c.company ?? '',
      address: 'Springfield, IL',
      createdAt: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    timeline: [],
  };
}

/**
 * Returns deals grouped by stage ID, matching the frontend useDeals hook.
 */
export function getFrontendDeals() {
  const grouped: Record<string, Array<{
    id: string;
    title: string;
    contact: string;
    value: number;
    daysInStage: number;
    score: number;
    tags: string[];
  }>> = {};

  // Use pipeline stages as keys
  const pipelines = getMockPipelines();
  const defaultPipeline = pipelines[0];
  if (defaultPipeline) {
    for (const stage of defaultPipeline.stages) {
      grouped[stage.slug] = [];
    }
  }

  for (const deal of mockDeals) {
    const pipeline = defaultPipeline;
    const stage = pipeline?.stages.find((s) => s.id === deal.stageId);
    const slug = stage?.slug ?? 'new_lead';

    if (!grouped[slug]) grouped[slug] = [];
    const daysInStage = Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    grouped[slug].push({
      id: deal.id,
      title: deal.title.split(' — ')[0] ?? deal.title,
      contact: deal.contactName,
      value: Number(deal.value),
      daysInStage,
      score: 75 + Math.floor(Math.random() * 20),
      tags: [],
    });
  }

  return grouped;
}

/**
 * Returns pipeline columns matching the frontend usePipelines hook.
 */
export function getFrontendPipelines() {
  const pipelines = getMockPipelines();
  const defaultPipeline = pipelines[0];
  if (!defaultPipeline) return [];

  const colorMap: Record<string, string> = {
    new_lead: 'bg-info',
    contacted: 'bg-primary',
    qualified: 'bg-primary',
    quote_sent: 'bg-warning',
    negotiation: 'bg-destructive',
    won: 'bg-success',
    lost: 'bg-muted',
  };

  return defaultPipeline.stages.map((s) => ({
    id: s.slug,
    title: s.name,
    color: colorMap[s.slug] ?? 'bg-muted',
  }));
}

/**
 * Returns conversations matching the frontend useConversations hook.
 */
export function getFrontendConversations(filters?: { channel?: string; status?: string; filter?: string; search?: string }) {
  let result = [...mockConversations];
  if (filters?.channel) result = result.filter((c) => c.channel === filters.channel);
  if (filters?.status) result = result.filter((c) => c.status === filters.status);
  if (filters?.filter === 'unread') result = result.filter((c) => c.unreadCount > 0);
  if (filters?.filter === 'ai') result = result.filter((c) => c.aiHandled);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((c) => c.contactName.toLowerCase().includes(q) || c.lastMessagePreview.toLowerCase().includes(q));
  }

  return result.map((c) => {
    const initials = c.contactName.split(' ').map((n) => n[0]).join('');
    return {
      id: c.id,
      contact: c.contactName,
      initials,
      channel: c.channel,
      lastMessage: c.lastMessagePreview,
      time: getRelativeTime(c.lastMessageAt),
      unread: c.unreadCount > 0,
      aiHandled: c.aiHandled,
      status: c.status,
    };
  });
}

/**
 * Returns messages for a conversation matching the frontend useMessages hook.
 */
export function getFrontendMessages(conversationId: string) {
  const msgs = getMockMessages(conversationId);
  return msgs.map((m) => ({
    id: m.id,
    sender: m.senderType,
    text: m.body,
    time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: m.status === 'delivered' ? 'delivered' as const : 'read' as const,
  }));
}

/**
 * Returns appointments matching the frontend useAppointments hook.
 */
export function getFrontendAppointments() {
  return mockAppointments.map((a) => {
    const start = new Date(a.startTime);
    const end = new Date(a.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const dayOfWeek = start.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return {
      id: a.id,
      title: a.title.split(' — ')[0] ?? a.title,
      customer: a.contactName,
      time: `${formatTime(start)} - ${formatTime(end)}`,
      duration: durationHours,
      dayIndex,
      hourStart: start.getHours(),
      status: a.status as 'scheduled' | 'confirmed' | 'completed',
      location: a.location,
    };
  });
}

function getRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
}

// ── Availability slots (mock) ──

export function getMockAvailability(date: string) {
  return [
    { startTime: `${date}T09:00:00`, endTime: `${date}T10:00:00`, available: true },
    { startTime: `${date}T10:00:00`, endTime: `${date}T11:00:00`, available: false },
    { startTime: `${date}T11:00:00`, endTime: `${date}T12:00:00`, available: true },
    { startTime: `${date}T13:00:00`, endTime: `${date}T14:00:00`, available: true },
    { startTime: `${date}T14:00:00`, endTime: `${date}T15:00:00`, available: true },
    { startTime: `${date}T15:00:00`, endTime: `${date}T16:00:00`, available: false },
    { startTime: `${date}T16:00:00`, endTime: `${date}T17:00:00`, available: true },
  ];
}
