import type { MiddlewareHandler } from 'hono';
import { validateToken, type JwtPayload } from '../services/auth-service.js';
import { config } from '../config.js';

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    token: string;
  }
}

/**
 * Default demo user for development mode when no auth token is provided.
 * Matches the mock data in mock-service.ts.
 */
const DEV_USER: AuthUser = {
  id: 'usr_01',
  email: 'demo@mybizos.com',
  orgId: 'org_01',
  role: 'owner',
};

// Cache the real dev user so we only query the DB once
let cachedDevUser: AuthUser | null = null;

/**
 * In dev mode, try to find a real user + org from the database so that
 * features like voice calling, phone system, etc. work against real data.
 * Falls back to the hardcoded DEV_USER if the DB is not available.
 */
async function getDevUser(): Promise<AuthUser> {
  if (cachedDevUser) return cachedDevUser;

  try {
    const { db, users, orgMembers } = await import('@mybizos/db');

    // Find the first user that has an org membership
    const result = await db
      .select({
        userId: users.id,
        email: users.email,
        orgId: orgMembers.orgId,
        role: orgMembers.role,
      })
      .from(users)
      .innerJoin(orgMembers, (await import('drizzle-orm')).eq(orgMembers.userId, users.id))
      .limit(1);

    if (result.length > 0 && result[0]) {
      const row = result[0];
      cachedDevUser = {
        id: row.userId,
        email: row.email,
        orgId: row.orgId,
        role: row.role as AuthUser['role'],
      };
      return cachedDevUser;
    }
  } catch {
    // DB not available — fall through to hardcoded dev user
  }

  return DEV_USER;
}

/**
 * Auth middleware: extracts and validates the JWT from the Authorization header,
 * then sets the authenticated user on the Hono context.
 *
 * In development mode, if no Authorization header is provided, a real user
 * from the database is used (if available), otherwise falls back to DEV_USER.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('Authorization');

  // Dev bypass: if no auth header and we're in development, use dev user
  if (!authorization) {
    if (config.NODE_ENV === 'development') {
      const devUser = await getDevUser();
      c.set('user', devUser);
      c.set('token', 'dev-bypass-token');
      await next();
      return;
    }
    return c.json(
      { error: 'Authorization header is required', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Dev bypass: treat malformed auth as no auth in development
    if (config.NODE_ENV === 'development') {
      const devUser = await getDevUser();
      c.set('user', devUser);
      c.set('token', 'dev-bypass-token');
      await next();
      return;
    }
    return c.json(
      { error: 'Invalid authorization format. Use: Bearer <token>', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  const token = parts[1] as string;

  try {
    const payload: JwtPayload = validateToken(token);

    c.set('user', {
      id: payload.userId,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    });
    c.set('token', token);

    await next();
  } catch {
    // Dev bypass: if token validation fails in development, use dev user
    if (config.NODE_ENV === 'development') {
      const devUser = await getDevUser();
      c.set('user', devUser);
      c.set('token', 'dev-bypass-token');
      await next();
      return;
    }
    return c.json(
      { error: 'Invalid or expired token', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }
};

/**
 * Require a specific role for a route.
 */
export function requireRole(...roles: AuthUser['role'][]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      return c.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN', status: 403 },
        403,
      );
    }
    await next();
  };
}
