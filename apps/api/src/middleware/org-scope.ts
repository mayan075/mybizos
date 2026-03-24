import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';

declare module 'hono' {
  interface ContextVariableMap {
    orgId: string;
  }
}

/**
 * Org scope middleware: extracts org_id from the authenticated user
 * and sets it on the Hono context for use in all downstream handlers.
 *
 * Also validates that the :orgId URL param (if present) matches the
 * authenticated user's org, preventing cross-tenant access.
 *
 * Must be applied AFTER authMiddleware.
 */
export const orgScopeMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user');

  if (!user) {
    return c.json(
      { error: 'Authentication required before org scope', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  const orgId = user.orgId;

  // If the route has an :orgId param, verify it matches the user's org.
  // In dev mode, also allow "demo" and "org_01" as aliases for the user's actual org
  // (the frontend may send "org_01" before it has a real JWT with the correct orgId).
  const paramOrgId = c.req.param('orgId');
  if (paramOrgId && paramOrgId !== orgId && paramOrgId !== 'demo') {
    // In development, treat "org_01" as an alias for the real org
    if (paramOrgId === 'org_01' && config.NODE_ENV === 'development') {
      // Allow — the dev user's real orgId is already set
    } else {
      return c.json(
        { error: 'Access denied: you do not belong to this organization', code: 'FORBIDDEN', status: 403 },
        403,
      );
    }
  }

  c.set('orgId', orgId);
  await next();
};

/**
 * Helper to get org-scoped query filter.
 * Use this in all service/repository calls to enforce multi-tenancy.
 *
 * When the real DB package is ready, this will delegate to the Drizzle
 * `withOrgScope(orgId)` helper from @mybizos/db.
 */
export function withOrgScope(orgId: string): { orgId: string } {
  return { orgId };
}
