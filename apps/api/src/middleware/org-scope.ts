import type { MiddlewareHandler } from 'hono';

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
  const paramOrgId = c.req.param('orgId');
  if (paramOrgId && paramOrgId !== orgId) {
    return c.json(
      { error: 'Access denied: you do not belong to this organization', code: 'FORBIDDEN', status: 403 },
      403,
    );
  }

  c.set('orgId', orgId);
  await next();
};

/**
 * Helper to get org-scoped query filter.
 * Use this in all service/repository calls to enforce multi-tenancy.
 */
export function withOrgScope(orgId: string): { orgId: string } {
  return { orgId };
}

/**
 * Audit log middleware factory.
 * Runs AFTER the handler (post-middleware) and records a structured audit
 * entry for any successful mutation (HTTP 200–299).
 *
 * Usage:
 *   app.post('/contacts', orgScopeMiddleware, auditLog('create', 'contacts'), handler)
 */
export function auditLog(
  action: string,
  resource: string,
): MiddlewareHandler {
  return async (c, next) => {
    await next();

    const status = c.res.status;
    if (status < 200 || status > 299) {
      return;
    }

    // Fire-and-forget — never block the response
    (async () => {
      try {
        const { auditService } = await import('../services/audit-service.js');

        const orgId: string | undefined = c.get('orgId');
        const user = c.get('user') as { id?: string } | undefined;

        if (!orgId) return;

        const ipAddress =
          c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
          c.req.header('x-real-ip') ??
          null;

        const userAgent = c.req.header('user-agent') ?? null;

        let resourceId: string | null = null;
        try {
          resourceId = c.req.param('id') ?? null;
        } catch {
          // param() throws if the route has no :id segment
        }

        auditService.log(orgId, {
          userId: user?.id ?? null,
          action: action as Parameters<typeof auditService.log>[1]['action'],
          resource,
          resourceId,
          description: `${action} on ${resource}${resourceId ? ` (${resourceId})` : ''}`,
          ipAddress,
          userAgent,
        });
      } catch {
        // Silently swallow — audit failures must never surface to callers
      }
    })();
  };
}
