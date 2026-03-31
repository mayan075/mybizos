import { Hono } from "hono";
import crypto from "crypto";
import { googleCalendarSyncService } from "../../services/google-calendar-sync-service.js";
import { logger } from "../../middleware/logger.js";
import { config } from "../../config.js";

const router = new Hono();

/**
 * Sign a channel token so it can be verified on inbound webhooks.
 * Use this when creating Google Calendar watch subscriptions.
 */
export function signChannelToken(orgId: string, userId: string): string {
  const data = `${orgId}:${userId}`;
  const hmac = crypto.createHmac("sha256", config.JWT_SECRET).update(data).digest("hex");
  return `${data}:${hmac}`;
}

router.post("/", async (c) => {
  const channelToken = c.req.header("X-Goog-Channel-Token");
  const resourceState = c.req.header("X-Goog-Resource-State");

  // Initial sync confirmation — just acknowledge
  if (resourceState === "sync") {
    return c.json({ ok: true });
  }

  if (!channelToken) {
    logger.warn("Google Calendar webhook received without channel token");
    return c.json({ error: "Missing channel token", code: "FORBIDDEN", status: 403 }, 403);
  }

  // channelToken format: "orgId:userId:hmacSignature"
  const parts = channelToken.split(":");
  if (parts.length < 2) {
    logger.warn("Google Calendar webhook received with invalid channel token format", { channelToken });
    return c.json({ error: "Invalid channel token", code: "FORBIDDEN", status: 403 }, 403);
  }

  const [orgId, userId, signature] = parts;

  if (!orgId || !userId) {
    logger.warn("Google Calendar webhook received with invalid channel token", { channelToken });
    return c.json({ error: "Invalid channel token", code: "FORBIDDEN", status: 403 }, 403);
  }

  // Verify HMAC signature if present (backwards-compatible with unsigned tokens during migration)
  if (signature) {
    const expectedHmac = crypto.createHmac("sha256", config.JWT_SECRET).update(`${orgId}:${userId}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
      logger.warn("Google Calendar webhook HMAC verification failed", { orgId, userId });
      return c.json({ error: "Invalid channel token signature", code: "FORBIDDEN", status: 403 }, 403);
    }
  } else {
    logger.warn("Google Calendar webhook received unsigned token — migrate to signed tokens", { orgId, userId });
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
