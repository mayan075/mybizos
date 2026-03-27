import type { MiddlewareHandler } from 'hono';
import { validateToken, type JwtPayload } from '../services/auth-service.js';
import { config } from '../config.js';
import { logger } from './logger.js';

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

// Cache the dev user so we only query the DB once per process
let cachedDevUser: AuthUser | null = null;

/**
 * In dev mode, try to find a real user + org from the database.
 * Returns null if DB is unavailable — caller must handle 401.
 */
async function getDevUser(): Promise<AuthUser | null> {
  if (cachedDevUser) return cachedDevUser;

  try {
    const { db, users, orgMembers } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');

    const result = await db
      .select({
        userId: users.id,
        email: users.email,
        orgId: orgMembers.orgId,
        role: orgMembers.role,
      })
      .from(users)
      .innerJoin(orgMembers, eq(orgMembers.userId, users.id))
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
    // DB not available — return null so caller returns 401
  }

  return null;
}

/**
 * Auth middleware: extracts and validates the JWT from the Authorization header,
 * then sets the authenticated user on the Hono context.
 *
 * In development mode without a token, attempts DB lookup for a real user.
 * Never falls back to hardcoded credentials.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('Authorization');

  if (!authorization) {
    // In dev mode, allow token-less requests if we can find a real user in the DB
    if (config.NODE_ENV === 'development') {
      const devUser = await getDevUser();
      if (devUser) {
        c.set('user', devUser);
        c.set('token', 'dev-bypass-token');
        await next();
        return;
      }
      logger.warn('Dev mode: no auth token and no user found in database');
    }
    return c.json(
      { error: 'Authorization header is required', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
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
