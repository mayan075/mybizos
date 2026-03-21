import {
  db,
  conversations,
  messages,
  contacts,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export const conversationService = {
  async list(
    orgId: string,
    filters: {
      channel?: typeof conversations.channel.enumValues[number];
      status?: typeof conversations.status.enumValues[number];
    },
  ) {
    const conditions = [withOrgScope(conversations.orgId, orgId)];

    if (filters.channel) {
      conditions.push(eq(conversations.channel, filters.channel));
    }

    if (filters.status) {
      conditions.push(eq(conversations.status, filters.status));
    }

    const rows = await db
      .select({
        conversation: conversations,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt));

    return rows;
  },

  async getById(orgId: string, conversationId: string) {
    const [result] = await db
      .select({
        conversation: conversations,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ));

    if (!result) {
      throw Errors.notFound('Conversation');
    }

    return result;
  },

  async getMessages(orgId: string, conversationId: string) {
    // Verify conversation belongs to org
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ));

    if (!conversation) {
      throw Errors.notFound('Conversation');
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(
        withOrgScope(messages.orgId, orgId),
        eq(messages.conversationId, conversationId),
      ))
      .orderBy(asc(messages.createdAt));

    return rows;
  },

  async createMessage(
    orgId: string,
    conversationId: string,
    data: {
      direction: typeof messages.direction.enumValues[number];
      channel: typeof messages.channel.enumValues[number];
      senderType: typeof messages.senderType.enumValues[number];
      senderId?: string | null;
      body: string;
      mediaUrls?: unknown[];
      metadata?: Record<string, unknown>;
    },
  ) {
    // Verify conversation belongs to org
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ));

    if (!conversation) {
      throw Errors.notFound('Conversation');
    }

    const now = new Date();

    const [created] = await db
      .insert(messages)
      .values({
        conversationId,
        orgId,
        direction: data.direction,
        channel: data.channel,
        senderType: data.senderType,
        senderId: data.senderId ?? null,
        body: data.body,
        mediaUrls: data.mediaUrls ?? [],
        metadata: data.metadata ?? {},
        status: 'sent',
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create message');
    }

    // Update conversation last message time and unread count
    const unreadIncrement = data.direction === 'inbound' ? 1 : 0;

    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        unreadCount: sql`${conversations.unreadCount} + ${unreadIncrement}`,
        // Reopen conversation if it was closed/snoozed and we got an inbound message
        ...(data.direction === 'inbound' && conversation.status !== 'open'
          ? { status: 'open' as const }
          : {}),
      })
      .where(eq(conversations.id, conversationId));

    logger.info('Message created', {
      orgId,
      conversationId,
      direction: data.direction,
      channel: data.channel,
    });

    return created;
  },

  async markAsRead(orgId: string, conversationId: string) {
    const [updated] = await db
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Conversation');
    }

    return updated;
  },

  async close(orgId: string, conversationId: string) {
    const [updated] = await db
      .update(conversations)
      .set({ status: 'closed' })
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Conversation');
    }

    logger.info('Conversation closed', { orgId, conversationId });
    return updated;
  },

  async snooze(orgId: string, conversationId: string) {
    const [updated] = await db
      .update(conversations)
      .set({ status: 'snoozed' })
      .where(and(
        withOrgScope(conversations.orgId, orgId),
        eq(conversations.id, conversationId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Conversation');
    }

    logger.info('Conversation snoozed', { orgId, conversationId });
    return updated;
  },

  async create(
    orgId: string,
    data: {
      contactId: string;
      channel: typeof conversations.channel.enumValues[number];
      assignedTo?: string | null;
    },
  ) {
    const [created] = await db
      .insert(conversations)
      .values({
        orgId,
        contactId: data.contactId,
        channel: data.channel,
        status: 'open',
        assignedTo: data.assignedTo ?? null,
        aiHandled: false,
        unreadCount: 0,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create conversation');
    }

    logger.info('Conversation created', { orgId, conversationId: created.id });
    return created;
  },
};
