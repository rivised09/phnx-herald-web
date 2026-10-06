import Link from 'next/link';
import { ArrowLeft, Coins, History, Scale, Shield, Skull, Swords } from 'lucide-react';
import { notFound } from 'next/navigation';
import { readLeadership, readPlayer } from '../../../../lib/roster';

function Change({ label, value }) {
  return (
    <div className="bg-discord-bg-darker px-3 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</p>
      <p className={`mt-1 font-mono text-sm ${value > 0 ? 'text-amber-200' : 'text-gray-300'}`}>
        {value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${Number(value).toLocaleString()}`}
      </p>
    </div>
  );
}

function AdvancedWarStats({ section }) {
  if (!section) return null;
  const icons = {
    'Cavalry Merits': <img src="/icons/cavalry.svg" alt="" className="h-8 w-8 brightness-0 invert" />,
    'Infantry Merits': <img src="/icons/infantry.svg" alt="" className="h-8 w-8 brightness-0 invert" />,
    'Mage Merits': <img src="/icons/mage.svg" alt="" className="h-8 w-8 brightness-0 invert" />,
    'Marksman Merits': <img src="/icons/archer.svg" alt="" className="h-8 w-8 brightness-0 invert" />,
    'Other Merits': <Swords className="h-7 w-7 text-white" strokeWidth={1.7} />,
    'T4/T5 Units Dead': <Skull className="h-7 w-7 text-white" strokeWidth={1.7} />,
    'T4/T5 Units Rss Healed': <Coins className="h-7 w-7 text-white" strokeWidth={1.7} />,
  };
  const rows = section.rows.filter((row) => [
    'Cavalry Merits',
    'Infantry Merits',
    'Mage Merits',
    'Marksman Merits',
    'Other Merits',
    'T4/T5 Units Dead',
    'T4/T5 Units Rss Healed',
  ].includes(row.label));
  return (
    <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">Advanced War Stats</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-16 items-center gap-3 rounded border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5">
            {icons[row.label] || <span className="flex h-8 w-8 items-center justify-center rounded border border-gray-700 font-mono text-[10px] text-white">•</span>}
            <div className="min-w-0">
              <p className="text-xs leading-tight text-gray-400">{row.label}</p>
              <p className="mt-1 font-mono text-sm text-gray-200">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WarStats({ section }) {
  if (!section) return null;
  const icons = {
    'Kill to Heal Ratio': Swords,
    'Merit to Power Ratio': Scale,
    Merits: Coins,
    'Units Dead': Skull,
    'Units Healed': Shield,
    'Units Killed': Swords,
  };
  const rows = section.rows.filter((row) => icons[row.label]);
  if (!rows.length) return null;
  return (
    <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">War Stats</h2>
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:grid-cols-3">
        {rows.map((row) => {
          const Icon = icons[row.label];
          return (
            <div key={row.label} className="bg-discord-bg-darker px-3 py-3">
              <Icon className="h-7 w-7 text-white" strokeWidth={1.7} />
              <p className="mt-2 text-xs text-gray-400">{row.label}</p>
              <p className="mt-1 font-mono text-sm text-neutral-100">{row.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LeadershipPlayerView({ profile, player, dashboard }) {
  const changes = player.changes || {};
  const warStats = profile.sections?.find((section) => section.section === 'War Stats');
  const advancedWarStats = profile.sections?.find((section) => section.section === 'Advanced War Stats');
  const sourceSections = (profile.sections || []).filter((section) => section.rows?.length && !['War Stats', 'Advanced War Stats'].includes(section.section));
  return (
    <div className="space-y-5">
      <Link href="/leadership" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500 transition hover:text-amber-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to leadership
      </Link>
      <section className="overflow-hidden rounded-md border border-gray-800 bg-discord-bg-darker">
        <div className="border-b border-gray-800 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">Leadership player profile</p>
              <h1 className="mt-1 truncate text-2xl font-semibold text-neutral-100">{profile.name}</h1>
              <p className="mt-1 font-mono text-[10px] text-gray-600">Game ID #{profile.id} · Server {dashboard.server}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200">{player.activity}</span>
                <span className="rounded border border-gray-700/70 bg-gray-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-300">{player.status}</span>
                <span className="rounded border border-gray-700/70 bg-gray-500/5 px-2 py-1 font-mono text-[10px] text-gray-400">{player.activityDays} active intervals</span>
                <span className="rounded border border-gray-700/70 bg-gray-500/5 px-2 py-1 text-xs text-gray-400">{player.alliance}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:min-w-52">
              <div className="bg-discord-bg-darker px-3 py-2"><p className="font-mono text-[9px] uppercase text-gray-600">Power</p><p className="mt-1 font-mono text-sm text-amber-200">{player.power}</p></div>
              <div className="bg-discord-bg-darker px-3 py-2"><p className="font-mono text-[9px] uppercase text-gray-600">Rank</p><p className="mt-1 font-mono text-sm text-gray-300">#{profile.rank || '—'}</p></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-4">
          <Change label="Power Δ" value={player.powerChange} />
          <Change label="Kills Δ" value={changes.kills} />
          <Change label="Deaths Δ" value={changes.deaths} />
          <Change label="Healing Δ" value={changes.healing} />
        </div>
      </section>
      <WarStats section={warStats} />
      <AdvancedWarStats section={advancedWarStats} />
      <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
        <div className="flex items-center gap-2"><History className="h-4 w-4 text-gray-500" /><h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">Player context</h2></div>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Previous names</p><p className="mt-2 text-sm text-gray-400">{profile.previousNames?.length ? profile.previousNames.join(' · ') : 'No previous names recorded.'}</p></div>
        </div>
      </section>
      {sourceSections.length ? <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-gray-500" /><h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">Source metrics</h2></div><div className="mt-3 grid gap-4 md:grid-cols-2">{sourceSections.map((section) => <div key={section.section || 'profile'}><h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{section.section || 'Profile'}</h3><dl className="mt-2 divide-y divide-gray-800">{section.rows.slice(0, 12).map((row) => <div key={row.label} className="flex justify-between gap-3 py-1.5 text-xs"><dt className="truncate text-gray-400">{row.label}</dt><dd className="font-mono text-gray-200">{row.value}</dd></div>)}</dl></div>)}</div></section> : null}
    </div>
  );
}

export default async function LeadershipPlayerPage({ params }) {
  const { id } = await params;
  const [profile, dashboard] = await Promise.all([readPlayer(id), readLeadership()]);
  const player = dashboard?.players?.find((item) => item.id === String(id));
  if (!profile || !dashboard || !player) notFound();
  return <LeadershipPlayerView profile={profile} player={player} dashboard={dashboard} />;
}
