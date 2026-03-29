import { db, organizations, withOrgScope } from '@hararai/db';
import { sql } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

// ── Types ────────────────────────────────────────────────────────────────

interface PhoneSettings {
  provider: string;
  accountSid: string;
  authToken: string;
  accountName: string;
  connectedAt: string;
  routing?: Record<string, { voiceUrl: string; smsUrl: string; configuredAt: string }>;
}

interface ManagedPhoneSettings {
  subaccountSid: string;
  subaccountAuthToken: string;
  friendlyName: string;
  setupAt: string;
  numbers: Array<{
    sid: string;
    phoneNumber: string;
    friendlyName: string;
    capabilities: { voice: boolean; sms: boolean; mms: boolean };
  }>;
}

interface OrgSettings {
  phone?: PhoneSettings;
  managedPhone?: ManagedPhoneSettings;
  mybizosPhone?: ManagedPhoneSettings;
  [key: string]: unknown;
}

export interface ResolvedOrg {
  orgId: string;
  orgName: string;
  vertical: string;
  settings: OrgSettings;
}

// ── Redis cache (5-minute TTL) ────────────────────────────────────────────

const CACHE_TTL_SECONDS = 300; // 5 minutes

function cacheKey(normalizedPhone: string): string {
  return `phone-routing:${normalizedPhone}`;
}

async function getCached(phoneNumber: string): Promise<ResolvedOrg | null> {
  const raw = await cacheGet(cacheKey(phoneNumber));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResolvedOrg;
  } catch {
    return null;
  }
}

async function setCache(phoneNumber: string, data: ResolvedOrg): Promise<void> {
  await cacheSet(cacheKey(phoneNumber), JSON.stringify(data), CACHE_TTL_SECONDS);
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Resolve an organization by the Twilio phone number that received the call/SMS.
 *
 * Searches two JSONB paths in the `organizations.settings` column:
 * 1. `settings->'phone'->'routing'` keys (numbers configured via BYOT flow)
 * 2. `settings->'managedPhone'->'numbers'` array (numbers purchased via HararAI)
 * 3. Falls back to matching the `organizations.phone` column directly
 *
 * Results are cached in-memory for 5 minutes.
 */
export async function resolveOrgByPhoneNumber(
  twilioNumber: string,
): Promise<ResolvedOrg | null> {
  // Normalize the phone number (strip spaces, ensure + prefix)
  const normalized = twilioNumber.replace(/\s/g, '');

  // Check cache first
  const cached = await getCached(normalized);
  if (cached) {
    logger.debug('Org resolved from cache', { phone: normalized, orgId: cached.orgId });
    return cached;
  }

  try {
    // Strategy 1: Check mybizosPhone.numbers array for matching phoneNumber
    // Strategy 2: Check phone.routing keys for matching number
    // Strategy 3: Check org phone column
    // We query all orgs and check in-app (there won't be many orgs)
    const allOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        vertical: organizations.vertical,
        phone: organizations.phone,
        settings: organizations.settings,
      })
      .from(organizations);

    for (const org of allOrgs) {
      const settings = (org.settings ?? {}) as OrgSettings;

      // Check managedPhone / mybizosPhone numbers array (dual-read)
      const managedPhone = settings?.managedPhone ?? settings?.mybizosPhone;
      if (managedPhone?.numbers) {
        for (const num of managedPhone.numbers) {
          if (num.phoneNumber === normalized) {
            const resolved: ResolvedOrg = {
              orgId: org.id,
              orgName: org.name,
              vertical: org.vertical,
              settings: settings,
            };
            await setCache(normalized, resolved);
            logger.info('Org resolved via managedPhone number', {
              phone: normalized,
              orgId: org.id,
              orgName: org.name,
            });
            return resolved;
          }
        }
      }

      // Check phone.routing keys (BYOT numbers)
      if (settings?.phone?.routing) {
        for (const routedNumber of Object.keys(settings.phone.routing)) {
          if (routedNumber === normalized) {
            const resolved: ResolvedOrg = {
              orgId: org.id,
              orgName: org.name,
              vertical: org.vertical,
              settings: settings,
            };
            await setCache(normalized, resolved);
            logger.info('Org resolved via phone routing', {
              phone: normalized,
              orgId: org.id,
              orgName: org.name,
            });
            return resolved;
          }
        }
      }

      // Check direct phone column on organization
      if (org.phone && org.phone === normalized) {
        const resolved: ResolvedOrg = {
          orgId: org.id,
          orgName: org.name,
          vertical: org.vertical,
          settings: settings ?? {},
        };
        await setCache(normalized, resolved);
        logger.info('Org resolved via org phone column', {
          phone: normalized,
          orgId: org.id,
          orgName: org.name,
        });
        return resolved;
      }
    }

    logger.warn('No org found for phone number', {
      phone: normalized,
      orgCount: String(allOrgs.length),
    });
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to resolve org by phone number', {
      phone: normalized,
      error: message,
    });
    return null;
  }
}
