import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function authorized() {
  if (process.env.AUTH_ENABLED === 'false' || !process.env.DASHBOARD_ACCESS_CODE) return true;
  const store = await cookies();
  return store.get('phnx_access')?.value === '1';
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lords = await prisma.lord.findMany({
    orderBy: [{ name: 'asc' }, { sourceId: 'asc' }],
    select: {
      id: true,
      sourceId: true,
      name: true,
      discordId: true,
      discordName: true,
      server: { select: { serverNumber: true } },
    },
  });

  return NextResponse.json({
    players: lords.map((lord) => ({
      id: lord.id,
      gameId: lord.sourceId.toString(),
      name: lord.name,
      discordId: lord.discordId,
      discordName: lord.discordName,
      server: lord.server.serverNumber,
    })),
  });
}
