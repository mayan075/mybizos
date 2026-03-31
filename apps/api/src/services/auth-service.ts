import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 30;

export interface JwtPayload {
  userId: string;
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  name?: string;
  orgName?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'manager' | 'member';
    emailVerified: boolean;
  };
  org: {
    id: string;
    name: string;
    slug: string;
    industry: string;
  };
  token: string;
  refreshToken: string;
}

export function generateToken(payload: JwtPayload, expiresIn?: string): string {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured — refusing to sign tokens');
  }
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: (expiresIn ?? ACCESS_TOKEN_EXPIRY) as unknown as number,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomBytes(32).toString('hex');
}

function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
  return expiresAt;
}

/**
 * Register a new user with a new organization.
 * Requires a working database — returns 503 if DB is unavailable.
 */
export async function register(
  email: string,
  _password: string,
  name: string,
  businessName: string,
  industry: string,
  industryCategory?: string,
): Promise<AuthResult> {
  try {
    const { db, users, sessions, organizations, orgMembers } = await import('@hararai/db');
    const bcrypt = await import('bcryptjs');
    const { eq } = await import('drizzle-orm');

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new AuthError('An account with this email already exists', 'CONFLICT', 409);
    }

    const passwordHash = await bcrypt.hash(_password, 12);

    // Generate email verification token
    const verificationToken = crypto.randomUUID();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Determine if we should auto-verify (dev mode without Resend key)
    const hasResendKey = Boolean(config.RESEND_API_KEY);
    const autoVerify = !hasResendKey;

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        emailVerified: autoVerify,
        emailVerificationToken: autoVerify ? null : verificationToken,
        emailVerificationExpiry: autoVerify ? null : verificationExpiry,
        isActive: true,
      })
      .returning({ id: users.id, email: users.email, name: users.name, emailVerified: users.emailVerified });

    if (!newUser) throw new AuthError('Failed to create user', 'INTERNAL_ERROR', 500);

    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: businessName,
        slug: `${slug}-${newUser.id.slice(0, 8)}`,
        industry,
        industryCategory: industryCategory ?? null,
      })
      .returning({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry });

    if (!newOrg) throw new AuthError('Failed to create organization', 'INTERNAL_ERROR', 500);

    await db.insert(orgMembers).values({ orgId: newOrg.id, userId: newUser.id, role: 'owner', isActive: true });

    // Send verification email if Resend is configured
    if (!autoVerify) {
      try {
        const verifyUrl = `${config.APP_URL}/auth/verify-email?token=${verificationToken}`;
        const { ResendProvider, emailVerificationHtml } = await import('@hararai/email');
        const emailProvider = new ResendProvider({
          apiKey: config.RESEND_API_KEY,
          defaultFrom: config.RESEND_DEFAULT_FROM,
        });
        await emailProvider.sendEmail(
          undefined,
          email,
          'Verify Your Email — HararAI',
          emailVerificationHtml(verifyUrl),
          undefined,
          'email-verification',
        );
        logger.info('Verification email sent', { userId: newUser.id, email });
      } catch (emailErr) {
        // Email sending failed — don't block registration
        logger.error('Failed to send verification email', {
          userId: newUser.id,
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
      }
    } else {
      logger.info('Auto-verified email (Resend not configured)', { userId: newUser.id });
    }

    const token = generateToken({ userId: newUser.id, orgId: newOrg.id, email: newUser.email, role: 'owner', name: newUser.name, orgName: newOrg.name });
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = getRefreshTokenExpiry();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: newUser.id, token, refreshToken, refreshTokenExpiresAt, expiresAt });

    logger.info('User registered via REAL DATABASE', { userId: newUser.id, orgId: newOrg.id });
    return { user: { id: newUser.id, email: newUser.email, name: newUser.name, role: 'owner', emailVerified: newUser.emailVerified }, org: { id: newOrg.id, name: newOrg.name, slug: newOrg.slug, industry: newOrg.industry }, token, refreshToken };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Database unavailable for registration', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Authenticate user with email and password.
 * Requires a working database — returns 503 if DB is unavailable.
 */
export async function login(
  email: string,
  _password: string,
  _ipAddress?: string,
  _userAgent?: string,
): Promise<AuthResult> {
  try {
    const { db, users, sessions, organizations, orgMembers } = await import('@hararai/db');
    const bcrypt = await import('bcryptjs');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash, isActive: users.isActive, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
    if (!user.isActive) throw new AuthError('Account is deactivated', 'FORBIDDEN', 403);
    if (!user.passwordHash) throw new AuthError('This account uses Google sign-in. Please sign in with Google.', 'OAUTH_ONLY', 401);

    const isValid = await bcrypt.compare(_password, user.passwordHash);
    if (!isValid) throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, user.id)).limit(1);
    if (!membership) throw new AuthError('User has no organization membership', 'FORBIDDEN', 403);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    const token = generateToken({ userId: user.id, orgId: org.id, email: user.email, role: membership.role, name: user.name, orgName: org.name });
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = getRefreshTokenExpiry();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: user.id, token, refreshToken, refreshTokenExpiresAt, expiresAt, ipAddress: _ipAddress ?? null, userAgent: _userAgent ?? null });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    logger.info('User logged in via REAL DATABASE', { userId: user.id, orgId: org.id });
    return { user: { id: user.id, email: user.email, name: user.name, role: membership.role, emailVerified: user.emailVerified }, org: { id: org.id, name: org.name, slug: org.slug, industry: org.industry }, token, refreshToken };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Database unavailable for login', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

export async function logout(_token: string): Promise<void> {
  try {
    const { db, sessions } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');
    await db.delete(sessions).where(eq(sessions.token, _token));
  } catch {
    // DB not available — just log
  }
  logger.info('Session invalidated');
}

export async function getMe(_userId: string): Promise<{
  user: { id: string; email: string; name: string; avatarUrl: string | null; emailVerified: boolean; role: 'owner' | 'admin' | 'manager' | 'member' };
  org: { id: string; name: string; slug: string; industry: string };
}> {
  try {
    const { db, users, organizations, orgMembers } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, emailVerified: users.emailVerified }).from(users).where(eq(users.id, _userId)).limit(1);
    if (!user) throw new AuthError('User not found', 'NOT_FOUND', 404);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, _userId)).limit(1);
    if (!membership) throw new AuthError('User has no organization', 'NOT_FOUND', 404);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    return { user: { ...user, role: membership.role }, org };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Database unavailable for getMe', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Login or register a user via Google OAuth.
 * If the user already has an account (by email), link the Google account and log them in.
 * If not, create a new user + org.
 */
export async function loginOrCreateWithGoogle(
  googleProfile: { email: string; name: string; googleId: string; avatarUrl?: string },
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  try {
    const { db, users, sessions, organizations, orgMembers, accounts } = await import('@hararai/db');
    const { eq, and } = await import('drizzle-orm');

    // Check if this Google account is already linked
    const [existingAccount] = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, googleProfile.googleId)))
      .limit(1);

    let userId: string;

    if (existingAccount) {
      // Existing Google link — just log them in
      userId = existingAccount.userId;
    } else {
      // Check if a user with this email already exists (registered with password)
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, googleProfile.email))
        .limit(1);

      if (existingUser) {
        // Link Google to existing account
        userId = existingUser.id;
        await db.insert(accounts).values({
          userId,
          provider: 'google',
          providerAccountId: googleProfile.googleId,
        });
        // Update avatar if they don't have one
        if (googleProfile.avatarUrl) {
          await db
            .update(users)
            .set({ avatarUrl: googleProfile.avatarUrl, emailVerified: true, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
      } else {
        // Brand new user — create user + org
        const [newUser] = await db
          .insert(users)
          .values({
            email: googleProfile.email,
            passwordHash: null,
            name: googleProfile.name,
            avatarUrl: googleProfile.avatarUrl ?? null,
            emailVerified: true,
            isActive: true,
          })
          .returning({ id: users.id, email: users.email, name: users.name });

        if (!newUser) throw new AuthError('Failed to create user', 'INTERNAL_ERROR', 500);
        userId = newUser.id;

        // Link Google account
        await db.insert(accounts).values({
          userId,
          provider: 'google',
          providerAccountId: googleProfile.googleId,
        });

        // Create a default org (they'll set the real name during onboarding)
        const slug = googleProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const [newOrg] = await db
          .insert(organizations)
          .values({
            name: `${googleProfile.name}'s Business`,
            slug: `${slug}-${userId.slice(0, 8)}`,
            industry: 'other',
          })
          .returning({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry });

        if (!newOrg) throw new AuthError('Failed to create organization', 'INTERNAL_ERROR', 500);

        await db.insert(orgMembers).values({ orgId: newOrg.id, userId, role: 'owner', isActive: true });
      }
    }

    // Fetch user + org for JWT
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new AuthError('User not found', 'INTERNAL_ERROR', 500);
    if (!user.isActive) throw new AuthError('Account is deactivated', 'FORBIDDEN', 403);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, userId)).limit(1);
    if (!membership) throw new AuthError('User has no organization membership', 'FORBIDDEN', 403);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    const token = generateToken({ userId: user.id, orgId: org.id, email: user.email, role: membership.role, name: user.name, orgName: org.name });
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = getRefreshTokenExpiry();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: user.id, token, refreshToken, refreshTokenExpiresAt, expiresAt, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    logger.info('User logged in via Google OAuth', { userId: user.id, orgId: org.id });
    return { user: { id: user.id, email: user.email, name: user.name, role: membership.role, emailVerified: true }, org: { id: org.id, name: org.name, slug: org.slug, industry: org.industry }, token, refreshToken };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Google OAuth login failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Verify an email address using a verification token.
 * Returns the redirect URL for the frontend.
 */
export async function verifyEmail(verificationToken: string): Promise<string> {
  try {
    const { db, users } = await import('@hararai/db');
    const { eq, and, gte } = await import('drizzle-orm');

    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.emailVerificationToken, verificationToken))
      .limit(1);

    if (!user) {
      throw new AuthError('Invalid or expired verification token', 'INVALID_TOKEN', 400);
    }

    // Check if already verified
    if (user.emailVerified) {
      const frontendUrl = config.CORS_ORIGIN || 'https://app.hararai.com';
      return `${frontendUrl}/login?verified=true`;
    }

    // Check expiry by querying with expiry condition
    const [validUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, verificationToken),
          gte(users.emailVerificationExpiry, new Date()),
        ),
      )
      .limit(1);

    if (!validUser) {
      throw new AuthError('Verification link has expired. Please request a new one.', 'TOKEN_EXPIRED', 400);
    }

    // Mark email as verified and clear the token
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    const frontendUrl = config.CORS_ORIGIN || 'https://app.hararai.com';
    return `${frontendUrl}/login?verified=true`;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Email verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Resend verification email for the given user.
 * Rate limited to 1 per 60 seconds (enforced at route level).
 */
export async function resendVerificationEmail(userId: string): Promise<void> {
  try {
    const { db, users } = await import('@hararai/db');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AuthError('User not found', 'NOT_FOUND', 404);
    }

    if (user.emailVerified) {
      throw new AuthError('Email is already verified', 'ALREADY_VERIFIED', 400);
    }

    if (!config.RESEND_API_KEY) {
      // Auto-verify in dev mode
      await db
        .update(users)
        .set({ emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
      logger.info('Auto-verified email (Resend not configured)', { userId });
      return;
    }

    // Generate new token
    const newToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db
      .update(users)
      .set({
        emailVerificationToken: newToken,
        emailVerificationExpiry: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send email
    const verifyUrl = `${config.APP_URL}/auth/verify-email?token=${newToken}`;
    const { ResendProvider, emailVerificationHtml } = await import('@hararai/email');
    const emailProvider = new ResendProvider({
      apiKey: config.RESEND_API_KEY,
      defaultFrom: config.RESEND_DEFAULT_FROM,
    });
    await emailProvider.sendEmail(
      undefined,
      user.email,
      'Verify Your Email — HararAI',
      emailVerificationHtml(verifyUrl),
      undefined,
      'email-verification',
    );

    logger.info('Verification email resent', { userId, email: user.email });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Failed to resend verification email', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Refresh a session using a valid refresh token.
 * Issues a new access token + rotates the refresh token (old one invalidated).
 */
/**
 * Grace period (in seconds) during which the previous refresh token
 * is still accepted. This handles multi-tab race conditions: if tab A
 * rotates the token and tab B sends the old one a moment later, tab B
 * still succeeds within this window.
 */
const REFRESH_GRACE_PERIOD_SECONDS = 30;

export async function refreshSession(oldRefreshToken: string): Promise<AuthResult> {
  try {
    const { db, users, sessions, organizations, orgMembers } = await import('@hararai/db');
    const { eq, and, gte, or } = await import('drizzle-orm');

    const now = new Date();

    // Find session by current refresh token OR by previous token within grace period
    const [session] = await db
      .select({ id: sessions.id, userId: sessions.userId, refreshToken: sessions.refreshToken })
      .from(sessions)
      .where(
        or(
          // Current refresh token
          and(
            eq(sessions.refreshToken, oldRefreshToken),
            gte(sessions.refreshTokenExpiresAt, now),
          ),
          // Previous refresh token within grace period (multi-tab race)
          and(
            eq(sessions.previousRefreshToken, oldRefreshToken),
            gte(sessions.previousRefreshTokenExpiresAt, now),
          ),
        ),
      )
      .limit(1);

    if (!session) {
      throw new AuthError('Invalid or expired refresh token', 'REFRESH_TOKEN_EXPIRED', 401);
    }

    // If this was a grace-period hit (previous token), return the current token
    // without rotating again — another tab already rotated
    const isGraceHit = session.refreshToken !== oldRefreshToken;

    // Fetch user + membership + org
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) throw new AuthError('User not found', 'NOT_FOUND', 404);
    if (!user.isActive) throw new AuthError('Account is deactivated', 'FORBIDDEN', 403);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, user.id)).limit(1);
    if (!membership) throw new AuthError('User has no organization membership', 'FORBIDDEN', 403);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, industry: organizations.industry }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    // Issue new access token
    const newAccessToken = generateToken({ userId: user.id, orgId: org.id, email: user.email, role: membership.role, name: user.name, orgName: org.name });

    let newRefreshToken: string;

    if (isGraceHit) {
      // Grace period hit — reuse the current refresh token (don't rotate again)
      newRefreshToken = session.refreshToken as string;
    } else {
      // Normal rotation — generate new refresh token, keep old one as grace
      newRefreshToken = generateRefreshToken();
      const newRefreshTokenExpiresAt = getRefreshTokenExpiry();
      const graceExpiry = new Date(now.getTime() + REFRESH_GRACE_PERIOD_SECONDS * 1000);

      await db.update(sessions).set({
        token: newAccessToken,
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
        previousRefreshToken: oldRefreshToken,
        previousRefreshTokenExpiresAt: graceExpiry,
      }).where(eq(sessions.id, session.id));
    }

    logger.info('Session refreshed', { userId: user.id, sessionId: session.id, graceHit: isGraceHit });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: membership.role, emailVerified: user.emailVerified },
      org: { id: org.id, name: org.name, slug: org.slug, industry: org.industry },
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Session refresh failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Revoke all sessions for a user (e.g., "log out everywhere").
 * Keeps the current session if currentSessionToken is provided.
 */
export async function revokeAllSessions(userId: string, keepSessionToken?: string): Promise<number> {
  try {
    const { db, sessions } = await import('@hararai/db');
    const { eq, and, ne } = await import('drizzle-orm');

    const condition = keepSessionToken
      ? and(eq(sessions.userId, userId), ne(sessions.token, keepSessionToken))
      : eq(sessions.userId, userId);

    const result = await db.delete(sessions).where(condition).returning({ id: sessions.id });
    const count = result.length;
    logger.info('Revoked sessions for user', { userId, count, keptCurrent: Boolean(keepSessionToken) });
    return count;
  } catch (err) {
    logger.error('Failed to revoke sessions', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Delete sessions whose refresh tokens have expired.
 * Call this periodically (e.g., once per hour) to keep the table clean.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { db, sessions } = await import('@hararai/db');
    const { lt, isNull, or, and } = await import('drizzle-orm');

    const now = new Date();
    const result = await db.delete(sessions).where(
      or(
        // Refresh token expired
        lt(sessions.refreshTokenExpiresAt, now),
        // Legacy sessions (no refresh token) that have passed their original expiresAt
        and(isNull(sessions.refreshToken), lt(sessions.expiresAt, now)),
      ),
    ).returning({ id: sessions.id });

    const count = result.length;
    if (count > 0) {
      logger.info('Cleaned up expired sessions', { count });
    }
    return count;
  } catch (err) {
    logger.error('Session cleanup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

export function validateToken(token: string): JwtPayload {
  if (!config.JWT_SECRET) {
    throw new AuthError('JWT_SECRET is not configured', 'SERVER_ERROR', 500);
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    throw new AuthError('Invalid or expired token', 'UNAUTHORIZED', 401);
  }
}

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}
