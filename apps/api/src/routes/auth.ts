import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  getMe,
  loginOrCreateWithGoogle,
  verifyEmail,
  resendVerificationEmail,
  AuthError,
} from '../services/auth-service.js';
import { config } from '../config.js';
import { rateLimit } from '../middleware/rate-limit.js';

const auth = new Hono();

// Rate limiting: prevent brute force attacks
const loginLimiter = rateLimit(5, 60 * 1000);    // 5 attempts per minute
const registerLimiter = rateLimit(3, 60 * 1000);  // 3 attempts per minute
const resetLimiter = rateLimit(3, 60 * 1000);     // 3 attempts per minute
const resendVerificationLimiter = rateLimit(1, 60 * 1000); // 1 per minute

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

const verifyEmailSchema = z.object({
  token: z.string().uuid('Invalid verification token'),
});

// ── Routes ──

/**
 * POST /auth/register — register a new user and create their org
 */
auth.post('/register', registerLimiter, async (c) => {
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
auth.post('/login', loginLimiter, async (c) => {
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
auth.post('/forgot-password', resetLimiter, async (c) => {
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
      const { db, users } = await import('@hararai/db');
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
      const { passwordResetTokens: resetTokensTable } = await import('@hararai/db');
      await db.insert(resetTokensTable).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send email
      const frontendUrl = config.CORS_ORIGIN || 'https://app.hararai.com';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      try {
        const { ResendProvider, passwordResetHtml } = await import('@hararai/email');
        const emailProvider = new ResendProvider({
          apiKey: config.RESEND_API_KEY,
          defaultFrom: config.RESEND_DEFAULT_FROM,
        });
        await emailProvider.sendEmail(
          undefined,
          user.email,
          'Reset Your Password — HararAI',
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
    const { db, users, passwordResetTokens: resetTokensTable } = await import('@hararai/db');
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

/**
 * GET /auth/verify-email?token=<token> — verify email address
 * Redirects to the login page with ?verified=true on success.
 */
auth.get('/verify-email', async (c) => {
  try {
    const tokenParam = c.req.query('token');
    const parsed = verifyEmailSchema.safeParse({ token: tokenParam });

    if (!parsed.success) {
      const frontendUrl = config.CORS_ORIGIN || 'https://app.hararai.com';
      return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Invalid verification link')}`);
    }

    const redirectUrl = await verifyEmail(parsed.data.token);
    return c.redirect(redirectUrl);
  } catch (err) {
    const frontendUrl = config.CORS_ORIGIN || 'https://app.hararai.com';
    if (err instanceof AuthError) {
      return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Verification failed. Please try again.')}`);
  }
});

/**
 * POST /auth/resend-verification — resend verification email
 * Requires authentication. Rate limited to 1 per 60 seconds.
 */
auth.post('/resend-verification', authMiddleware, resendVerificationLimiter, async (c) => {
  try {
    const user = c.get('user');
    await resendVerificationEmail(user.id);
    return c.json({ data: { message: 'Verification email sent. Please check your inbox.' } });
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

// ── Google OAuth ──

/**
 * GET /auth/google — redirect to Google consent screen
 */
auth.get('/google', (c) => {
  const clientId = config.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth not configured', code: 'NOT_CONFIGURED', status: 501 }, 501);
  }

  const redirectUri = `${config.APP_URL}/auth/google/callback`;
  const scope = encodeURIComponent('openid email profile');
  const state = crypto.randomUUID();

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

  return c.redirect(url);
});

/**
 * GET /auth/google/callback — exchange code for tokens, log user in
 */
auth.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code');
    if (!code) {
      return c.json({ error: 'Missing authorization code', code: 'BAD_REQUEST', status: 400 }, 400);
    }

    const redirectUri = `${config.APP_URL}/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new AuthError(`Google token exchange failed: ${err}`, 'OAUTH_ERROR', 502);
    }

    const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string; refresh_token?: string };

    // Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      throw new AuthError('Failed to fetch Google profile', 'OAUTH_ERROR', 502);
    }

    const profile = (await profileRes.json()) as { id: string; email: string; name: string; picture?: string };

    const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
    const userAgent = c.req.header('user-agent');

    const result = await loginOrCreateWithGoogle(
      { email: profile.email, name: profile.name, googleId: profile.id, avatarUrl: profile.picture },
      ipAddress,
      userAgent,
    );

    // Redirect to frontend with token
    const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
    return c.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
  } catch (err) {
    if (err instanceof AuthError) {
      const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
      return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
    const frontendUrl = config.CORS_ORIGIN || 'http://localhost:3000';
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Google sign-in failed. Please try again.')}`);
  }
});

export { auth as authRoutes };
