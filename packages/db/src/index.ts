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
export * from "./schema/campaigns.js";
export * from "./schema/reviews.js";
export * from "./schema/sequences.js";

// Helpers
export { withOrgScope } from "./helpers.js";
