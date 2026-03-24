/**
 * OAuth integration module for third-party service connections.
 * Provides provider configurations, token management, and auth URL generation
 * for Facebook, Instagram, Google services, QuickBooks, and Stripe.
 *
 * IMPORTANT: No secrets are hardcoded. All client IDs and secrets must be
 * provided at runtime from org/admin settings.
 */
export type OAuthProvider = "facebook" | "instagram" | "google_business" | "google_ads" | "google_analytics" | "google_calendar" | "quickbooks" | "stripe";
export interface OAuthProviderConfig {
    provider: OAuthProvider;
    displayName: string;
    description: string;
    authUrl: string;
    tokenUrl: string;
    revokeUrl: string | null;
    scopes: string[];
    /** Providers that share a parent OAuth flow (e.g. instagram -> facebook) */
    parentProvider: OAuthProvider | null;
    /** Color for UI display */
    color: string;
    /** Icon identifier for the frontend */
    iconId: string;
    /** What features this integration enables */
    features: string[];
    /** URL to create developer credentials */
    developerUrl: string;
    /** Environment variable names for the credentials */
    credentialKeys: {
        clientId: string;
        clientSecret: string;
    };
}
export interface OAuthTokens {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    tokenType: string;
    scope: string;
    raw: Record<string, unknown>;
}
export interface OAuthConnectionStatus {
    connected: boolean;
    provider: OAuthProvider;
    accountName: string | null;
    accountId: string | null;
    connectedAt: Date | null;
    expiresAt: Date | null;
}
export interface OAuthCredentials {
    clientId: string;
    clientSecret: string;
}
export interface OAuthConnection {
    provider: OAuthProvider;
    orgId: string;
    tokens: OAuthTokens;
    accountName: string | null;
    accountId: string | null;
    connectedAt: Date;
    metadata: Record<string, unknown>;
}
export declare const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig>;
/**
 * Build the OAuth authorization URL for a given provider.
 */
export declare function buildOAuthUrl(provider: OAuthProvider, credentials: OAuthCredentials, redirectUri: string, state: string): string;
/**
 * Exchange an authorization code for tokens.
 * Returns the raw token response so calling code can store it.
 */
export declare function exchangeCodeForTokens(provider: OAuthProvider, code: string, credentials: OAuthCredentials, redirectUri: string): Promise<OAuthTokens>;
/**
 * Refresh an expired access token using the refresh token.
 */
export declare function refreshAccessToken(provider: OAuthProvider, refreshToken: string, credentials: OAuthCredentials): Promise<OAuthTokens>;
/**
 * Revoke tokens for a provider (disconnect).
 */
export declare function revokeTokens(provider: OAuthProvider, accessToken: string, credentials: OAuthCredentials): Promise<void>;
/**
 * Fetch the account/page name after connecting (for display in the UI).
 */
export declare function fetchAccountName(provider: OAuthProvider, accessToken: string): Promise<{
    accountName: string;
    accountId: string;
}>;
//# sourceMappingURL=index.d.ts.map