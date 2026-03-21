import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  getMe,
  AuthError,
} from '../services/auth-service.js';

const auth = new Hono();

// ── Validation Schemas ──

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  vertical: z.enum([
    'plumbing',
    'hvac',
    'electrical',
    'roofing',
    'landscaping',
    'pest_control',
    'cleaning',
    'general_contractor',
  ], { message: 'Invalid business vertical' }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Routes ──

/**
 * POST /auth/register — register a new user and create their org
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return c.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', status: 422, details: errors },
        422,
      );
    }

    const result = await register(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name,
      parsed.data.businessName,
      parsed.data.vertical,
    );

    return c.json({ data: result }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500,
      );
    }
    throw err;
  }
});

/**
 * POST /auth/login — authenticate and return JWT
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return c.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', status: 422, details: errors },
        422,
      );
    }

    const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
    const userAgent = c.req.header('user-agent');

    const result = await login(
      parsed.data.email,
      parsed.data.password,
      ipAddress,
      userAgent,
    );

    return c.json({ data: result });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500,
      );
    }
    throw err;
  }
});

/**
 * POST /auth/logout — invalidate the current session
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const token = c.get('token');
    await logout(token);
    return c.json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500,
      );
    }
    throw err;
  }
});

/**
 * GET /auth/me — get the current authenticated user
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const result = await getMe(user.id);
    return c.json({ data: result });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500,
      );
    }
    throw err;
  }
});

export { auth as authRoutes };
