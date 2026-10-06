import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const MAX_DISCORD_ID = 40;
const MAX_DISCORD_NAME = 100;

async function authorized() {
  if (process.env.AUTH_ENABLED === 'false' || !process.env.DASHBOARD_ACCESS_CODE) return true;
  const store = await cookies();
  return store.get('phnx_access')?.value === '1';
}

function optionalText(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`Value must be ${maxLength} characters or fewer`);
  return text;
}

export async function PATCH(request, { params }) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON body is required' }, { status: 400 });
  }

  try {
    const lord = await prisma.lord.update({
      where: { id },
      data: {
        discordId: optionalText(body.discordId, MAX_DISCORD_ID),
        discordName: optionalText(body.discordName, MAX_DISCORD_NAME),
      },
      select: { id: true, discordId: true, discordName: true },
    });
    return NextResponse.json(lord);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Value must be')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'The player could not be updated' }, { status: 500 });
  }
}
