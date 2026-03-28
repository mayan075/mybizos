import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const TOKEN_EXPIRY = '7d';

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
  };
  org: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
  };
  token: string;
}

function generateToken(payload: JwtPayload): string {
  const secret = config.JWT_SECRET || 'dev-jwt-secret-change-in-production-must-be-32-chars';
  return jwt.sign(payload, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
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
  vertical: string,
): Promise<AuthResult> {
  try {
    const { db, users, sessions, organizations, orgMembers } = await import('@mybizos/db');
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

    const [newUser] = await db
      .insert(users)
      .values({ email, passwordHash, name, emailVerified: false, isActive: true })
      .returning({ id: users.id, email: users.email, name: users.name });

    if (!newUser) throw new AuthError('Failed to create user', 'INTERNAL_ERROR', 500);

    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: businessName,
        slug: `${slug}-${newUser.id.slice(0, 8)}`,
        vertical: vertical as 'plumbing' | 'hvac',
      })
      .returning({ id: organizations.id, name: organizations.name, slug: organizations.slug, vertical: organizations.vertical });

    if (!newOrg) throw new AuthError('Failed to create organization', 'INTERNAL_ERROR', 500);

    await db.insert(orgMembers).values({ orgId: newOrg.id, userId: newUser.id, role: 'owner', isActive: true });

    const token = generateToken({ userId: newUser.id, orgId: newOrg.id, email: newUser.email, role: 'owner', name: newUser.name, orgName: newOrg.name });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: newUser.id, token, expiresAt });

    logger.info('User registered via REAL DATABASE', { userId: newUser.id, orgId: newOrg.id });
    return { user: { id: newUser.id, email: newUser.email, name: newUser.name, role: 'owner' }, org: { id: newOrg.id, name: newOrg.name, slug: newOrg.slug, vertical: newOrg.vertical }, token };
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
    const { db, users, sessions, organizations, orgMembers } = await import('@mybizos/db');
    const bcrypt = await import('bcryptjs');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
    if (!user.isActive) throw new AuthError('Account is deactivated', 'FORBIDDEN', 403);

    const isValid = await bcrypt.compare(_password, user.passwordHash);
    if (!isValid) throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, user.id)).limit(1);
    if (!membership) throw new AuthError('User has no organization membership', 'FORBIDDEN', 403);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, vertical: organizations.vertical }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    const token = generateToken({ userId: user.id, orgId: org.id, email: user.email, role: membership.role, name: user.name, orgName: org.name });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: user.id, token, expiresAt, ipAddress: _ipAddress ?? null, userAgent: _userAgent ?? null });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    logger.info('User logged in via REAL DATABASE', { userId: user.id, orgId: org.id });
    return { user: { id: user.id, email: user.email, name: user.name, role: membership.role }, org: { id: org.id, name: org.name, slug: org.slug, vertical: org.vertical }, token };
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
    const { db, sessions } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');
    await db.delete(sessions).where(eq(sessions.token, _token));
  } catch {
    // DB not available — just log
  }
  logger.info('Session invalidated');
}

export async function getMe(_userId: string): Promise<{
  user: { id: string; email: string; name: string; avatarUrl: string | null; role: 'owner' | 'admin' | 'manager' | 'member' };
  org: { id: string; name: string; slug: string; vertical: string };
}> {
  try {
    const { db, users, organizations, orgMembers } = await import('@mybizos/db');
    const { eq } = await import('drizzle-orm');

    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, _userId)).limit(1);
    if (!user) throw new AuthError('User not found', 'NOT_FOUND', 404);

    const [membership] = await db.select({ orgId: orgMembers.orgId, role: orgMembers.role }).from(orgMembers).where(eq(orgMembers.userId, _userId)).limit(1);
    if (!membership) throw new AuthError('User has no organization', 'NOT_FOUND', 404);

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, vertical: organizations.vertical }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
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
    const { db, users, sessions, organizations, orgMembers, accounts } = await import('@mybizos/db');
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
            vertical: 'other' as 'plumbing',
          })
          .returning({ id: organizations.id, name: organizations.name, slug: organizations.slug, vertical: organizations.vertical });

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

    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, vertical: organizations.vertical }).from(organizations).where(eq(organizations.id, membership.orgId)).limit(1);
    if (!org) throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);

    const token = generateToken({ userId: user.id, orgId: org.id, email: user.email, role: membership.role, name: user.name, orgName: org.name });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId: user.id, token, expiresAt, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    logger.info('User logged in via Google OAuth', { userId: user.id, orgId: org.id });
    return { user: { id: user.id, email: user.email, name: user.name, role: membership.role }, org: { id: org.id, name: org.name, slug: org.slug, vertical: org.vertical }, token };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    logger.error('Google OAuth login failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AuthError('Service temporarily unavailable. Please try again.', 'SERVICE_UNAVAILABLE', 503);
  }
}

export function validateToken(token: string): JwtPayload {
  const secret = config.JWT_SECRET || 'dev-jwt-secret-change-in-production-must-be-32-chars';
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
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
