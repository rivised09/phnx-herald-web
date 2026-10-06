import { NextResponse } from 'next/server';
import { readAlliance } from '../../../../../lib/roster';

export const dynamic = 'force-dynamic';

/**
 * One alliance's newest stored figures and members, as JSON, for callers that
 * read the roster in place rather than navigating to it. Only the most recent
 * snapshot exists here - the player page is the one that keeps a date list.
 */
export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const alliance = await readAlliance(id);
    if (!alliance) return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    return NextResponse.json(alliance, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'The roster could not be read right now. Try again shortly.' },
      { status: 500 },
    );
  }
}
