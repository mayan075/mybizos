const TOKEN_KEY = 'mybizos_token';
const COOKIE_NAME = 'mybizos_token';

export interface TokenPayload {
  userId: string;
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  iat: number;
  exp: number;
}

/**
 * Store JWT token in localStorage and set a cookie
 * so Next.js middleware can read it for route protection.
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);

  // Set cookie for Next.js middleware (HttpOnly not possible from JS,
  // but this cookie is only used for route protection checks, not auth)
  const payload = decodeToken(token);
  const maxAge = payload ? payload.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Retrieve JWT token from localStorage.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage and cookie (logout).
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Decode JWT payload without verification (client-side only).
 * Returns null if token is missing, malformed, or expired.
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64)) as TokenPayload;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a valid (non-expired) token exists.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload) return false;

  // Check expiration (exp is in seconds, Date.now() in ms)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    removeToken();
    return false;
  }

  return true;
}

/**
 * Get decoded user info from the stored JWT token.
 * Returns null if not authenticated or token is invalid.
 */
export function getUser(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    removeToken();
    return null;
  }

  return payload;
}
