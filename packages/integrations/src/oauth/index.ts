/**
 * OAuth integration module for third-party service connections.
 * Provides provider configurations, token management, and auth URL generation
 * for Facebook, Instagram, Google services, QuickBooks, and Stripe.
 *
 * IMPORTANT: No secrets are hardcoded. All client IDs and secrets must be
 * provided at runtime from org/admin settings.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type OAuthProvider =
  | "facebook"
  | "instagram"
  | "google_business"
  | "google_ads"
  | "google_analytics"
  | "google_calendar"
  | "quickbooks"
  | "stripe";

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

// ─── Provider Configurations ────────────────────────────────────────────────

export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  facebook: {
    provider: "facebook",
    displayName: "Facebook Pages",
    description: "Post to your page, respond to messages, run ads",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    revokeUrl: "https://graph.facebook.com/v19.0/me/permissions",
    scopes: [
      "pages_manage_posts",
      "pages_messaging",
      "pages_read_engagement",
      "pages_show_list",
    ],
    parentProvider: null,
    color: "#1877F2",
    iconId: "facebook",
    features: [
      "Post updates to your Facebook Page",
      "Respond to page messages",
      "View post engagement and insights",
      "Manage page content",
    ],
    developerUrl: "https://developers.facebook.com",
    credentialKeys: {
      clientId: "FACEBOOK_APP_ID",
      clientSecret: "FACEBOOK_APP_SECRET",
    },
  },

  instagram: {
    provider: "instagram",
    displayName: "Instagram Business",
    description: "Post photos, respond to DMs, view insights",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    revokeUrl: "https://graph.facebook.com/v19.0/me/permissions",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_messages",
      "pages_show_list",
    ],
    parentProvider: "facebook",
    color: "#E4405F",
    iconId: "instagram",
    features: [
      "Publish photos and carousels",
      "Respond to Instagram DMs",
      "View story and post insights",
      "Manage your business profile",
    ],
    developerUrl: "https://developers.facebook.com",
    credentialKeys: {
      clientId: "FACEBOOK_APP_ID",
      clientSecret: "FACEBOOK_APP_SECRET",
    },
  },

  google_business: {
    provider: "google_business",
    displayName: "Google Business Profile",
    description: "Manage reviews, update hours, post updates",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/business.manage",
    ],
    parentProvider: null,
    color: "#4285F4",
    iconId: "google_business",
    features: [
      "Respond to Google reviews",
      "Update business hours and info",
      "Post updates and offers",
      "View search and maps insights",
    ],
    developerUrl: "https://console.cloud.google.com",
    credentialKeys: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
  },

  google_ads: {
    provider: "google_ads",
    displayName: "Google Ads",
    description: "Track ad spend, see which ads bring leads",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/adwords",
    ],
    parentProvider: null,
    color: "#FBBC04",
    iconId: "google_ads",
    features: [
      "Track ad campaign performance",
      "See which ads bring in leads",
      "Monitor cost per acquisition",
      "View keyword performance",
    ],
    developerUrl: "https://console.cloud.google.com",
    credentialKeys: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
  },

  google_analytics: {
    provider: "google_analytics",
    displayName: "Google Analytics",
    description: "Track website visitors and conversions",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
    parentProvider: null,
    color: "#E37400",
    iconId: "google_analytics",
    features: [
      "Track website traffic in real-time",
      "Monitor conversion funnels",
      "See traffic sources and campaigns",
      "Analyze user behavior",
    ],
    developerUrl: "https://console.cloud.google.com",
    credentialKeys: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
  },

  google_calendar: {
    provider: "google_calendar",
    displayName: "Google Calendar",
    description: "Sync appointments bidirectionally",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    parentProvider: null,
    color: "#4285F4",
    iconId: "google_calendar",
    features: [
      "Two-way appointment sync",
      "Auto-block calendar when booked",
      "Team calendar visibility",
      "Booking link integration",
    ],
    developerUrl: "https://console.cloud.google.com",
    credentialKeys: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
  },

  quickbooks: {
    provider: "quickbooks",
    displayName: "QuickBooks",
    description: "Sync invoices, payments, and customers",
    authUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    revokeUrl: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    scopes: [
      "com.intuit.quickbooks.accounting",
    ],
    parentProvider: null,
    color: "#2CA01C",
    iconId: "quickbooks",
    features: [
      "Sync invoices automatically",
      "Track payments and receivables",
      "Sync customer records",
      "Generate financial reports",
    ],
    developerUrl: "https://developer.intuit.com",
    credentialKeys: {
      clientId: "QUICKBOOKS_CLIENT_ID",
      clientSecret: "QUICKBOOKS_CLIENT_SECRET",
    },
  },

  stripe: {
    provider: "stripe",
    displayName: "Stripe",
    description: "Accept payments, send invoices",
    authUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    revokeUrl: "https://connect.stripe.com/oauth/deauthorize",
    scopes: [
      "read_write",
    ],
    parentProvider: null,
    color: "#635BFF",
    iconId: "stripe",
    features: [
      "Accept online payments",
      "Send professional invoices",
      "Automatic payment reminders",
      "Real-time payment tracking",
    ],
    developerUrl: "https://dashboard.stripe.com/developers",
    credentialKeys: {
      clientId: "STRIPE_CLIENT_ID",
      clientSecret: "STRIPE_SECRET_KEY",
    },
  },
};

// ─── Auth URL Generation ────────────────────────────────────────────────────

/**
 * Build the OAuth authorization URL for a given provider.
 */
export function buildOAuthUrl(
  provider: OAuthProvider,
  credentials: OAuthCredentials,
  redirectUri: string,
  state: string,
): string {
  const cfg = OAUTH_PROVIDERS[provider];

  const params = new URLSearchParams();

  if (provider === "stripe") {
    // Stripe Connect uses different parameter names
    params.set("response_type", "code");
    params.set("client_id", credentials.clientId);
    params.set("scope", cfg.scopes.join(" "));
    params.set("redirect_uri", redirectUri);
    params.set("state", state);
  } else if (provider === "quickbooks") {
    params.set("client_id", credentials.clientId);
    params.set("response_type", "code");
    params.set("scope", cfg.scopes.join(" "));
    params.set("redirect_uri", redirectUri);
    params.set("state", state);
  } else if (
    provider === "facebook" ||
    provider === "instagram"
  ) {
    params.set("client_id", credentials.clientId);
    params.set("redirect_uri", redirectUri);
    params.set("state", state);
    params.set("scope", cfg.scopes.join(","));
    params.set("response_type", "code");
  } else {
    // Google providers
    params.set("client_id", credentials.clientId);
    params.set("redirect_uri", redirectUri);
    params.set("response_type", "code");
    params.set("scope", cfg.scopes.join(" "));
    params.set("state", state);
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  return `${cfg.authUrl}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 * Returns the raw token response so calling code can store it.
 */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  credentials: OAuthCredentials,
  redirectUri: string,
): Promise<OAuthTokens> {
  const cfg = OAUTH_PROVIDERS[provider];

  const body = new URLSearchParams();

  if (provider === "stripe") {
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("client_secret", credentials.clientSecret);
  } else if (
    provider === "facebook" ||
    provider === "instagram"
  ) {
    body.set("client_id", credentials.clientId);
    body.set("client_secret", credentials.clientSecret);
    body.set("redirect_uri", redirectUri);
    body.set("code", code);
  } else {
    // Google and QuickBooks
    body.set("client_id", credentials.clientId);
    body.set("client_secret", credentials.clientSecret);
    body.set("code", code);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // QuickBooks uses Basic auth for token exchange
  if (provider === "quickbooks") {
    const basic = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  }

  const response = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OAuth token exchange failed for ${provider}: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  // Normalize token response across providers
  const accessToken = (data["access_token"] as string) ?? "";
  const refreshToken = (data["refresh_token"] as string) ?? null;
  const expiresIn = data["expires_in"] as number | undefined;
  const tokenType = (data["token_type"] as string) ?? "Bearer";
  const scope = (data["scope"] as string) ?? "";

  return {
    accessToken,
    refreshToken,
    expiresAt: expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null,
    tokenType,
    scope,
    raw: data,
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  provider: OAuthProvider,
  refreshToken: string,
  credentials: OAuthCredentials,
): Promise<OAuthTokens> {
  const cfg = OAUTH_PROVIDERS[provider];

  // Facebook uses long-lived token exchange instead of refresh
  if (provider === "facebook" || provider === "instagram") {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      fb_exchange_token: refreshToken,
    });

    const response = await fetch(`${cfg.tokenUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Facebook token refresh failed: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      accessToken: (data["access_token"] as string) ?? "",
      refreshToken: (data["access_token"] as string) ?? null,
      expiresAt: data["expires_in"]
        ? new Date(Date.now() + (data["expires_in"] as number) * 1000)
        : null,
      tokenType: "Bearer",
      scope: "",
      raw: data,
    };
  }

  // Stripe doesn't support refresh tokens (tokens don't expire)
  if (provider === "stripe") {
    return {
      accessToken: refreshToken,
      refreshToken,
      expiresAt: null,
      tokenType: "Bearer",
      scope: "",
      raw: {},
    };
  }

  // Standard OAuth2 refresh flow (Google, QuickBooks)
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (provider === "quickbooks") {
    const basic = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  }

  const response = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed for ${provider}: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  return {
    accessToken: (data["access_token"] as string) ?? "",
    refreshToken: (data["refresh_token"] as string) ?? refreshToken,
    expiresAt: data["expires_in"]
      ? new Date(Date.now() + (data["expires_in"] as number) * 1000)
      : null,
    tokenType: (data["token_type"] as string) ?? "Bearer",
    scope: (data["scope"] as string) ?? "",
    raw: data,
  };
}

/**
 * Revoke tokens for a provider (disconnect).
 */
export async function revokeTokens(
  provider: OAuthProvider,
  accessToken: string,
  credentials: OAuthCredentials,
): Promise<void> {
  const cfg = OAUTH_PROVIDERS[provider];

  if (!cfg.revokeUrl) return;

  try {
    if (provider === "facebook" || provider === "instagram") {
      await fetch(`${cfg.revokeUrl}?${new URLSearchParams({ access_token: accessToken }).toString()}`, {
        method: "DELETE",
      });
    } else if (provider === "stripe") {
      await fetch(cfg.revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          stripe_user_id: accessToken,
        }).toString(),
      });
    } else if (provider === "quickbooks") {
      const basic = Buffer.from(
        `${credentials.clientId}:${credentials.clientSecret}`,
      ).toString("base64");
      await fetch(cfg.revokeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basic}`,
        },
        body: JSON.stringify({ token: accessToken }),
      });
    } else {
      // Google
      await fetch(`${cfg.revokeUrl}?token=${accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    }
  } catch {
    // Revocation is best-effort; don't fail the disconnect flow
  }
}

/**
 * Fetch the account/page name after connecting (for display in the UI).
 */
export async function fetchAccountName(
  provider: OAuthProvider,
  accessToken: string,
): Promise<{ accountName: string; accountId: string }> {
  try {
    if (provider === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`,
      );
      const data = (await res.json()) as { data?: Array<{ name: string; id: string }> };
      const page = data.data?.[0];
      return {
        accountName: page?.name ?? "Facebook Page",
        accountId: page?.id ?? "",
      };
    }

    if (provider === "instagram") {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{username,name}&access_token=${accessToken}`,
      );
      const data = (await res.json()) as {
        data?: Array<{
          instagram_business_account?: { username?: string; name?: string; id?: string };
        }>;
      };
      const igAccount = data.data?.[0]?.instagram_business_account;
      return {
        accountName: igAccount?.username ?? igAccount?.name ?? "Instagram Business",
        accountId: igAccount?.id ?? "",
      };
    }

    if (provider === "google_business") {
      const res = await fetch(
        "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = (await res.json()) as { accounts?: Array<{ accountName: string; name: string }> };
      const account = data.accounts?.[0];
      return {
        accountName: account?.accountName ?? "Google Business Profile",
        accountId: account?.name ?? "",
      };
    }

    if (provider === "google_ads") {
      // Google Ads API requires a developer token for full access;
      // for now, return a placeholder after successful OAuth
      return {
        accountName: "Google Ads Account",
        accountId: "",
      };
    }

    if (provider === "google_analytics") {
      const res = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = (await res.json()) as { accounts?: Array<{ displayName: string; name: string }> };
      const account = data.accounts?.[0];
      return {
        accountName: account?.displayName ?? "Google Analytics",
        accountId: account?.name ?? "",
      };
    }

    if (provider === "google_calendar") {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = (await res.json()) as { summary?: string; id?: string };
      return {
        accountName: data.summary ?? "Google Calendar",
        accountId: data.id ?? "",
      };
    }

    if (provider === "quickbooks") {
      return {
        accountName: "QuickBooks",
        accountId: "",
      };
    }

    if (provider === "stripe") {
      return {
        accountName: "Stripe Account",
        accountId: "",
      };
    }

    return { accountName: "Connected", accountId: "" };
  } catch {
    return { accountName: "Connected", accountId: "" };
  }
}
