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

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/mybizos_dev";

const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
