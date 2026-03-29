import {
  db,
  contacts,
  withOrgScope,
} from '@hararai/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';
import { activityService } from './activity-service.js';

// ── Types ────────────────────────────────────────────────────────────────

type ContactRow = typeof contacts.$inferSelect;

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Find an existing contact by phone number within an org, or create a new one.
 *
 * Used by inbound SMS/call webhooks to ensure every interaction has a contact
 * record in the CRM.
 */
export async function resolveContact(
  orgId: string,
  phone: string,
  channel: 'phone' | 'sms',
): Promise<ContactRow> {
  // Normalize phone (strip spaces)
  const normalized = phone.replace(/\s/g, '');

  try {
    // 1. Look up existing contact by phone within this org
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(
        withOrgScope(contacts.orgId, orgId),
        eq(contacts.phone, normalized),
      ))
      .limit(1);

    if (existing) {
      logger.debug('Existing contact found', {
        orgId,
        contactId: existing.id,
        phone: normalized,
      });
      return existing;
    }

    // 2. No existing contact — create a new one
    const [created] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName: 'Unknown',
        lastName: '',
        phone: normalized,
        source: channel,
        tags: ['auto-created'],
        customFields: {},
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create contact — insert returned no rows');
    }

    logger.info('New contact auto-created from inbound message', {
      orgId,
      contactId: created.id,
      phone: normalized,
      channel,
    });

    // 3. Log activity for the auto-creation (fire-and-forget)
    activityService.logActivity(orgId, {
      contactId: created.id,
      type: 'ai_interaction',
      title: `New contact auto-created from inbound ${channel.toUpperCase()}`,
      description: `Contact auto-created when ${normalized} sent an inbound ${channel}. No prior record existed.`,
      metadata: { source: channel, phone: normalized },
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to log contact auto-creation activity', { error: msg });
    });

    return created;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to resolve contact', {
      orgId,
      phone: normalized,
      channel,
      error: message,
    });
    throw err;
  }
}
