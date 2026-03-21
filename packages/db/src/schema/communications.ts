import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { contacts } from "./contacts.js";
import { users } from "./auth.js";

export const channelEnum = pgEnum("channel", [
  "sms",
  "email",
  "call",
  "whatsapp",
  "webchat",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "closed",
  "snoozed",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageSenderTypeEnum = pgEnum("message_sender_type", [
  "contact",
  "user",
  "ai",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    status: conversationStatusEnum("status").notNull().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    aiHandled: boolean("ai_handled").notNull().default(false),
    lastMessageAt: timestamp("last_message_at"),
    unreadCount: integer("unread_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("conversations_org_id_idx").on(table.orgId),
    index("conversations_contact_id_idx").on(table.contactId),
    index("conversations_status_idx").on(table.orgId, table.status),
    index("conversations_channel_idx").on(table.orgId, table.channel),
    index("conversations_assigned_to_idx").on(table.assignedTo),
    index("conversations_last_message_at_idx").on(
      table.orgId,
      table.lastMessageAt,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    direction: messageDirectionEnum("direction").notNull(),
    channel: channelEnum("channel").notNull(),
    senderType: messageSenderTypeEnum("sender_type").notNull(),
    senderId: uuid("sender_id"),
    body: text("body").notNull(),
    mediaUrls: jsonb("media_urls").default([]).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    status: messageStatusEnum("status").notNull().default("sent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_org_id_idx").on(table.orgId),
    index("messages_created_at_idx").on(table.conversationId, table.createdAt),
    index("messages_sender_type_idx").on(table.orgId, table.senderType),
  ],
);
