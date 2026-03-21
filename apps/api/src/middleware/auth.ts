import type { MiddlewareHandler } from 'hono';
import { validateToken, type JwtPayload } from '../services/auth-service.js';

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
 * Auth middleware: extracts and validates the JWT from the Authorization header,
 * then sets the authenticated user on the Hono context.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('Authorization');

  if (!authorization) {
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
