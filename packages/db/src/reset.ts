import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

/**
 * Drops all tables and re-runs the seed script.
 * Use for development resets only — NEVER run in production.
 */
async function reset(): Promise<void> {
  const connectionString =
    process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/hararai_dev";

  const queryClient = postgres(connectionString, { max: 1 });
  const db = drizzle(queryClient);

  console.log("Resetting database...\n");

  // Drop all tables by cascading from the public schema
  console.log("  Dropping all tables...");
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Drop all custom enum types
  console.log("  Dropping all enum types...");
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("  All tables and enums dropped.\n");
  await queryClient.end();

  // Re-run seed (which will push the schema via drizzle-kit first)
  console.log("  To re-populate the database, run:");
  console.log("    pnpm db:push   # recreate tables from schema");
  console.log("    pnpm db:seed   # insert seed data\n");
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
