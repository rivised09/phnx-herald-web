import { NextResponse } from 'next/server';

const ACCESS_CODE = process.env.DASHBOARD_ACCESS_CODE;
const AUTH_DISABLED = process.env.AUTH_ENABLED === 'false';

export function middleware(request) {
  if (AUTH_DISABLED) return NextResponse.next();
  if (!ACCESS_CODE) return NextResponse.next();

  const url = request.nextUrl.clone();

  if (request.cookies.get('phnx_access')?.value === '1') {
    return NextResponse.next();
  }

  if (url.searchParams.get('code') === ACCESS_CODE) {
    url.searchParams.delete('code');
    const res = NextResponse.redirect(url);
    res.cookies.set('phnx_access', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  return NextResponse.redirect(new URL('/unauthorized', request.url));
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/:path*',
    '/players/:path*',
    '/tracking/:path*',
    '/settings/:path*',
  ],
};