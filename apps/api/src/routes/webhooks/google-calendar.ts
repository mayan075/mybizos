import { Hono } from "hono";
import { googleCalendarSyncService } from "../../services/google-calendar-sync-service.js";
import { logger } from "../../middleware/logger.js";

const router = new Hono();

router.post("/", async (c) => {
  const channelToken = c.req.header("X-Goog-Channel-Token");
  const resourceState = c.req.header("X-Goog-Resource-State");

  // Initial sync confirmation — just acknowledge
  if (resourceState === "sync") {
    return c.json({ ok: true });
  }

  if (!channelToken) {
    logger.warn("Google Calendar webhook received without channel token");
    return c.json({ ok: true });
  }

  // channelToken format: "orgId:userId"
  const [orgId, userId] = channelToken.split(":");

  if (!orgId || !userId) {
    logger.warn("Google Calendar webhook received with invalid channel token", {
      channelToken,
    });
    return c.json({ ok: true });
  }

  // Trigger async sync — don't block the webhook response
  googleCalendarSyncService.syncBusyBlocks(orgId, userId).catch((err) => {
    logger.error("Google Calendar webhook sync failed", {
      orgId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return c.json({ ok: true });
});

export { router as googleCalendarWebhookRoutes };
