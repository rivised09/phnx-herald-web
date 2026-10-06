'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PAGE_SIZE = 25;

const TABS = [
  ['overview', 'Overview'],
  ['players', 'Players'],
];

const number = (value) => {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  const absolute = Math.abs(value);
  const suffix = absolute >= 1e9 ? 'B' : absolute >= 1e6 ? 'M' : absolute >= 1e3 ? 'K' : '';
  const divisor = suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1;
  return `${sign}${(value / divisor).toFixed(suffix ? 1 : 0)}${suffix}`;
};

function Card({ title, children }) {
  return (
    <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{title}</p>
      {children}
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-100">{title}</h2>
      </div>
      {description ? <p className="max-w-xl text-xs leading-relaxed text-gray-500 sm:text-right">{description}</p> : null}
    </div>
  );
}

function PlayerTable({ players }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedAlliances, setSelectedAlliances] = useState([]);
  const [sort, setSort] = useState('power');
  const [page, setPage] = useState(1);
  const alliances = useMemo(
    () => [...new Set(players.map((player) => player.alliance).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [players],
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = players.filter((player) => {
      if (filter === 'high') return player.activity === 'Highly Active';
      if (filter === 'active') return player.activity === 'Active';
      if (filter === 'low') return player.activity === 'Low Activity';
      if (filter === 'dormant') return player.activity === 'Dormant';
      return true;
    }).filter((player) => selectedAlliances.length === 0 || selectedAlliances.includes(player.alliance))
      .filter((player) => !normalizedQuery || [player.name, player.id, player.alliance].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)));
    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'activity') return b.activityDays - a.activityDays || b.powerValue - a.powerValue;
      if (sort === 'kills') return (b.changes.kills || 0) - (a.changes.kills || 0);
      return b.powerValue - a.powerValue;
    });
  }, [filter, players, query, selectedAlliances, sort]);
  useEffect(() => {
    setPage(1);
  }, [filter, query, selectedAlliances, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagePlayers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, filtered.length);
  const filters = [['all', 'All'], ['high', 'Highly Active'], ['active', 'Active'], ['low', 'Low Activity'], ['dormant', 'Dormant']];

  return (
    <Card title="Player changes">
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-800 bg-black/10 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-600" />
          <span className="sr-only">Search players</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, game ID, or alliance" className="min-w-0 flex-1 bg-transparent text-sm text-neutral-200 outline-none placeholder:text-gray-600" />
        </label>
        <details className="relative shrink-0">
          <summary className="flex cursor-pointer list-none items-center rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 outline-none marker:hidden">
            {selectedAlliances.length ? `${selectedAlliances.length} alliance${selectedAlliances.length === 1 ? '' : 's'}` : 'All alliances'}
          </summary>
          <div className="absolute right-0 z-20 mt-1 max-h-64 min-w-52 overflow-y-auto rounded-md border border-gray-700 bg-discord-bg-darker p-2 shadow-xl">
            <label className="flex cursor-pointer items-center gap-2 border-b border-gray-800 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 hover:text-neutral-100">
              <input
                type="checkbox"
                checked={selectedAlliances.length === 0}
                onChange={() => setSelectedAlliances([])}
                className="accent-gray-100"
              />
              All alliances
            </label>
            {alliances.map((item) => (
              <label key={item} className="flex cursor-pointer items-center gap-2 px-2 py-2 text-xs text-gray-400 hover:bg-gray-500/10 hover:text-neutral-100">
                <input
                  type="checkbox"
                  checked={selectedAlliances.includes(item)}
                  onChange={() => setSelectedAlliances((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}
                  className="accent-gray-100"
                />
                <span className="truncate">{item}</span>
              </label>
            ))}
          </div>
        </details>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 outline-none">
          <option value="power">Sort: Power</option>
          <option value="activity">Sort: Activity</option>
          <option value="kills">Sort: Kill growth</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto border-b border-gray-800 pb-3">
        {filters.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${filter === key ? 'border-transparent bg-gray-100 text-neutral-950' : 'border-gray-800 text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
        Showing {filtered.length} of {players.length} players
        {query.trim() ? ` · search: ${query.trim()}` : ''}
        {selectedAlliances.length ? ` · alliances: ${selectedAlliances.join(', ')}` : ''}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="border-b border-gray-800 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
            <tr>{['Player', 'Power', 'Activity', 'Kill Δ', 'Death Δ', 'Heal Δ', 'Merit Δ'].map((label) => <th key={label} className="px-3 py-2 font-normal">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {pagePlayers.map((player) => (
              <tr
                key={player.id}
                tabIndex={0}
                role="link"
                onClick={() => router.push(`/leadership/player/${encodeURIComponent(player.id)}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/leadership/player/${encodeURIComponent(player.id)}`);
                  }
                }}
                className="cursor-pointer text-xs hover:bg-gray-500/[0.03] focus:bg-gray-500/[0.06] focus:outline-none"
              >
                <td className="px-3 py-3"><Link href={`/leadership/player/${encodeURIComponent(player.id)}`} className="text-neutral-100 transition hover:text-amber-300">{player.name}</Link><p className="font-mono text-[10px] text-gray-600">#{player.id}</p></td>
                <td className="px-3 py-3 font-mono text-amber-200">{player.power}</td>
                <td className="px-3 py-3 text-gray-300"><p>{player.activity}</p><p className="font-mono text-[10px] text-gray-600">{player.activityDays} active intervals</p></td>
                <td className="px-3 py-3 font-mono text-emerald-300">{number(player.changes.kills)}</td>
                <td className="px-3 py-3 font-mono text-gray-400">{number(player.changes.deaths)}</td>
                <td className="px-3 py-3 font-mono text-emerald-300">{number(player.changes.healing)}</td>
                <td className="px-3 py-3 font-mono text-emerald-300">{number(player.changes.merits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length ? <p className="py-8 text-center text-sm text-gray-500">No players match this filter.</p> : null}
      {filtered.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
            Showing {firstResult}-{lastResult} of {filtered.length} players
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-3 w-3" />
              Previous
            </button>
            <span className="min-w-16 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="inline-flex items-center gap-1 rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Overview({ data }) {
  const total = data.players.length || 1;
  const activePercent = Math.round((data.activityCounts.active / total) * 100);
  const highlyActive = data.players.filter((player) => player.activity === 'Highly Active').length;
  const activityBands = [
    { name: 'Highly active', players: highlyActive, fill: '#fbbf24' },
    { name: 'Active', players: data.activityCounts.active - highlyActive, fill: '#a1a1aa' },
    { name: 'Low activity', players: data.activityCounts.low, fill: '#71717a' },
    { name: 'Dormant', players: data.activityCounts.dormant, fill: '#3f3f46' },
  ];
  const killMovers = data.biggestKillGrowth.slice(0, 5).map((player) => ({
    name: player.name.length > 13 ? `${player.name.slice(0, 12)}…` : player.name,
    kills: Math.max(0, player.changes.kills || 0),
  }));
  const changes = [
    ['Power', data.recentChanges.power, 'text-amber-200'],
    ['Kills', data.recentChanges.kills, 'text-gray-200'],
    ['Deaths', data.recentChanges.deaths, 'text-gray-200'],
    ['Healing', data.recentChanges.healing, 'text-gray-200'],
    ['Merits', data.recentChanges.merits, 'text-gray-200'],
  ];
  return (
    <div className="space-y-5">
      <Card title="Kingdom activity">
        <div className="mt-3 grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">Reporting window</p>
            <p className="mt-2 font-mono text-sm text-gray-200">{data.periodStart}</p>
            <div className="my-1 flex items-center gap-2 text-gray-700"><span className="h-px flex-1 bg-gray-800" /><span className="text-[10px]">to</span><span className="h-px flex-1 bg-gray-800" /></div>
            <p className="font-mono text-sm text-gray-200">{data.periodEnd}</p>
            <div className="mt-4 flex gap-4 border-t border-gray-800 pt-3">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">Snapshots</p><p className="mt-1 font-mono text-sm text-gray-300">{data.snapshotCount}</p></div>
              <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">Lords</p><p className="mt-1 font-mono text-sm text-gray-300">{data.kingdom.lords}</p></div>
            </div>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-4">
            <div className="flex items-end justify-between gap-3">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">Active players</p><p className="mt-1 text-3xl font-semibold tracking-tight text-amber-300">{data.activityCounts.active}<span className="ml-1 text-sm font-normal text-gray-500">/ {data.players.length}</span></p></div>
              <span className="font-mono text-xl text-gray-300">{activePercent}<span className="ml-0.5 text-xs text-gray-600">%</span></span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${activePercent}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded border border-gray-800 px-3 py-2"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">Low activity</p><p className="mt-1 font-mono text-sm text-gray-300">{data.activityCounts.low}</p></div>
              <div className="rounded border border-gray-800 px-3 py-2"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">Dormant</p><p className="mt-1 font-mono text-sm text-gray-300">{data.activityCounts.dormant}</p></div>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card title="Kingdom summary">
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-gray-800 bg-gray-800 sm:grid-cols-3">
            <div className="col-span-2 bg-discord-bg-darker p-4 sm:col-span-1"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Kingdom power</p><p className="mt-2 text-xl font-semibold text-amber-200">{data.kingdom.power}</p><p className="mt-1 font-mono text-[10px] text-gray-500">{data.kingdom.powerChange} from baseline</p></div>
            {changes.slice(1).map(([label, value, color]) => <div key={label} className="bg-discord-bg-darker p-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label} change</p><p className={`mt-2 text-lg font-semibold ${color}`}>{number(value)}</p></div>)}
          </div>
        </Card>
        <Card title="Attention required">
          <div className="mt-3 space-y-2">
            {data.activityCounts.dormant > 0 ? <div className="rounded-md border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5"><p className="text-sm text-gray-300">{data.activityCounts.dormant} dormant players need review</p><p className="mt-1 text-xs text-gray-500">Open Players and filter by Dormant to review them.</p></div> : null}
            {data.activityCounts.low > 0 ? <div className="rounded-md border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5"><p className="text-sm text-gray-300">{data.activityCounts.low} players are showing low activity</p><p className="mt-1 text-xs text-gray-500">Check whether their recent progression needs follow-up.</p></div> : null}
            {data.biggestKillGrowth[0] ? <div className="rounded-md border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5"><p className="text-sm text-gray-300">{data.biggestKillGrowth[0].name} leads kill growth at {number(data.biggestKillGrowth[0].changes.kills)}</p><p className="mt-1 text-xs text-gray-500">Use the Players tab to compare the leading contributors.</p></div> : null}
            {!data.activityCounts.dormant && !data.activityCounts.low && !data.biggestKillGrowth[0] ? <p className="py-3 text-sm text-gray-500">No follow-up items were detected for this reporting window.</p> : null}
          </div>
        </Card>
      </div>
      <Card title="Activity intelligence">
        <div className="mt-3 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">Activity distribution</p>
            <div className="relative mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activityBands} dataKey="players" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={3} stroke="none" animationDuration={800}>
                    {activityBands.map((band) => <Cell key={band.name} fill={band.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} players`, name]} contentStyle={{ background: '#202225', border: '1px solid #3f4147', borderRadius: 4, fontSize: 11 }} labelStyle={{ color: '#d1d5db' }} itemStyle={{ color: '#d1d5db' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold text-neutral-100">{total}</span><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">players</span></div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {activityBands.map((band) => <div key={band.name} className="flex items-center gap-2 text-xs text-gray-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.fill }} /><span>{band.name}</span><span className="ml-auto font-mono text-gray-300">{band.players}</span></div>)}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">Top kill growth</p>
            <div className="mt-2 h-52 w-full">
              {killMovers.length ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={killMovers} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                  <defs><linearGradient id="killGrowthGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#b7791f" /><stop offset="100%" stopColor="#fbbf24" /></linearGradient></defs>
                  <CartesianGrid horizontal={false} stroke="#2b2d31" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={82} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(value) => number(value)} contentStyle={{ background: '#202225', border: '1px solid #3f4147', borderRadius: 4, fontSize: 11 }} labelStyle={{ color: '#d1d5db' }} />
                  <Bar dataKey="kills" fill="url(#killGrowthGradient)" radius={[0, 4, 4, 0]} barSize={20} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer> : <p className="py-8 text-sm text-gray-600">No kill growth recorded in this window.</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Players({ data }) {
  const readiness = [
    ['Combat active', data.readiness.ready, 'text-emerald-300'],
    ['Support', data.readiness.support, 'text-sky-300'],
    ['Low activity', data.readiness.lowActivity, 'text-amber-300'],
    ['Dormant', data.readiness.dormant, 'text-red-300'],
  ];
  return (
    <div className="space-y-5">
      <div>
        <SectionHeading eyebrow="Kingdom readiness" title="Players and readiness" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {readiness.map(([label, value, color]) => <div key={label} className="rounded-md border border-gray-800 bg-discord-bg-darker px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">{label}</p><p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p></div>)}
        </div>
      </div>
      <PlayerTable players={data.players} />
    </div>
  );
}

export default function LeadershipClient({ data }) {
  const [tab, setTab] = useState('overview');
  const content = { overview: <Overview data={data} />, players: <Players data={data} /> }[tab];
  return <div className="space-y-5"><div><div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">03 / Leadership</div><h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">Leadership</h1><p className="mt-2 text-sm text-gray-500">Server {data.server} · rolling 7 days: {data.periodStart} → {data.periodEnd}</p></div><nav className="-mx-4 flex items-end border-b border-gray-800 px-4 pt-2 sm:mx-0 sm:px-0" aria-label="Leadership sections">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`relative -mb-px shrink-0 border border-b-0 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${tab === key ? 'border-gray-800 bg-discord-bg-darker text-amber-300' : 'border-transparent text-gray-500 hover:text-amber-200'}`}>{label}</button>)}</nav>{content}</div>;
}
