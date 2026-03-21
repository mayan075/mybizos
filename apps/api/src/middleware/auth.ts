import type { Context, MiddlewareHandler } from 'hono';
import { config } from '../config.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * Auth middleware: extracts and validates the JWT from the Authorization header,
 * then sets the authenticated user on the Hono context.
 *
 * Until Better Auth is fully integrated, this uses a simplified JWT decode.
 * The production version will validate against Better Auth sessions.
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
    const user = await verifyToken(token);
    c.set('user', user);
    await next();
  } catch {
    return c.json(
      { error: 'Invalid or expired token', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }
};

/**
 * Verify and decode a JWT token.
 *
 * STUB: This currently decodes a base64-encoded JSON payload for development.
 * Production will use Better Auth session validation with proper cryptographic verification.
 */
async function verifyToken(token: string): Promise<AuthUser> {
  // In development mode, accept a base64-encoded JSON user payload
  // Format: base64({ id, email, name, orgId, role })
  // Production will validate via Better Auth
  if (config.NODE_ENV === 'development') {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as Record<string, unknown>;

      if (
        typeof decoded['id'] !== 'string' ||
        typeof decoded['email'] !== 'string' ||
        typeof decoded['name'] !== 'string' ||
        typeof decoded['orgId'] !== 'string' ||
        typeof decoded['role'] !== 'string'
      ) {
        throw new Error('Invalid token payload shape');
      }

      const role = decoded['role'] as string;
      if (role !== 'owner' && role !== 'admin' && role !== 'member') {
        throw new Error('Invalid role in token');
      }

      return {
        id: decoded['id'] as string,
        email: decoded['email'] as string,
        name: decoded['name'] as string,
        orgId: decoded['orgId'] as string,
        role,
      };
    } catch {
      throw new Error('Failed to decode development token');
    }
  }

  // Production: validate with Better Auth
  // TODO: Replace with Better Auth session verification once the auth package is ready
  throw new Error('Production auth not yet configured');
}

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
