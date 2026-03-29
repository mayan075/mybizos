import {
  db,
  walletAccounts,
  walletTransactions,
  withOrgScope,
} from '@hararai/db';
import type {
  walletTransactionCategoryEnum,
} from '@hararai/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { config } from '../config.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionCategory = (typeof walletTransactionCategoryEnum.enumValues)[number];

interface DebitParams {
  amount: number | string;
  category: TransactionCategory;
  description: string;
  relatedResourceId?: string;
}

interface CreditParams {
  amount: number | string;
  category: TransactionCategory;
  description: string;
  stripePaymentIntentId?: string;
}

interface GetTransactionsParams {
  limit?: number;
  offset?: number;
  category?: TransactionCategory;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const walletService = {
  /**
   * Find the wallet for an org, creating one if it doesn't exist.
   */
  async getOrCreateWallet(orgId: string) {
    const [existing] = await db
      .select()
      .from(walletAccounts)
      .where(withOrgScope(walletAccounts.orgId, orgId));

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(walletAccounts)
      .values({ orgId })
      .onConflictDoNothing({ target: walletAccounts.orgId })
      .returning();

    // If the insert was a no-op due to race condition, re-fetch
    if (!created) {
      const [reFetched] = await db
        .select()
        .from(walletAccounts)
        .where(withOrgScope(walletAccounts.orgId, orgId));

      if (!reFetched) {
        throw Errors.internal('Failed to create wallet');
      }
      return reFetched;
    }

    return created;
  },

  /**
   * Return the current balance as a number.
   */
  async getBalance(orgId: string): Promise<number> {
    const wallet = await walletService.getOrCreateWallet(orgId);
    return Number(wallet.balance);
  },

  /**
   * Check if org has at least the given amount in their wallet.
   */
  async hasBalance(orgId: string, amount: string): Promise<boolean> {
    const balance = await walletService.getBalance(orgId);
    return balance >= Number(amount);
  },

  /**
   * Deduct from wallet balance atomically.
   * Throws if insufficient funds.
   */
  async debit(orgId: string, params: DebitParams) {
    const { amount, category, description, relatedResourceId } = params;
    const wallet = await walletService.getOrCreateWallet(orgId);

    const currentBalance = Number(wallet.balance);
    const debitAmount = Number(amount);

    if (currentBalance < debitAmount) {
      throw Errors.badRequest(
        `Insufficient wallet balance. Current: $${currentBalance.toFixed(2)}, Required: $${debitAmount.toFixed(2)}`,
      );
    }

    // Atomic balance update
    const [updated] = await db
      .update(walletAccounts)
      .set({
        balance: sql`${walletAccounts.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(walletAccounts.id, wallet.id),
          sql`${walletAccounts.balance} >= ${amount}`,
        ),
      )
      .returning();

    if (!updated) {
      throw Errors.badRequest('Insufficient wallet balance (concurrent debit)');
    }

    const balanceAfter = Number(updated.balance);

    // Record the transaction
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        orgId,
        walletId: wallet.id,
        type: 'debit',
        amount: String(amount),
        balanceAfter: String(balanceAfter),
        category,
        description,
        relatedResourceId: relatedResourceId ?? null,
      })
      .returning();

    if (!transaction) {
      throw Errors.internal('Failed to record wallet transaction');
    }

    // Check auto-recharge threshold (fire-and-forget)
    if (
      updated.autoRechargeEnabled &&
      balanceAfter < Number(updated.autoRechargeThreshold)
    ) {
      walletService.triggerAutoRecharge(orgId).catch((err: unknown) => {
        logger.error('Auto-recharge fire-and-forget failed', {
          orgId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return transaction;
  },

  /**
   * Add to wallet balance atomically.
   */
  async credit(orgId: string, params: CreditParams) {
    const { amount, category, description, stripePaymentIntentId } = params;
    const wallet = await walletService.getOrCreateWallet(orgId);

    // Atomic balance update
    const [updated] = await db
      .update(walletAccounts)
      .set({
        balance: sql`${walletAccounts.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, wallet.id))
      .returning();

    if (!updated) {
      throw Errors.internal('Failed to update wallet balance');
    }

    const balanceAfter = Number(updated.balance);

    // Record the transaction
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        orgId,
        walletId: wallet.id,
        type: 'credit',
        amount: String(amount),
        balanceAfter: String(balanceAfter),
        category,
        description,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
      })
      .returning();

    if (!transaction) {
      throw Errors.internal('Failed to record wallet transaction');
    }

    return transaction;
  },

  /**
   * Return paginated transaction history for an org.
   */
  async getTransactions(orgId: string, params: GetTransactionsParams = {}) {
    const { limit = 50, offset = 0, category } = params;

    const conditions = [withOrgScope(walletTransactions.orgId, orgId)];

    if (category) {
      conditions.push(eq(walletTransactions.category, category));
    }

    const rows = await db
      .select()
      .from(walletTransactions)
      .where(and(...conditions))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const { count } = await import('drizzle-orm');
    const [countResult] = await db
      .select({ value: count() })
      .from(walletTransactions)
      .where(and(...conditions));

    return { transactions: rows, total: countResult?.value ?? 0 };
  },

  /**
   * Update auto-recharge settings for an org's wallet.
   */
  async updateAutoRecharge(
    orgId: string,
    settings: { enabled: boolean; threshold?: number; amount?: number },
  ) {
    const wallet = await walletService.getOrCreateWallet(orgId);

    const updateData: Record<string, unknown> = {
      autoRechargeEnabled: settings.enabled,
      updatedAt: new Date(),
    };
    if (settings.threshold !== undefined) {
      updateData['autoRechargeThreshold'] = String(settings.threshold);
    }
    if (settings.amount !== undefined) {
      updateData['autoRechargeAmount'] = String(settings.amount);
    }

    await db
      .update(walletAccounts)
      .set(updateData)
      .where(eq(walletAccounts.id, wallet.id));

    return { updated: true };
  },

  /**
   * Internal: attempt auto-recharge via Stripe.
   * Logs errors but never throws.
   */
  async triggerAutoRecharge(orgId: string): Promise<void> {
    try {
      const [wallet] = await db
        .select()
        .from(walletAccounts)
        .where(withOrgScope(walletAccounts.orgId, orgId));

      if (!wallet) {
        logger.warn('Auto-recharge: wallet not found', { orgId });
        return;
      }

      if (!wallet.autoRechargeEnabled) {
        logger.info('Auto-recharge: not enabled', { orgId });
        return;
      }

      if (!wallet.stripePaymentMethodId) {
        logger.warn('Auto-recharge: no payment method on file', { orgId });
        return;
      }

      if (!config.STRIPE_SECRET_KEY) {
        logger.error('Auto-recharge: Stripe not configured', { orgId });
        return;
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(config.STRIPE_SECRET_KEY, { typescript: true });

      const rechargeAmountCents = Math.round(Number(wallet.autoRechargeAmount) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: rechargeAmountCents,
        currency: wallet.currency.toLowerCase(),
        payment_method: wallet.stripePaymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      // Credit the wallet on success
      await walletService.credit(orgId, {
        amount: wallet.autoRechargeAmount,
        category: 'topup',
        description: `Auto-recharge of $${Number(wallet.autoRechargeAmount).toFixed(2)}`,
        stripePaymentIntentId: paymentIntent.id,
      });

      logger.info('Auto-recharge successful', {
        orgId,
        amount: wallet.autoRechargeAmount,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      logger.error('Auto-recharge failed', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
