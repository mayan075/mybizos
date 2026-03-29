/**
 * Google Calendar bidirectional sync service.
 * Wraps GoogleCalendarClient to integrate with the HararAI database.
 * Handles push (appointment → Google) and pull (Google → busy blocks).
 */

import {
  db,
  googleCalendarConnections,
  googleCalendarBusyBlocks,
  appointments,
  withOrgScope,
} from '@hararai/db';
import { eq, and } from 'drizzle-orm';
import { GoogleCalendarClient, type CalendarEvent } from '@hararai/integrations';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Create a new GoogleCalendarClient using environment config.
 */
function getCalendarClient(): GoogleCalendarClient {
  return new GoogleCalendarClient({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: `${config.APP_URL}/integrations/oauth/callback`,
  });
}

/**
 * Return a valid access token for the connection.
 * Refreshes automatically if the token is expired, updating the DB record.
 * Returns null on any failure.
 */
async function getValidAccessToken(
  connection: GoogleCalendarConnection,
): Promise<string | null> {
  // Token still valid — use as-is
  if (connection.expiresAt > new Date()) {
    return connection.accessToken;
  }

  // Token expired — attempt refresh
  try {
    const client = getCalendarClient();
    const refreshed = await client.refreshAccessToken(connection.refreshToken);

    await db
      .update(googleCalendarConnections)
      .set({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, connection.id));

    logger.info('Google Calendar token refreshed', { connectionId: connection.id });
    return refreshed.accessToken;
  } catch (err) {
    logger.error('Failed to refresh Google Calendar token', {
      connectionId: connection.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const googleCalendarSyncService = {
  /**
   * Push a HararAI appointment to Google Calendar.
   * Updates the appointment record with googleEventId and sync status.
   * Returns the created Google event ID, or null on failure.
   */
  async pushAppointmentToGoogle(
    appointmentId: string,
    orgId: string,
    assignedTo: string,
    eventData: CalendarEvent,
  ): Promise<string | null> {
    try {
      // Look up the connection for this user
      const [connection] = await db
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            withOrgScope(googleCalendarConnections.orgId, orgId),
            eq(googleCalendarConnections.userId, assignedTo),
            eq(googleCalendarConnections.syncEnabled, true),
          ),
        )
        .limit(1);

      if (!connection) {
        logger.info('No Google Calendar connection found for user', { orgId, assignedTo });
        return null;
      }

      const accessToken = await getValidAccessToken(connection);
      if (!accessToken) {
        await db
          .update(appointments)
          .set({ googleCalendarSyncStatus: 'failed', updatedAt: new Date() })
          .where(
            and(
              withOrgScope(appointments.orgId, orgId),
              eq(appointments.id, appointmentId),
            ),
          );
        return null;
      }

      const client = getCalendarClient();
      const result = await client.createEvent(accessToken, connection.calendarId, eventData);

      await db
        .update(appointments)
        .set({
          googleEventId: result.id,
          googleCalendarSyncStatus: 'synced',
          updatedAt: new Date(),
        })
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.id, appointmentId),
          ),
        );

      logger.info('Appointment pushed to Google Calendar', {
        appointmentId,
        googleEventId: result.id,
      });

      return result.id;
    } catch (err) {
      logger.error('Failed to push appointment to Google Calendar', {
        appointmentId,
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });

      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: 'failed', updatedAt: new Date() })
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.id, appointmentId),
          ),
        )
        .catch(() => {
          // Best-effort — don't cascade failures
        });

      return null;
    }
  },

  /**
   * Update an existing Google Calendar event for an appointment.
   * Returns true on success, false on failure.
   */
  async updateGoogleEvent(
    appointmentId: string,
    orgId: string,
    assignedTo: string,
    googleEventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<boolean> {
    try {
      const [connection] = await db
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            withOrgScope(googleCalendarConnections.orgId, orgId),
            eq(googleCalendarConnections.userId, assignedTo),
            eq(googleCalendarConnections.syncEnabled, true),
          ),
        )
        .limit(1);

      if (!connection) {
        logger.info('No Google Calendar connection found for user', { orgId, assignedTo });
        return false;
      }

      const accessToken = await getValidAccessToken(connection);
      if (!accessToken) {
        await db
          .update(appointments)
          .set({ googleCalendarSyncStatus: 'failed', updatedAt: new Date() })
          .where(
            and(
              withOrgScope(appointments.orgId, orgId),
              eq(appointments.id, appointmentId),
            ),
          );
        return false;
      }

      const client = getCalendarClient();
      await client.updateEvent(accessToken, connection.calendarId, googleEventId, updates);

      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: 'synced', updatedAt: new Date() })
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.id, appointmentId),
          ),
        );

      logger.info('Google Calendar event updated', { appointmentId, googleEventId });
      return true;
    } catch (err) {
      logger.error('Failed to update Google Calendar event', {
        appointmentId,
        googleEventId,
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });

      await db
        .update(appointments)
        .set({ googleCalendarSyncStatus: 'failed', updatedAt: new Date() })
        .where(
          and(
            withOrgScope(appointments.orgId, orgId),
            eq(appointments.id, appointmentId),
          ),
        )
        .catch(() => {});

      return false;
    }
  },

  /**
   * Delete a Google Calendar event.
   * Returns true on success, false on failure.
   */
  async deleteGoogleEvent(
    orgId: string,
    assignedTo: string,
    googleEventId: string,
  ): Promise<boolean> {
    try {
      const [connection] = await db
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            withOrgScope(googleCalendarConnections.orgId, orgId),
            eq(googleCalendarConnections.userId, assignedTo),
            eq(googleCalendarConnections.syncEnabled, true),
          ),
        )
        .limit(1);

      if (!connection) {
        logger.info('No Google Calendar connection found for user', { orgId, assignedTo });
        return false;
      }

      const accessToken = await getValidAccessToken(connection);
      if (!accessToken) {
        return false;
      }

      const client = getCalendarClient();
      await client.deleteEvent(accessToken, connection.calendarId, googleEventId);

      logger.info('Google Calendar event deleted', { orgId, assignedTo, googleEventId });
      return true;
    } catch (err) {
      logger.error('Failed to delete Google Calendar event', {
        orgId,
        assignedTo,
        googleEventId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },

  /**
   * Pull external events from Google Calendar for the next 14 days and store
   * them as busy blocks. Events created by HararAI (matched by googleEventId
   * in the appointments table) are filtered out.
   *
   * Uses a full refresh strategy: deletes all existing busy blocks for this
   * user then re-inserts the current snapshot.
   *
   * Returns the number of busy blocks inserted, or -1 on failure.
   */
  async syncBusyBlocks(orgId: string, userId: string): Promise<number> {
    try {
      const [connection] = await db
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            withOrgScope(googleCalendarConnections.orgId, orgId),
            eq(googleCalendarConnections.userId, userId),
            eq(googleCalendarConnections.syncEnabled, true),
          ),
        )
        .limit(1);

      if (!connection) {
        logger.info('No Google Calendar connection found for user during busy block sync', {
          orgId,
          userId,
        });
        return -1;
      }

      const accessToken = await getValidAccessToken(connection);
      if (!accessToken) {
        return -1;
      }

      // Fetch all events for the next 14 days
      const now = new Date();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const client = getCalendarClient();
      const { events } = await client.listEvents(
        accessToken,
        connection.calendarId,
        now,
        twoWeeksOut,
      );

      // Collect HararAI-owned google event IDs so we can exclude them
      const hararaiEventRows = await db
        .select({ googleEventId: appointments.googleEventId })
        .from(appointments)
        .where(withOrgScope(appointments.orgId, orgId));

      const ownedEventIds = new Set(
        hararaiEventRows
          .map((r) => r.googleEventId)
          .filter((id): id is string => id !== null),
      );

      // Filter out HararAI-created events
      const externalEvents = events.filter((e) => !ownedEventIds.has(e.id));

      // Full refresh: delete then re-insert
      await db
        .delete(googleCalendarBusyBlocks)
        .where(
          and(
            withOrgScope(googleCalendarBusyBlocks.orgId, orgId),
            eq(googleCalendarBusyBlocks.userId, userId),
          ),
        );

      if (externalEvents.length > 0) {
        await db.insert(googleCalendarBusyBlocks).values(
          externalEvents.map((e) => ({
            orgId,
            userId,
            googleEventId: e.id,
            summary: e.summary || null,
            startTime: new Date(e.start),
            endTime: new Date(e.end),
            updatedAt: new Date(),
          })),
        );
      }

      // Update lastSyncAt on the connection
      await db
        .update(googleCalendarConnections)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(googleCalendarConnections.id, connection.id));

      logger.info('Google Calendar busy blocks synced', {
        orgId,
        userId,
        count: externalEvents.length,
      });

      return externalEvents.length;
    } catch (err) {
      logger.error('Failed to sync Google Calendar busy blocks', {
        orgId,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return -1;
    }
  },

  /**
   * Sync busy blocks for all connections that have syncEnabled=true.
   * Intended to be called by the cron job.
   */
  async syncAll(): Promise<void> {
    try {
      const connections = await db
        .select({
          orgId: googleCalendarConnections.orgId,
          userId: googleCalendarConnections.userId,
        })
        .from(googleCalendarConnections)
        .where(eq(googleCalendarConnections.syncEnabled, true));

      logger.info('Starting Google Calendar syncAll', { connectionCount: connections.length });

      let successCount = 0;
      let failCount = 0;

      for (const { orgId, userId } of connections) {
        const result = await googleCalendarSyncService.syncBusyBlocks(orgId, userId);
        if (result >= 0) {
          successCount++;
        } else {
          failCount++;
        }
      }

      logger.info('Google Calendar syncAll complete', { successCount, failCount });
    } catch (err) {
      logger.error('Failed during Google Calendar syncAll', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
