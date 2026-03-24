import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth.js";
import * as organizationsSchema from "./schema/organizations.js";
import * as contactsSchema from "./schema/contacts.js";
import * as pipelineSchema from "./schema/pipeline.js";
import * as activitiesSchema from "./schema/activities.js";
import * as communicationsSchema from "./schema/communications.js";
import * as schedulingSchema from "./schema/scheduling.js";
import * as aiSchema from "./schema/ai.js";
const schema = {
    ...authSchema,
    ...organizationsSchema,
    ...contactsSchema,
    ...pipelineSchema,
    ...activitiesSchema,
    ...communicationsSchema,
    ...schedulingSchema,
    ...aiSchema,
};
const connectionString = process.env["DATABASE_URL"] ?? "";
/**
 * Lazy database connection: only connects when a query is actually executed.
 * In dev mode with no DATABASE_URL, the import will not crash --
 * only actual queries will throw (which route handlers catch and fall back to mock data).
 */
let _db = null;
function getDb() {
    if (!_db) {
        if (!connectionString) {
            // Return a noop proxy so imports succeed without a real DB.
            // Any actual query will reject with a clear error message.
            const dbError = new Error("Database not configured. Set DATABASE_URL to connect to PostgreSQL.");
            const makeChain = () => new Proxy(() => { }, {
                get(_t, p) {
                    if (p === "then") {
                        return (_resolve, reject) => {
                            reject(dbError);
                        };
                    }
                    if (p === "catch") {
                        return (fn) => fn(dbError);
                    }
                    if (p === "finally") {
                        return (fn) => fn();
                    }
                    return makeChain();
                },
                apply: () => makeChain(),
            });
            _db = new Proxy({}, {
                get(_target, prop) {
                    if (prop === "then" ||
                        prop === "catch" ||
                        prop === "finally" ||
                        prop === Symbol.toPrimitive ||
                        prop === Symbol.toStringTag) {
                        return undefined;
                    }
                    return (..._args) => makeChain();
                },
            });
        }
        else {
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
export const db = new Proxy({}, {
    get(_target, prop, receiver) {
        const realDb = getDb();
        const value = Reflect.get(realDb, prop, receiver);
        if (typeof value === "function") {
            return value.bind(realDb);
        }
        return value;
    },
});
//# sourceMappingURL=client.js.map