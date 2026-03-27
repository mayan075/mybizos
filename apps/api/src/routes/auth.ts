import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  getMe,
  AuthError,
} from '../services/auth-service.js';
import { config } from '../config.js';

const auth = new Hono();

// Password reset tokens are stored in the database (password_reset_tokens table)
// to survive Railway redeploys and scale across instances.

// ── Validation Schemas ──

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  vertical: z.enum([
    'rubbish_removals',
    'moving_company',
    'plumbing',
    'hvac',
    'electrical',
    'roofing',
    'landscaping',
    'pest_control',
    'cleaning',
    'general_contractor',
    'salon_spa',
    'dental',
    'auto_repair',
    'real_estate',
    'other',
  ], { message: 'Invalid business vertical' }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
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
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
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
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
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
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
      );
    }
    throw err;
  }
});

/**
 * POST /auth/forgot-password — send a password reset email
 */
auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

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

    // Always return the same success response regardless of whether user exists
    const successResponse = { data: { message: 'If an account exists, a reset link has been sent.' } };

    try {
      const { db, users } = await import('@mybizos/db');
      const { eq } = await import('drizzle-orm');

      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);

      if (!user) {
        // User not found — still return success (don't reveal if email exists)
        return c.json(successResponse);
      }

      // Generate token and store in database
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const { passwordResetTokens: resetTokensTable } = await import('@mybizos/db');
      await db.insert(resetTokensTable).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send email
      const frontendUrl = config.CORS_ORIGIN || 'https://mybizos.vercel.app';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      try {
        const { ResendProvider, passwordResetHtml } = await import('@mybizos/email');
        const emailProvider = new ResendProvider({
          apiKey: config.RESEND_API_KEY,
          defaultFrom: config.RESEND_DEFAULT_FROM,
        });
        await emailProvider.sendEmail(
          undefined,
          user.email,
          'Reset Your Password — MyBizOS',
          passwordResetHtml(resetUrl),
          undefined,
          'password-reset',
        );
      } catch {
        // If email sending fails, still return success to not leak info
        // Token is still stored so if email eventually arrives it will work
      }
    } catch {
      // DB unavailable — return success anyway (don't reveal system state)
    }

    return c.json(successResponse);
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
      );
    }
    throw err;
  }
});

/**
 * POST /auth/reset-password — reset password using a valid token
 */
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);

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

    // Look up the token in the database
    const { db, users, passwordResetTokens: resetTokensTable } = await import('@mybizos/db');
    const { eq, and, isNull, gte } = await import('drizzle-orm');

    const [tokenRow] = await db
      .select()
      .from(resetTokensTable)
      .where(
        and(
          eq(resetTokensTable.token, parsed.data.token),
          isNull(resetTokensTable.usedAt),
          gte(resetTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!tokenRow) {
      return c.json(
        { error: 'Invalid or expired reset token', code: 'INVALID_TOKEN', status: 400 },
        400,
      );
    }

    // Hash the new password and update the user
    const bcrypt = await import('bcryptjs');

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, tokenRow.userId));

    // Mark the token as used (not deleted, for audit trail)
    await db
      .update(resetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(resetTokensTable.id, tokenRow.id));

    return c.json({ data: { message: 'Password has been reset successfully.' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(
        { error: err.message, code: err.code, status: err.status },
        err.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
      );
    }
    throw err;
  }
});

export { auth as authRoutes };
