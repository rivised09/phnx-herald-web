import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Drops the roster data cache.
 *
 * The pages read the bucket behind a short Next cache; a scrape replaces the
 * bucket underneath it. The refresh button calls this before re-reading the
 * page, because `router.refresh()` alone goes through the same cache entry -
 * which is why fresh data used to need a hard reload or a date switch.
 *
 * Nothing is read here and nothing is stored, so there is nothing to authorise
 * beyond the same-origin check: a third-party page must not be able to turn
 * every visitor's next request into a cold roster read.
 */
export async function POST(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== host) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  revalidateTag('roster');
  return NextResponse.json({ ok: true });
}
