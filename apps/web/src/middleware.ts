import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js edge middleware for route protection.
 *
 * In development (localhost) and on Vercel, all routes are accessible
 * without auth because we are in demo mode (no DB for auth yet).
 *
 * In production with a real auth backend, this would enforce:
 * - Protected routes (/dashboard/*) redirect to /login if no valid token.
 * - Public routes (/login, /register, /book/*, /review/*) are always accessible.
 */

const PUBLIC_PATHS = ["/login", "/register", "/book", "/review"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

/**
 * Minimal JWT expiration check without crypto verification.
 * Full verification happens server-side; this just prevents
 * obvious expired-token redirects at the edge.
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    const payload = parts[1];
    if (!payload) return true;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64)) as { exp?: number };

    if (!decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  } catch {
    return true;
  }
}

/**
 * Check if auth should be skipped.
 * Only skip on localhost for local development.
 */
function shouldSkipAuth(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0");

  return isLocal;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page routes (static files, api, _next)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Skip auth in local development only
  if (shouldSkipAuth(request)) {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const cookieToken = request.cookies.get("hararai_token")?.value;
  const refreshCookie = request.cookies.get("hararai_refresh_token")?.value;
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const token = cookieToken ?? bearerToken;
  const hasValidAccessToken = token ? !isTokenExpired(token) : false;
  // If access token is expired but refresh token exists, let the page load —
  // the client-side api-client will handle refreshing transparently.
  const hasRefreshToken = Boolean(refreshCookie);
  const hasSession = hasValidAccessToken || hasRefreshToken;

  // If route is public (including login/register), always allow access.
  // We do NOT redirect authenticated users away from login/register —
  // this is annoying during development and testing.
  if (isPublicPath(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // If route is protected and no valid session at all, redirect to login
  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
