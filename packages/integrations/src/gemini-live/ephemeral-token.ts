/**
 * Ephemeral token generation for browser-side Gemini Live API connections.
 *
 * The backend generates a short-lived token using the server API key,
 * then the browser uses that token to connect directly to Gemini
 * without exposing the API key.
 */

export interface EphemeralTokenResult {
  /** Short-lived access token for client-side WebSocket connection */
  token: string;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
}

/**
 * Generate an ephemeral token for client-to-server Gemini Live connections.
 *
 * Google does not provide a public ephemeral token API for Gemini Live.
 * Client-side connections must be proxied through the server (which holds
 * the API key) rather than connecting directly from the browser.
 *
 * @param _apiKey - Unused. Kept for API compatibility.
 * @throws Always throws — server-side proxying is required instead.
 */
export async function generateEphemeralToken(_apiKey: string): Promise<EphemeralTokenResult> {
  throw new Error(
    'Google does not provide an ephemeral token API for Gemini Live. ' +
    'Client connections must be proxied through the server using GeminiLiveSession. ' +
    'See the /demo/session endpoint for the server-proxy pattern.',
  );
}

/**
 * Build the WebSocket URL for client-side connection using an ephemeral token.
 */
export function buildEphemeralWsUrl(token: string): string {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;
}
