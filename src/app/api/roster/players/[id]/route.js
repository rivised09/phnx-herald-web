import { NextResponse } from 'next/server';
import { readPlayer } from '../../../../../lib/roster';

export const dynamic = 'force-dynamic';

/**
 * One player's stored profile, as JSON, for callers that read the roster in
 * place rather than navigating to it.
 *
 * `?date=` picks a snapshot: it is validated before it reaches the store, and
 * a date this player has no rows for falls back to the newest, so the worst
 * case is an older-looking answer rather than a 404.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const player = await readPlayer(id, searchParams.get('date'));
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    return NextResponse.json(player, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'The roster could not be read right now. Try again shortly.' },
      { status: 500 },
    );
  }
}
