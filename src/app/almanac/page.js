import { cookies } from 'next/headers';
import AlmanacGate from '../../components/AlmanacGate';
import AlmanacView from '../../components/AlmanacView';
import { ALMANAC_COOKIE, isUnlocked } from '../../lib/almanacAuth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Almanac',
  robots: { index: false, follow: false },
};

export default async function AlmanacPage() {
  const store = await cookies();
  const unlocked = isUnlocked(store.get(ALMANAC_COOKIE)?.value);

  if (!unlocked) return <AlmanacGate />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
            Archive
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
            Almanac
          </h1>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
          Channel history
        </p>
      </div>

      <AlmanacView />
    </div>
  );
}