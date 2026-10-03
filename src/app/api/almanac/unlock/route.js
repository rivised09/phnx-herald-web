import { NextResponse } from 'next/server';
import {
  ALMANAC_COOKIE,
  ALMANAC_COOKIE_MAX_AGE,
  almanacToken,
  passwordMatches,
} from '../../../../lib/almanacAuth';

export async function POST(request) {
  let pass = '';
  try {
    const body = await request.json();
    pass = body?.pass ?? '';
  } catch {
    pass = '';
  }

  if (!process.env.ALMANAC_PASS) {
    return NextResponse.json({ error: 'Almanac is not configured' }, { status: 503 });
  }

  if (!passwordMatches(pass)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ALMANAC_COOKIE, almanacToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ALMANAC_COOKIE_MAX_AGE,
  });
  return res;
}