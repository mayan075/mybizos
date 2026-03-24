import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { contacts } from "./contacts";
export const reviewPlatformEnum = pgEnum("review_platform", [
    "google",
    "facebook",
    "yelp",
    "internal",
]);
export const reviewSentimentEnum = pgEnum("review_sentiment", [
    "positive",
    "neutral",
    "negative",
]);
export const campaignTriggerEnum = pgEnum("campaign_trigger_type", [
    "after_appointment",
    "after_deal_won",
    "manual",
]);
export const campaignChannelEnum = pgEnum("campaign_channel", [
    "sms",
    "email",
    "both",
]);
export const reviews = pgTable("reviews", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
        onDelete: "set null",
    }),
    platform: reviewPlatformEnum("platform").notNull(),
    rating: integer("rating").notNull(),
    reviewText: text("review_text"),
    reviewerName: text("reviewer_name").notNull(),
    aiResponse: text("ai_response"),
    responsePosted: boolean("response_posted").notNull().default(false),
    reviewUrl: text("review_url"),
    sentiment: reviewSentimentEnum("sentiment").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("reviews_org_id_idx").on(table.orgId),
    index("reviews_platform_idx").on(table.orgId, table.platform),
    index("reviews_rating_idx").on(table.orgId, table.rating),
    index("reviews_sentiment_idx").on(table.orgId, table.sentiment),
    index("reviews_response_posted_idx").on(table.orgId, table.responsePosted),
    index("reviews_created_at_idx").on(table.orgId, table.createdAt),
]);
export const reviewCampaigns = pgTable("review_campaigns", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerType: campaignTriggerEnum("trigger_type").notNull(),
    delayHours: integer("delay_hours").notNull().default(24),
    messageTemplate: text("message_template").notNull(),
    channel: campaignChannelEnum("channel").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sentCount: integer("sent_count").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("review_campaigns_org_id_idx").on(table.orgId),
    index("review_campaigns_active_idx").on(table.orgId, table.isActive),
]);
//# sourceMappingURL=reviews.js.map