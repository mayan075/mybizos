/**
 * Google Calendar integration for appointment syncing.
 * Manages two-way sync between MyBizOS appointments and Google Calendar.
 * Uses the googleapis npm package for proper client support.
 */

import { google, type calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface CalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface CalendarEventAttendee {
  email: string;
  name?: string;
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  timeZone?: string;
  attendees?: CalendarEventAttendee[];
  reminders?: Array<{ method: "email" | "popup"; minutes: number }>;
}

export interface CalendarEventResult {
  id: string;
  htmlLink: string;
  status: string;
  summary: string;
  start: string;
  end: string;
  attendees: CalendarEventAttendee[];
}

export interface ListEventsResult {
  events: CalendarEventResult[];
  nextPageToken?: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Google Calendar client for appointment syncing.
 * Handles OAuth flow and event CRUD operations via the googleapis library.
 */
export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client;
  private config: GoogleCalendarConfig;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    );
  }

  // ─── OAuth ─────────────────────────────────────────────────────────────

  /**
   * Generate the OAuth2 authorization URL.
   * Redirect the user to this URL to grant calendar access.
   */
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar"],
      state,
    });
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<CalendarTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);

    this.oauth2Client.setCredentials(tokens);

    return {
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? "",
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    };
  }

  /**
   * Refresh the access token using a refresh token.
   * Returns the new token set.
   */
  async refreshAccessToken(refreshToken: string): Promise<CalendarTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token ?? "",
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt: new Date(
        credentials.expiry_date ?? Date.now() + 3600 * 1000,
      ),
    };
  }

  // ─── Events ────────────────────────────────────────────────────────────

  /**
   * List events within a time range.
   */
  async listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<ListEventsResult> {
    const calendar = this.getCalendarApi(accessToken);

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = (response.data.items ?? []).map((item) =>
      this.formatEvent(item),
    );

    return {
      events,
      nextPageToken: response.data.nextPageToken ?? undefined,
    };
  }

  /**
   * Create a new calendar event.
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent,
  ): Promise<CalendarEventResult> {
    const calendar = this.getCalendarApi(accessToken);

    const requestBody: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        displayName: a.name,
      })),
      reminders: event.reminders
        ? { useDefault: false, overrides: event.reminders }
        : { useDefault: true },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody,
      sendUpdates: "all",
    });

    return this.formatEvent(response.data);
  }

  /**
   * Update an existing calendar event. Only provided fields are changed.
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEventResult> {
    const calendar = this.getCalendarApi(accessToken);

    const requestBody: calendar_v3.Schema$Event = {};

    if (updates.summary !== undefined) {
      requestBody.summary = updates.summary;
    }
    if (updates.description !== undefined) {
      requestBody.description = updates.description;
    }
    if (updates.location !== undefined) {
      requestBody.location = updates.location;
    }
    if (updates.startTime !== undefined) {
      requestBody.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.timeZone,
      };
    }
    if (updates.endTime !== undefined) {
      requestBody.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: updates.timeZone,
      };
    }
    if (updates.attendees !== undefined) {
      requestBody.attendees = updates.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody,
      sendUpdates: "all",
    });

    return this.formatEvent(response.data);
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    const calendar = this.getCalendarApi(accessToken);

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all",
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private getCalendarApi(accessToken: string): calendar_v3.Calendar {
    const auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri,
    );
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: "v3", auth });
  }

  private formatEvent(item: calendar_v3.Schema$Event): CalendarEventResult {
    return {
      id: item.id ?? "",
      htmlLink: item.htmlLink ?? "",
      status: item.status ?? "",
      summary: item.summary ?? "",
      start: item.start?.dateTime ?? item.start?.date ?? "",
      end: item.end?.dateTime ?? item.end?.date ?? "",
      attendees: (item.attendees ?? []).map((a) => ({
        email: a.email ?? "",
        name: a.displayName ?? undefined,
        responseStatus: a.responseStatus as CalendarEventAttendee["responseStatus"],
      })),
    };
  }
}
