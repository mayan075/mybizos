/**
 * Ephemeral token generation for browser-side Gemini Live API connections.
 *
 * The backend generates a short-lived token using the server API key,
 * then the browser uses that token to connect directly to Gemini
 * without exposing the API key.
 */

const EPHEMERAL_TOKEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-live-preview:generateContent';

export interface EphemeralTokenResult {
  /** Short-lived access token for client-side WebSocket connection */
  token: string;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
}

/**
 * Generate an ephemeral token for client-to-server Gemini Live connections.
 *
 * @param apiKey - Server-side Google AI API key (never sent to the client)
 * @returns Short-lived token safe for browser use
 */
export async function generateEphemeralToken(apiKey: string): Promise<EphemeralTokenResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-3.1-flash-live-preview',
        // Ephemeral token request — Google issues a short-lived bearer token
        generationConfig: {},
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to generate ephemeral token (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as { name: string; expireTime: string };

  // The token is the resource name, expiration comes from the response
  const expiresAt = data.expireTime
    ? new Date(data.expireTime).getTime()
    : Date.now() + 5 * 60 * 1000; // Default 5 minutes

  return {
    token: data.name,
    expiresAt,
  };
}

/**
 * Build the WebSocket URL for client-side connection using an ephemeral token.
 */
export function buildEphemeralWsUrl(token: string): string {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;
}
