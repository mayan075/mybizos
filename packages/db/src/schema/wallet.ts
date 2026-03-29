import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "credit",
  "debit",
]);

export const walletTransactionCategoryEnum = pgEnum("wallet_transaction_category", [
  "topup",
  "ai_call",
  "sms_outbound",
  "sms_inbound",
  "phone_number",
  "refund",
  "adjustment",
]);

export const usageResourceEnum = pgEnum("usage_resource", [
  "ai_call_minute",
  "sms_outbound_us",
  "sms_outbound_au",
  "sms_inbound",
  "phone_number_us",
  "phone_number_au",
  "phone_number_au_tollfree",
]);

// ─── Wallet Accounts ────────────────────────────────────────────────────────

export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USD"),
    autoRechargeEnabled: boolean("auto_recharge_enabled").notNull().default(false),
    autoRechargeThreshold: numeric("auto_recharge_threshold", { precision: 10, scale: 2 })
      .notNull()
      .default("10.00"),
    autoRechargeAmount: numeric("auto_recharge_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("50.00"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("wallet_accounts_org_id_idx").on(table.orgId),
  ],
);

// ─── Wallet Transactions ─────────────────────────────────────────────────────

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => walletAccounts.id, { onDelete: "cascade" }),
    type: walletTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 10, scale: 2 }).notNull(),
    category: walletTransactionCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    relatedResourceId: text("related_resource_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wallet_transactions_org_id_idx").on(table.orgId),
    index("wallet_transactions_wallet_id_idx").on(table.walletId),
    index("wallet_transactions_created_at_idx").on(table.createdAt),
    index("wallet_transactions_category_idx").on(table.category),
  ],
);

// ─── Usage Rates ─────────────────────────────────────────────────────────────

export const usageRates = pgTable(
  "usage_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    resource: usageResourceEnum("resource").notNull(),
    costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }).notNull(),
    pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 4 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("usage_rates_org_id_idx").on(table.orgId),
    index("usage_rates_resource_idx").on(table.resource),
  ],
);
