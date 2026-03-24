import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>> & {
    $client: postgres.Sql<{}>;
};
export type Database = ReturnType<typeof drizzle>;
//# sourceMappingURL=client.d.ts.map