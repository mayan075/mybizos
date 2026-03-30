const TOKEN_KEY = 'hararai_token';
const COOKIE_NAME = 'hararai_token';

export interface TokenPayload {
  userId: string;
  orgId: string;
  email: string;
  name?: string;
  orgName?: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  iat: number;
  exp: number;
}

/**
 * Store JWT access token in localStorage and a short-lived cookie
 * so Next.js middleware can read it for route protection.
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);

  const payload = decodeToken(token);
  const maxAge = payload ? payload.exp - Math.floor(Date.now() / 1000) : 15 * 60;
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Store both access token (localStorage) and refresh token (HttpOnly cookie via server route).
 * The refresh token NEVER touches JavaScript — it's set as HttpOnly by the Next.js API route.
 */
export async function storeTokens(token: string, refreshToken: string): Promise<void> {
  storeToken(token);

  // Send refresh token to our server-side route which sets it as HttpOnly cookie
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {
    // If this fails, we still have the access token — refresh will fail gracefully later
  });
}

/**
 * Retrieve JWT token from localStorage, falling back to cookie.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) return localToken;

  const cookieToken = getCookieValue(COOKIE_NAME);
  if (cookieToken) {
    localStorage.setItem(TOKEN_KEY, cookieToken);
    return cookieToken;
  }

  return null;
}

/**
 * Remove access token from localStorage/cookie and clear HttpOnly refresh cookie.
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;

  // Clear the HttpOnly refresh cookie via server route (fire-and-forget)
  fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
}

/**
 * Returns auth headers with the Bearer token for API requests.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Attempt to refresh the access token via the HttpOnly cookie proxy.
 * The refresh token is read from the HttpOnly cookie server-side — JS never sees it.
 * Returns the new access token on success, null on failure.
 */
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      // Refresh token is invalid/expired — clear access token too
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      }
      return null;
    }

    const json = (await res.json()) as { data: { token: string } };

    // Store the new access token (refresh token was already rotated server-side into HttpOnly cookie)
    storeToken(json.data.token);
    return json.data.token;
  } catch {
    // Network error — don't clear tokens (might be temporary)
    return null;
  }
}

/**
 * Decode JWT payload without verification (client-side only).
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64)) as TokenPayload;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Read a cookie value by name.
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] as string) : null;
}

/**
 * Check if the access token is expired (or about to expire in 60s).
 */
export function isAccessTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  const payload = decodeToken(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + 60;
}

/**
 * Check if a valid session exists.
 * Note: We can't check the HttpOnly refresh cookie from JS,
 * so this only checks the access token. The middleware checks the refresh cookie.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/**
 * Get decoded user info from the stored JWT token.
 * Returns null if not authenticated or token is invalid/expired.
 */
export function getUser(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return payload;
}
