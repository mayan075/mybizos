// Database client
export { db, type Database } from "./client.js";

// Schema exports
export * from "./schema/auth.js";
export * from "./schema/organizations.js";
export * from "./schema/contacts.js";
export * from "./schema/pipeline.js";
export * from "./schema/activities.js";
export * from "./schema/communications.js";
export * from "./schema/scheduling.js";
export * from "./schema/ai.js";

// Helpers
export { withOrgScope } from "./helpers.js";
