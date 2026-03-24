import { eq } from "drizzle-orm";
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
export function withOrgScope(column, orgId) {
    return eq(column, orgId);
}
//# sourceMappingURL=helpers.js.map