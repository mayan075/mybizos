import { db, organizations, withOrgScope } from '@mybizos/db';
import { sql } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';

// ── Types ────────────────────────────────────────────────────────────────

interface PhoneSettings {
  provider: string;
  accountSid: string;
  authToken: string;
  accountName: string;
  connectedAt: string;
  routing?: Record<string, { voiceUrl: string; smsUrl: string; configuredAt: string }>;
}

interface MybizosPhoneSettings {
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
  mybizosPhone?: MybizosPhoneSettings;
  [key: string]: unknown;
}

export interface ResolvedOrg {
  orgId: string;
  orgName: string;
  vertical: string;
  settings: OrgSettings;
}

// ── In-memory cache (5-minute TTL) ───────────────────────────────────────

interface CacheEntry {
  data: ResolvedOrg;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const orgByPhoneCache = new Map<string, CacheEntry>();

function getCached(phoneNumber: string): ResolvedOrg | null {
  const entry = orgByPhoneCache.get(phoneNumber);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    orgByPhoneCache.delete(phoneNumber);
    return null;
  }
  return entry.data;
}

function setCache(phoneNumber: string, data: ResolvedOrg): void {
  orgByPhoneCache.set(phoneNumber, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// Clean expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of orgByPhoneCache) {
    if (now > entry.expiresAt) {
      orgByPhoneCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Resolve an organization by the Twilio phone number that received the call/SMS.
 *
 * Searches two JSONB paths in the `organizations.settings` column:
 * 1. `settings->'phone'->'routing'` keys (numbers configured via BYOT flow)
 * 2. `settings->'mybizosPhone'->'numbers'` array (numbers purchased via MyBizOS)
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
  const cached = getCached(normalized);
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
      const settings = org.settings as OrgSettings | null;

      // Check mybizosPhone numbers array
      if (settings?.mybizosPhone?.numbers) {
        for (const num of settings.mybizosPhone.numbers) {
          if (num.phoneNumber === normalized) {
            const resolved: ResolvedOrg = {
              orgId: org.id,
              orgName: org.name,
              vertical: org.vertical,
              settings: settings,
            };
            setCache(normalized, resolved);
            logger.info('Org resolved via mybizosPhone number', {
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
            setCache(normalized, resolved);
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
        setCache(normalized, resolved);
        logger.info('Org resolved via org phone column', {
          phone: normalized,
          orgId: org.id,
          orgName: org.name,
        });
        return resolved;
      }
    }

    logger.warn('No org found for phone number', { phone: normalized });
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
