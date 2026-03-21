/**
 * Google Calendar integration for appointment syncing.
 * Manages two-way sync between MyBizOS appointments and Google Calendar.
 */

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

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: Array<{ method: "email" | "popup"; minutes: number }>;
}

export interface CalendarEventResult {
  id: string;
  htmlLink: string;
  status: string;
}

/**
 * Google Calendar client for appointment syncing.
 * Handles OAuth flow and event CRUD operations.
 */
export class GoogleCalendarClient {
  private config: GoogleCalendarConfig;
  private tokens: CalendarTokens | null = null;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
  }

  /**
   * Generate the OAuth2 authorization URL.
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<CalendarTokens> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    return this.tokens;
  }

  /**
   * Set tokens directly (e.g., loaded from database).
   */
  setTokens(tokens: CalendarTokens): void {
    this.tokens = tokens;
  }

  /**
   * Refresh the access token using the refresh token.
   */
  async refreshAccessToken(): Promise<CalendarTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error("No refresh token available. Re-authenticate.");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: this.tokens.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    return this.tokens;
  }

  /**
   * Create a calendar event.
   */
  async createEvent(
    calendarId: string,
    event: CalendarEvent,
  ): Promise<CalendarEventResult> {
    const accessToken = await this.getValidAccessToken();

    const body = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        displayName: a.name,
      })),
      reminders: event.reminders
        ? { useDefault: false, overrides: event.reminders }
        : { useDefault: true },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as {
      id: string;
      htmlLink: string;
      status: string;
    };

    return { id: data.id, htmlLink: data.htmlLink, status: data.status };
  }

  /**
   * Update an existing calendar event.
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>,
  ): Promise<CalendarEventResult> {
    const accessToken = await this.getValidAccessToken();

    const body: Record<string, unknown> = {};
    if (event.summary) body["summary"] = event.summary;
    if (event.description) body["description"] = event.description;
    if (event.location) body["location"] = event.location;
    if (event.startTime) body["start"] = { dateTime: event.startTime.toISOString() };
    if (event.endTime) body["end"] = { dateTime: event.endTime.toISOString() };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as {
      id: string;
      htmlLink: string;
      status: string;
    };

    return { id: data.id, htmlLink: data.htmlLink, status: data.status };
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }

  /**
   * Get a valid access token, refreshing if expired.
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("Not authenticated. Call exchangeCode() or setTokens() first.");
    }

    if (this.tokens.expiresAt <= new Date()) {
      await this.refreshAccessToken();
    }

    return this.tokens!.accessToken;
  }
}
