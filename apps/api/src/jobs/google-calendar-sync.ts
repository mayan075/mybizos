import { googleCalendarSyncService } from "../services/google-calendar-sync-service.js";
import { logger } from "../middleware/logger.js";

export async function runGoogleCalendarSync(): Promise<{ synced: boolean }> {
  try {
    await googleCalendarSyncService.syncAll();
    return { synced: true };
  } catch (err) {
    logger.error("[GCal Sync Job] Failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { synced: false };
  }
}
