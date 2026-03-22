import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Programmatically runs all pending migrations from the ./drizzle folder.
 * This is useful for CI/CD pipelines and deployment scripts.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... tsx src/migrate.ts
 */
async function runMigrations(): Promise<void> {
  const connectionString =
    process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/mybizos_dev";

  console.log("Running migrations...\n");

  // Use a separate connection with max 1 for migrations
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
