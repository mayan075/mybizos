import { withOrgScope } from '../middleware/org-scope.js';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface Conversation {
  id: string;
  orgId: string;
  contactId: string;
  contactName: string;
  channel: 'sms' | 'email' | 'phone' | 'webchat';
  status: 'open' | 'closed' | 'snoozed';
  lastMessageAt: string;
  unreadCount: number;
  assignedTo: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'phone' | 'webchat';
  content: string;
  sender: string;
  isAi: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Mock data ──
const mockConversations: Conversation[] = [
  {
    id: 'conv_01',
    orgId: 'org_01',
    contactId: 'cnt_01',
    contactName: 'Sarah Johnson',
    channel: 'sms',
    status: 'open',
    lastMessageAt: '2026-03-20T16:45:00Z',
    unreadCount: 2,
    assignedTo: null,
    createdAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'conv_02',
    orgId: 'org_01',
    contactId: 'cnt_02',
    contactName: 'Michael Chen',
    channel: 'email',
    status: 'open',
    lastMessageAt: '2026-03-19T09:00:00Z',
    unreadCount: 0,
    assignedTo: null,
    createdAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'conv_03',
    orgId: 'org_01',
    contactId: 'cnt_01',
    contactName: 'Sarah Johnson',
    channel: 'phone',
    status: 'closed',
    lastMessageAt: '2026-03-15T14:30:00Z',
    unreadCount: 0,
    assignedTo: null,
    createdAt: '2026-03-15T14:25:00Z',
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg_01',
    conversationId: 'conv_01',
    direction: 'inbound',
    channel: 'sms',
    content: 'Hi, I wanted to follow up on the furnace repair quote',
    sender: 'Sarah Johnson',
    isAi: false,
    metadata: {},
    createdAt: '2026-03-20T16:40:00Z',
  },
  {
    id: 'msg_02',
    conversationId: 'conv_01',
    direction: 'outbound',
    channel: 'sms',
    content: 'Hi Sarah! Thanks for reaching out. Your technician visit is confirmed for March 20. The repair typically starts around $150-250 depending on the issue. Would you like to confirm this appointment?',
    sender: 'AI Assistant',
    isAi: true,
    metadata: { aiModel: 'claude-3.5-sonnet' },
    createdAt: '2026-03-20T16:40:30Z',
  },
  {
    id: 'msg_03',
    conversationId: 'conv_01',
    direction: 'inbound',
    channel: 'sms',
    content: 'Yes, that works. See you then!',
    sender: 'Sarah Johnson',
    isAi: false,
    metadata: {},
    createdAt: '2026-03-20T16:45:00Z',
  },
];

export const conversationService = {
  async list(
    orgId: string,
    filters: { channel?: string; status?: string },
  ): Promise<Conversation[]> {
    const scope = withOrgScope(orgId);
    let results = mockConversations.filter((c) => c.orgId === scope.orgId);

    if (filters.channel) {
      results = results.filter((c) => c.channel === filters.channel);
    }

    if (filters.status) {
      results = results.filter((c) => c.status === filters.status);
    }

    return results.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  },

  async getMessages(orgId: string, conversationId: string): Promise<Message[]> {
    const scope = withOrgScope(orgId);
    const conversation = mockConversations.find(
      (c) => c.id === conversationId && c.orgId === scope.orgId,
    );

    if (!conversation) {
      throw Errors.notFound('Conversation');
    }

    return mockMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async sendMessage(
    orgId: string,
    conversationId: string,
    data: { content: string; channel: 'sms' | 'email' },
  ): Promise<Message> {
    const scope = withOrgScope(orgId);
    const conversation = mockConversations.find(
      (c) => c.id === conversationId && c.orgId === scope.orgId,
    );

    if (!conversation) {
      throw Errors.notFound('Conversation');
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      direction: 'outbound',
      channel: data.channel,
      content: data.content,
      sender: 'User',
      isAi: false,
      metadata: {},
      createdAt: now,
    };

    mockMessages.push(message);

    // Update conversation's last message timestamp
    const convIdx = mockConversations.findIndex((c) => c.id === conversationId);
    if (convIdx !== -1) {
      const existing = mockConversations[convIdx] as Conversation;
      mockConversations[convIdx] = { ...existing, lastMessageAt: now };
    }

    logger.info('Message sent', { orgId, conversationId, channel: data.channel });
    return message;
  },
};
