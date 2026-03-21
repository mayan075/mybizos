import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, users, sessions, organizations, orgMembers } from '@mybizos/db';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export interface JwtPayload {
  userId: string;
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
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
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function register(
  email: string,
  password: string,
  name: string,
  businessName: string,
  vertical: string,
): Promise<AuthResult> {
  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AuthError('An account with this email already exists', 'CONFLICT', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
      emailVerified: false,
      isActive: true,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  if (!newUser) {
    throw new AuthError('Failed to create user', 'INTERNAL_ERROR', 500);
  }

  // Create organization
  const slug = generateSlug(businessName);
  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: businessName,
      slug: `${slug}-${newUser.id.slice(0, 8)}`,
      vertical: vertical as 'plumbing' | 'hvac' | 'electrical' | 'roofing' | 'landscaping' | 'pest_control' | 'cleaning' | 'general_contractor',
    })
    .returning({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      vertical: organizations.vertical,
    });

  if (!newOrg) {
    throw new AuthError('Failed to create organization', 'INTERNAL_ERROR', 500);
  }

  // Create org membership (owner)
  await db.insert(orgMembers).values({
    orgId: newOrg.id,
    userId: newUser.id,
    role: 'owner',
    isActive: true,
  });

  // Generate JWT
  const token = generateToken({
    userId: newUser.id,
    orgId: newOrg.id,
    email: newUser.email,
    role: 'owner',
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(sessions).values({
    userId: newUser.id,
    token,
    expiresAt,
  });

  logger.info('User registered', { userId: newUser.id, orgId: newOrg.id });

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: 'owner',
    },
    org: {
      id: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      vertical: newOrg.vertical,
    },
    token,
  };
}

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  // Find user by email
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
  }

  if (!user.isActive) {
    throw new AuthError('Account is deactivated', 'FORBIDDEN', 403);
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('Invalid email or password', 'UNAUTHORIZED', 401);
  }

  // Find org membership
  const [membership] = await db
    .select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new AuthError('User has no organization membership', 'FORBIDDEN', 403);
  }

  // Get org details
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      vertical: organizations.vertical,
    })
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  if (!org) {
    throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);
  }

  // Generate JWT
  const token = generateToken({
    userId: user.id,
    orgId: org.id,
    email: user.email,
    role: membership.role,
  });

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  logger.info('User logged in', { userId: user.id });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
    },
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      vertical: org.vertical,
    },
    token,
  };
}

export async function logout(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
  logger.info('Session invalidated');
}

export async function getMe(userId: string): Promise<{
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: 'owner' | 'admin' | 'manager' | 'member';
  };
  org: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
  };
}> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AuthError('User not found', 'NOT_FOUND', 404);
  }

  const [membership] = await db
    .select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  if (!membership) {
    throw new AuthError('User has no organization', 'NOT_FOUND', 404);
  }

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      vertical: organizations.vertical,
    })
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  if (!org) {
    throw new AuthError('Organization not found', 'INTERNAL_ERROR', 500);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: membership.role,
    },
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      vertical: org.vertical,
    },
  };
}

export function validateToken(token: string): JwtPayload {
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
