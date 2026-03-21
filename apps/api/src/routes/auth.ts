import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../middleware/logger.js';

const auth = new Hono();

// ── Validation Schemas ──

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  orgName: z.string().min(1, 'Organization name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Mock auth store (replaced by Better Auth when ready) ──

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

const mockUsers: StoredUser[] = [
  {
    id: 'usr_01',
    email: 'demo@mybizos.com',
    name: 'Demo Owner',
    passwordHash: 'hashed_password_123',
    orgId: 'org_01',
    role: 'owner',
  },
];

const mockOrgs = [
  {
    id: 'org_01',
    name: 'Acme HVAC & Plumbing',
    slug: 'acme-hvac',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

function generateMockToken(user: StoredUser): string {
  return Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      role: user.role,
    }),
  ).toString('base64');
}

// ── Routes ──

/**
 * POST /auth/register — register a new user and create their org
 */
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.parse(body);

  // Check for duplicate email
  const existing = mockUsers.find((u) => u.email === parsed.email);
  if (existing) {
    return c.json(
      { error: 'An account with this email already exists', code: 'CONFLICT', status: 409 },
      409,
    );
  }

  // Create org
  const orgId = `org_${Date.now()}`;
  const org = {
    id: orgId,
    name: parsed.orgName,
    slug: parsed.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    createdAt: new Date().toISOString(),
  };
  mockOrgs.push(org);

  // Create user
  const user: StoredUser = {
    id: `usr_${Date.now()}`,
    email: parsed.email,
    name: parsed.name,
    passwordHash: `hashed_${parsed.password}`,
    orgId,
    role: 'owner',
  };
  mockUsers.push(user);

  const token = generateMockToken(user);

  logger.info('User registered', { userId: user.id, orgId });

  return c.json(
    {
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        org: { id: org.id, name: org.name, slug: org.slug },
        token,
      },
    },
    201,
  );
});

/**
 * POST /auth/login — authenticate and return JWT
 */
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.parse(body);

  const user = mockUsers.find((u) => u.email === parsed.email);
  if (!user) {
    return c.json(
      { error: 'Invalid email or password', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  // Mock password verification
  if (user.passwordHash !== `hashed_${parsed.password}`) {
    return c.json(
      { error: 'Invalid email or password', code: 'UNAUTHORIZED', status: 401 },
      401,
    );
  }

  const token = generateMockToken(user);

  logger.info('User logged in', { userId: user.id });

  return c.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
  });
});

/**
 * POST /auth/logout — invalidate the current session
 */
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  logger.info('User logged out', { userId: user.id });

  // In production, this will invalidate the Better Auth session/token
  return c.json({ data: { message: 'Logged out successfully' } });
});

/**
 * GET /auth/me — get the current authenticated user
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const org = mockOrgs.find((o) => o.id === user.orgId);

  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      org: org
        ? { id: org.id, name: org.name, slug: org.slug }
        : null,
    },
  });
});

export { auth as authRoutes };
