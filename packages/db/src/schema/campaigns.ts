import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";

// ── Enums ──

export const campaignTypeEnum = pgEnum("campaign_type", ["email", "sms"]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
]);

export const campaignRecipientStatusEnum = pgEnum(
  "campaign_recipient_status",
  [
    "pending",
    "sent",
    "delivered",
    "opened",
    "clicked",
    "bounced",
    "unsubscribed",
  ],
);

// ── Campaign Stats Type ──

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

// ── Segment Filter Type ──

export interface SegmentFilter {
  tags?: string[];
  minScore?: number;
  maxScore?: number;
  source?: string;
  allContacts?: boolean;
}

// ── Tables ──

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: campaignTypeEnum("type").notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    subject: text("subject"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    segmentFilter: jsonb("segment_filter")
      .$type<SegmentFilter>()
      .default({ allContacts: true })
      .notNull(),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    stats: jsonb("stats")
      .$type<CampaignStats>()
      .default({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("campaigns_org_id_idx").on(table.orgId),
    index("campaigns_status_idx").on(table.orgId, table.status),
    index("campaigns_type_idx").on(table.orgId, table.type),
    index("campaigns_scheduled_at_idx").on(table.orgId, table.scheduledAt),
    index("campaigns_created_at_idx").on(table.orgId, table.createdAt),
  ],
);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: campaignRecipientStatusEnum("status")
      .notNull()
      .default("pending"),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
  },
  (table) => [
    index("campaign_recipients_campaign_id_idx").on(table.campaignId),
    index("campaign_recipients_contact_id_idx").on(table.contactId),
    index("campaign_recipients_org_id_idx").on(table.orgId),
    index("campaign_recipients_status_idx").on(
      table.campaignId,
      table.status,
    ),
  ],
);
