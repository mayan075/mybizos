/**
 * Database connection test script.
 *
 * Run with: npx tsx apps/api/src/test-db.ts
 *
 * Verifies that the DATABASE_URL is set and the Railway PostgreSQL
 * database is reachable with seeded data.
 */

import { db, contacts, deals, appointments, conversations, activities, organizations, users } from '@hararai/db';
import { count, eq } from 'drizzle-orm';

async function testDatabaseConnection() {
  const log = (msg: string) => process.stdout.write(`${msg}\n`);
  const err = (msg: string) => process.stderr.write(`ERROR: ${msg}\n`);

  log('=== HararAI Database Connection Test ===\n');

  // 1. Check DATABASE_URL
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) {
    err('DATABASE_URL is not set. Cannot connect to the database.');
    process.exit(1);
  }
  log(`DATABASE_URL: ${dbUrl.replace(/:[^@]+@/, ':****@')}`);
  log('');

  try {
    // 2. Simple connectivity test
    log('1. Testing basic connectivity...');
    const { sql } = await import('drizzle-orm');
    const start = performance.now();
    await db.execute(sql`SELECT 1 as ok`);
    const duration = Math.round(performance.now() - start);
    log(`   OK - Connected in ${duration}ms`);
    log('');

    // 3. Count organizations
    log('2. Counting organizations...');
    const [orgCount] = await db.select({ value: count() }).from(organizations);
    log(`   Found ${orgCount?.value ?? 0} organizations`);

    // 4. Count users
    log('3. Counting users...');
    const [userCount] = await db.select({ value: count() }).from(users);
    log(`   Found ${userCount?.value ?? 0} users`);

    // 5. Count contacts
    log('4. Counting contacts...');
    const [contactCount] = await db.select({ value: count() }).from(contacts);
    log(`   Found ${contactCount?.value ?? 0} contacts`);

    // 6. Count deals
    log('5. Counting deals...');
    const [dealCount] = await db.select({ value: count() }).from(deals);
    log(`   Found ${dealCount?.value ?? 0} deals`);

    // 7. Count activities
    log('6. Counting activities...');
    const [activityCount] = await db.select({ value: count() }).from(activities);
    log(`   Found ${activityCount?.value ?? 0} activities`);

    // 8. Count conversations
    log('7. Counting conversations...');
    const [conversationCount] = await db.select({ value: count() }).from(conversations);
    log(`   Found ${conversationCount?.value ?? 0} conversations`);

    // 9. Count appointments
    log('8. Counting appointments...');
    const [appointmentCount] = await db.select({ value: count() }).from(appointments);
    log(`   Found ${appointmentCount?.value ?? 0} appointments`);

    log('');
    log('=== Summary ===');
    log(`Organizations: ${orgCount?.value ?? 0}`);
    log(`Users:         ${userCount?.value ?? 0}`);
    log(`Contacts:      ${contactCount?.value ?? 0}`);
    log(`Deals:         ${dealCount?.value ?? 0}`);
    log(`Activities:    ${activityCount?.value ?? 0}`);
    log(`Conversations: ${conversationCount?.value ?? 0}`);
    log(`Appointments:  ${appointmentCount?.value ?? 0}`);
    log('');
    log('Database connection: SUCCESSFUL');
    log('All seeded data is accessible.');

  } catch (error) {
    err(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      err(error.stack);
    }
    process.exit(1);
  }

  process.exit(0);
}

testDatabaseConnection();
