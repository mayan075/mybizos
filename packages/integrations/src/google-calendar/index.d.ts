/**
 * Google Calendar integration for appointment syncing.
 * Manages two-way sync between MyBizOS appointments and Google Calendar.
 * Uses the googleapis npm package for proper client support.
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
    reminders?: Array<{
        method: "email" | "popup";
        minutes: number;
    }>;
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
/**
 * Google Calendar client for appointment syncing.
 * Handles OAuth flow and event CRUD operations via the googleapis library.
 */
export declare class GoogleCalendarClient {
    private oauth2Client;
    private config;
    constructor(config: GoogleCalendarConfig);
    /**
     * Generate the OAuth2 authorization URL.
     * Redirect the user to this URL to grant calendar access.
     */
    getAuthUrl(state: string): string;
    /**
     * Exchange an authorization code for access and refresh tokens.
     */
    exchangeCode(code: string): Promise<CalendarTokens>;
    /**
     * Refresh the access token using a refresh token.
     * Returns the new token set.
     */
    refreshAccessToken(refreshToken: string): Promise<CalendarTokens>;
    /**
     * List events within a time range.
     */
    listEvents(accessToken: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<ListEventsResult>;
    /**
     * Create a new calendar event.
     */
    createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<CalendarEventResult>;
    /**
     * Update an existing calendar event. Only provided fields are changed.
     */
    updateEvent(accessToken: string, calendarId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEventResult>;
    /**
     * Delete a calendar event.
     */
    deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
    private getCalendarApi;
    private formatEvent;
}
//# sourceMappingURL=index.d.ts.map