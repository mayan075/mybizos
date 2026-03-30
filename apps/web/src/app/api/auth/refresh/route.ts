import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const REFRESH_COOKIE_NAME = 'hararai_refresh_token';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * POST /api/auth/refresh
 *
 * Server-side proxy that reads the refresh token from an HttpOnly cookie,
 * sends it to the backend, and sets the new refresh token back as HttpOnly.
 * This keeps the refresh token out of JavaScript entirely.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token', code: 'UNAUTHORIZED', status: 401 },
      { status: 401 },
    );
  }

  try {
    const backendRes = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!backendRes.ok) {
      // Refresh failed — clear the cookie
      const errorData = await backendRes.json().catch(() => ({
        error: 'Refresh failed',
        code: 'UNAUTHORIZED',
        status: 401,
      }));
      const response = NextResponse.json(errorData, { status: backendRes.status });
      response.cookies.set(REFRESH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    const data = (await backendRes.json()) as {
      data: { token: string; refreshToken: string };
    };

    // Return the new access token in the JSON body
    // Set the new refresh token as HttpOnly cookie (JS can't touch it)
    const response = NextResponse.json({
      data: { token: data.data.token },
    });

    response.cookies.set(REFRESH_COOKIE_NAME, data.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Service unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 },
      { status: 503 },
    );
  }
}
