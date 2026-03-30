import { NextRequest, NextResponse } from 'next/server';

const REFRESH_COOKIE_NAME = 'hararai_refresh_token';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * POST /api/auth/session
 *
 * Called by the frontend after login/register to store the refresh token
 * in a secure HttpOnly cookie. The access token stays in localStorage
 * (short-lived, 15 min), but the refresh token is HttpOnly-only.
 */
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = (await request.json()) as { refreshToken?: string };

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Missing refresh token', code: 'BAD_REQUEST', status: 400 },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request', code: 'BAD_REQUEST', status: 400 },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/auth/session
 *
 * Clears the HttpOnly refresh token cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
