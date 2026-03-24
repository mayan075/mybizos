import { type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
/**
 * Creates a multi-tenancy scope filter for Drizzle queries.
 *
 * EVERY tenant-scoped query MUST use this helper to ensure data isolation.
 * This is the single point of enforcement for org-level access control.
 *
 * Usage:
 * ```ts
 * const result = await db
 *   .select()
 *   .from(contacts)
 *   .where(withOrgScope(contacts.orgId, orgId));
 * ```
 */
export declare function withOrgScope(column: PgColumn, orgId: string): SQL;
//# sourceMappingURL=helpers.d.ts.map