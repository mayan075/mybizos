import { db, auditLogs, withOrgScope } from '@hararai/db';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';

type AuditAction = typeof auditLogs.action.enumValues[number];

export const auditService = {
  /**
   * Fire-and-forget audit log insert.
   * Never throws — errors are caught and logged internally.
   */
  log(
    orgId: string,
    entry: {
      userId?: string | null;
      action: AuditAction;
      resource: string;
      resourceId?: string | null;
      description: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ): void {
    db.insert(auditLogs)
      .values({
        orgId,
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        description: entry.description,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      })
      .catch((err: unknown) => {
        logger.error('Failed to write audit log', { orgId, action: entry.action, err });
      });
  },

  async getAuditLogs(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
      resource?: string;
      userId?: string;
    },
  ) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [withOrgScope(auditLogs.orgId, orgId)];

    if (options?.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }

    if (options?.resource) {
      conditions.push(eq(auditLogs.resource, options.resource));
    }

    if (options?.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  },
};
