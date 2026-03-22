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

/**
 * Auth middleware: extracts and validates the JWT from the Authorization header,
 * then sets the authenticated user on the Hono context.
 *
 * In development mode, if no Authorization header is provided, a demo user
 * is injected so the frontend can work without requiring login.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('Authorization');

  // Dev bypass: if no auth header and we're in development, use demo user
  if (!authorization) {
    if (config.NODE_ENV === 'development') {
      c.set('user', DEV_USER);
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
      c.set('user', DEV_USER);
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
    // Dev bypass: if token validation fails in development, use demo user
    if (config.NODE_ENV === 'development') {
      c.set('user', DEV_USER);
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
