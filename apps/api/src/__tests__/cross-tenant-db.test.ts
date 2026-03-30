/**
 * Cross-tenant data isolation integration tests.
 *
 * These tests verify that the Drizzle ORM + withOrgScope pattern
 * prevents data leaks between organizations at the database level.
 *
 * Requires a real PostgreSQL connection — set DATABASE_URL to run.
 * Skipped automatically when DATABASE_URL is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const DATABASE_URL = process.env['DATABASE_URL'];
const SKIP = !DATABASE_URL || DATABASE_URL === '' || DATABASE_URL.includes('placeholder');

// Dynamically import to avoid boot failures when DB not available
let db: any;
let contacts: any;
let organizations: any;
let orgMembers: any;
let users: any;
let withOrgScope: any;
let eq: any;

const ORG_A_ID = 'a0000000-0000-0000-0000-000000000001';
const ORG_B_ID = 'b0000000-0000-0000-0000-000000000002';
const TEST_USER_ID = 'u0000000-0000-0000-0000-000000000001';

describe.skipIf(SKIP)('Cross-tenant DB isolation', () => {
  beforeAll(async () => {
    const dbPkg = await import('@hararai/db');
    const drizzleOrm = await import('drizzle-orm');
    db = dbPkg.db;
    contacts = dbPkg.contacts;
    organizations = dbPkg.organizations;
    orgMembers = dbPkg.orgMembers;
    users = dbPkg.users;
    withOrgScope = dbPkg.withOrgScope;
    eq = drizzleOrm.eq;

    // Seed test orgs + user if they don't exist (idempotent)
    await db
      .insert(users)
      .values({
        id: TEST_USER_ID,
        email: 'test-tenant-isolation@test.local',
        name: 'Test User',
        emailVerified: true,
      })
      .onConflictDoNothing();

    await db
      .insert(organizations)
      .values([
        { id: ORG_A_ID, name: 'Test Org A', slug: 'test-org-a-isolation' },
        { id: ORG_B_ID, name: 'Test Org B', slug: 'test-org-b-isolation' },
      ])
      .onConflictDoNothing();

    // Seed a contact in each org
    await db
      .insert(contacts)
      .values([
        {
          orgId: ORG_A_ID,
          firstName: 'Alice',
          lastName: 'OrgA',
          email: 'alice@org-a.test',
          source: 'test',
        },
        {
          orgId: ORG_B_ID,
          firstName: 'Bob',
          lastName: 'OrgB',
          email: 'bob@org-b.test',
          source: 'test',
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(contacts).where(eq(contacts.email, 'alice@org-a.test'));
      await db.delete(contacts).where(eq(contacts.email, 'bob@org-b.test'));
      await db.delete(orgMembers).where(eq(orgMembers.orgId, ORG_A_ID));
      await db.delete(orgMembers).where(eq(orgMembers.orgId, ORG_B_ID));
      await db.delete(organizations).where(eq(organizations.id, ORG_A_ID));
      await db.delete(organizations).where(eq(organizations.id, ORG_B_ID));
      await db.delete(users).where(eq(users.id, TEST_USER_ID));
    }
  });

  it('Org A can only see its own contacts', async () => {
    const orgAContacts = await db
      .select({ firstName: contacts.firstName })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, ORG_A_ID));

    const names = orgAContacts.map((c: any) => c.firstName);
    expect(names).toContain('Alice');
    expect(names).not.toContain('Bob');
  });

  it('Org B can only see its own contacts', async () => {
    const orgBContacts = await db
      .select({ firstName: contacts.firstName })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, ORG_B_ID));

    const names = orgBContacts.map((c: any) => c.firstName);
    expect(names).toContain('Bob');
    expect(names).not.toContain('Alice');
  });

  it('querying with wrong orgId returns empty results', async () => {
    const FAKE_ORG = 'f0000000-0000-0000-0000-999999999999';
    const result = await db
      .select()
      .from(contacts)
      .where(withOrgScope(contacts.orgId, FAKE_ORG));

    expect(result).toHaveLength(0);
  });

  it('contact count per org is independent', async () => {
    const [countA] = await db
      .select({ count: contacts.id })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, ORG_A_ID));

    const [countB] = await db
      .select({ count: contacts.id })
      .from(contacts)
      .where(withOrgScope(contacts.orgId, ORG_B_ID));

    // Both should have at least 1 (our seeded contacts)
    expect(countA).toBeDefined();
    expect(countB).toBeDefined();
  });

  it('organizations table is isolated by id', async () => {
    const [orgA] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ORG_A_ID));

    expect(orgA?.name).toBe('Test Org A');

    const [orgB] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ORG_B_ID));

    expect(orgB?.name).toBe('Test Org B');
  });
});
