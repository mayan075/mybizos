import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import * as authSchema from "./schema/auth.js";
import * as organizationsSchema from "./schema/organizations.js";
import * as contactsSchema from "./schema/contacts.js";
import * as pipelineSchema from "./schema/pipeline.js";
import * as activitiesSchema from "./schema/activities.js";
import * as communicationsSchema from "./schema/communications.js";
import * as schedulingSchema from "./schema/scheduling.js";
import * as aiSchema from "./schema/ai.js";
import * as auditLogSchema from "./schema/audit-log.js";
import * as campaignsSchema from "./schema/campaigns.js";
import * as reviewsSchema from "./schema/reviews.js";
import * as sequencesSchema from "./schema/sequences.js";
import * as formsSchema from "./schema/forms.js";
import * as callHistorySchema from "./schema/call-history.js";
import * as invoicesSchema from "./schema/invoices.js";
import * as notificationsSchema from "./schema/notifications.js";
import * as socialSchema from "./schema/social.js";
import * as walletSchema from "./schema/wallet.js";
import * as platformSettingsSchema from "./schema/platform-settings.js";
import * as bookableServicesSchema from "./schema/bookable-services.js";
import * as waitlistSchema from "./schema/waitlist.js";
import * as googleCalendarSchema from "./schema/google-calendar.js";

const schema = {
  ...authSchema,
  ...organizationsSchema,
  ...contactsSchema,
  ...pipelineSchema,
  ...activitiesSchema,
  ...communicationsSchema,
  ...schedulingSchema,
  ...aiSchema,
  ...auditLogSchema,
  ...campaignsSchema,
  ...reviewsSchema,
  ...sequencesSchema,
  ...formsSchema,
  ...callHistorySchema,
  ...invoicesSchema,
  ...notificationsSchema,
  ...socialSchema,
  ...walletSchema,
  ...platformSettingsSchema,
  ...bookableServicesSchema,
  ...waitlistSchema,
  ...googleCalendarSchema,
};

const connectionString = process.env["DATABASE_URL"] ?? "";

/**
 * Lazy database connection: only connects when a query is actually executed.
 * In dev mode with no DATABASE_URL, the import will not crash --
 * only actual queries will throw (which route handlers catch and fall back to mock data).
 */
let _db: ReturnType<typeof drizzle> | null = null;

function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    if (!connectionString) {
      // Return a noop proxy so imports succeed without a real DB.
      // Any actual query will reject with a clear error message.
      const dbError = new Error(
        "Database not configured. Set DATABASE_URL to connect to PostgreSQL."
      );
      const makeChain = (): unknown =>
        new Proxy(() => {}, {
          get(_t, p) {
            if (p === "then") {
              return (_resolve: unknown, reject: (e: Error) => void) => {
                reject(dbError);
              };
            }
            if (p === "catch") {
              return (fn: (e: Error) => void) => fn(dbError);
            }
            if (p === "finally") {
              return (fn: () => void) => fn();
            }
            return makeChain();
          },
          apply: () => makeChain(),
        });
      _db = new Proxy({} as ReturnType<typeof drizzle>, {
        get(_target, prop) {
          if (
            prop === "then" ||
            prop === "catch" ||
            prop === "finally" ||
            prop === Symbol.toPrimitive ||
            prop === Symbol.toStringTag
          ) {
            return undefined;
          }
          return (..._args: unknown[]) => makeChain();
        },
      });
    } else {
      const queryClient = postgres(connectionString, {
        max: 20,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(queryClient, { schema });
    }
  }
  return _db;
}

// Export a proxy that lazily initializes the connection
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

export type Database = ReturnType<typeof drizzle>;

/**
 * Executes a callback inside a transaction with `app.current_org_id` set for
 * the duration of that transaction. All RLS policies on tenant-scoped tables
 * use this setting, so every query inside the callback is automatically
 * restricted to the given org.
 *
 * Usage:
 *   const contacts = await withRLS(orgId, (tx) =>
 *     tx.select().from(contactsTable)
 *   );
 *
 * Note: `any` casts are required because Drizzle's transaction callback
 * types are complex generics that vary by schema. This is intentional.
 */
export async function withRLS<T>(
  orgId: string,
  callback: (tx: ReturnType<typeof drizzle>) => Promise<T>,
): Promise<T> {
  const realDb = getDb();
  return await (realDb as any).transaction(async (tx: any) => {
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    return callback(tx);
  });
}
