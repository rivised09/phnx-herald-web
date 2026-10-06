'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Info, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getSettings, updateSettings } from '../../lib/api';

const PAGE_SIZE = 25;
const MAX_TEAM_PLAYERS = 30;
const MAX_TEAM_RESERVES = 15;
const ROW_DRAFT_STORAGE_KEY = 'phoenix-herald:row-roster-draft';

const TABS = [
  ['overview', 'Overview'],
  ['players', 'Players'],
  ['row', 'RoW'],
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
      <Card title="Server activity trend">
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">Players showing measurable progression between snapshot captures.</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">{data.activityTimeline?.length || 0} snapshots</p>
        </div>
        {data.activityTimeline?.length > 1 ? <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.activityTimeline} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#2b2d31" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={32} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value} players`, 'Active players']} labelFormatter={(value) => `Snapshot ${value}`} contentStyle={{ background: '#202225', border: '1px solid #3f4147', borderRadius: 4, fontSize: 11 }} labelStyle={{ color: '#d1d5db' }} itemStyle={{ color: '#fbbf24' }} />
              <Line type="monotone" dataKey="activePlayers" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: '#202225', stroke: '#fbbf24', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#fbbf24' }} />
            </LineChart>
          </ResponsiveContainer>
        </div> : <p className="mt-6 py-8 text-center text-sm text-gray-600">At least two snapshots are required to show the activity trend.</p>}
      </Card>
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

function percentile(value, values) {
  if (value === null || value === undefined || !values.length) return null;
  if (values.length === 1) return 100;
  const below = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;
  return Math.round(((below + (equal - 1) / 2) / (values.length - 1)) * 100);
}

function PlayerCombobox({ title, candidates, selectedId, unavailableIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const selectedPlayer = candidates.find((player) => player.id === selectedId);
  const filtered = candidates
    .filter((player) => !unavailableIds.has(player.id))
    .filter((player) => !query.trim() || `${player.name} ${player.id}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 30);

  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        type="text"
        value={open ? query : (selectedPlayer?.name || '')}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder={`Search ${title.toLowerCase()}`}
        aria-label={`Search player for ${title}`}
        className="block w-full min-w-0 rounded border border-gray-800 bg-discord-bg-darker px-2 py-1 text-xs text-gray-300 outline-none placeholder:text-gray-700 focus:border-gray-600"
      />
      {open ? (
        <div className="absolute right-0 z-40 mt-1 max-h-48 w-52 overflow-y-auto rounded-md border border-gray-700 bg-discord-bg-darker p-1 shadow-xl">
          <button type="button" onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className="w-full rounded px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-500/10 hover:text-gray-300">Unassigned</button>
          {filtered.map((player) => (
            <button key={player.id} type="button" onClick={() => { onChange(player.id); setQuery(''); setOpen(false); }} className="w-full truncate rounded px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-gray-500/10 hover:text-amber-300">
              <span className="block truncate">{player.name}</span>
              <span className="block font-mono text-[9px] text-gray-600">#{player.id}</span>
            </button>
          ))}
          {!filtered.length ? <p className="px-2 py-2 text-xs text-gray-600">No matching players.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ data }) {
  const [rowTab, setRowTab] = useState('saved');
  const [generateStep, setGenerateStep] = useState(1);
  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState({});
  const [selected, setSelected] = useState([]);
  const [titleAssignments, setTitleAssignments] = useState({});
  const [minimumActivity, setMinimumActivity] = useState(1);
  const [combatOnly, setCombatOnly] = useState(false);
  const [savedRoster, setSavedRoster] = useState(null);
  const [savingRoster, setSavingRoster] = useState(false);
  const [rosterSaveError, setRosterSaveError] = useState('');
  const [candidatePage, setCandidatePage] = useState(1);
  const [memberQuery, setMemberQuery] = useState('');
  const [expandedScoreId, setExpandedScoreId] = useState(null);
  const [filterInfo, setFilterInfo] = useState(null);
  const [distributionOverrides, setDistributionOverrides] = useState({});
  const [additionalCandidateIds, setAdditionalCandidateIds] = useState([]);
  const [additionalCandidateQuery, setAdditionalCandidateQuery] = useState('');
  const [additionalCandidateOpen, setAdditionalCandidateOpen] = useState(false);
  const [additionalTeamIndex, setAdditionalTeamIndex] = useState(0);
  const [additionalRole, setAdditionalRole] = useState('player');
  const [draftReady, setDraftReady] = useState(false);

  const candidates = useMemo(() => {
    const base = data.players.map((player) => {
      const kills = Math.max(0, player.changes.kills || 0);
      const healing = Math.max(0, player.changes.healing || 0);
      const merits = Math.max(0, player.changes.merits || 0);
      const deaths = Math.max(0, player.changes.deaths || 0);
      const row = player.row || {};
      const toc = player.toc || {};
      const rowPerformance = row.score ?? (row.matches > 0 ? ((row.wins || 0) / row.matches) * 100 : null);
      const competitive = toc.winRate ?? (toc.battles > 0 ? ((toc.wins || 0) / toc.battles) * 100 : null);
      return {
        ...player,
        rowPerformance: rowPerformance === null ? null : Number(rowPerformance),
        rowMatches: row.matches || 0,
        competitive: competitive === null ? null : Number(competitive),
        combatRaw: kills * 2 + healing + merits * 10 - deaths * 0.25,
        consistencyRaw: player.activityDays,
        capabilityRaw: player.powerValue,
      };
    });
    const values = (key) => base.map((player) => player[key]).filter((value) => value !== null && value !== undefined && Number.isFinite(value));
    const historicalValues = values('rowPerformance');
    const combatValues = values('combatRaw');
    const consistencyValues = values('consistencyRaw');
    const competitiveValues = values('competitive');
    const capabilityValues = values('capabilityRaw');
    return base.map((player) => {
      const components = {
        historical: percentile(player.rowPerformance, historicalValues),
        combat: percentile(player.combatRaw, combatValues),
        consistency: percentile(player.consistencyRaw, consistencyValues),
        competitive: percentile(player.competitive, competitiveValues),
        capability: percentile(player.capabilityRaw, capabilityValues),
      };
      const weights = { historical: 40, combat: 25, consistency: 15, competitive: 10, capability: 10 };
      const availableWeight = Object.entries(components).reduce((sum, [key, value]) => sum + (value === null ? 0 : weights[key]), 0);
      const score = availableWeight ? Math.round(Object.entries(components).reduce((sum, [key, value]) => sum + (value === null ? 0 : value * weights[key]), 0) / availableWeight) : null;
      const recommendation = score === null ? 'Insufficient data' : score >= 70 ? 'Strong Candidate' : score >= 45 ? 'Consider' : 'Watch';
      return {
        ...player,
        components,
        score,
        combatScore: components.combat,
        strength: recommendation,
        provisional: components.historical === null || components.competitive === null,
      };
    }).filter((player) => player.activityDays >= minimumActivity && (!combatOnly || player.combatRaw > 0))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.powerValue - a.powerValue);
  }, [combatOnly, data.players, minimumActivity]);

  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const titles = ['Leader', 'Warmaster', 'Scholar', 'Envoy', 'Beastmaster', 'Saintess'];
  const titlePlayerIds = new Set(Object.values(titleAssignments).filter(Boolean));
  const candidatePool = candidates.filter((player) => !titlePlayerIds.has(player.id));
  const filteredCandidatePool = candidatePool.filter((player) => !memberQuery.trim() || `${player.name} ${player.id} ${player.alliance || ''}`.toLowerCase().includes(memberQuery.trim().toLowerCase()));
  const selectedPlayers = candidatePool.filter((player) => selected.includes(player.id));
  const candidatePageCount = Math.max(1, Math.ceil(filteredCandidatePool.length / PAGE_SIZE));
  const pageCandidates = filteredCandidatePool.slice((candidatePage - 1) * PAGE_SIZE, candidatePage * PAGE_SIZE);
  const titleSlots = Array.from({ length: teamCount }, (_, teamIndex) => ({
    teamIndex,
    titles,
  }));
  const rosterPlayers = candidates.filter((player) => selected.includes(player.id) || titlePlayerIds.has(player.id));
  const setTitlePlayer = (teamIndex, title, id) => {
    const key = `${teamIndex}:${title}`;
    setTitleAssignments((current) => {
      const next = { ...current };
      if (id) next[key] = id;
      else delete next[key];
      return next;
    });
    if (id) setSelected((current) => current.filter((playerId) => playerId !== id));
  };
  const setTeamName = (teamIndex, value) => {
    setTeamNames((current) => ({ ...current, [teamIndex]: value }));
  };
  const automaticAssignments = useMemo(() => {
    const assignments = {};
    const totals = Array.from({ length: teamCount }, () => ({ players: 0, reserves: 0, power: 0 }));
    titles.forEach((title) => {
      for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
        const id = titleAssignments[`${teamIndex}:${title}`];
        if (id) {
          assignments[id] = { teamIndex, role: 'player' };
          totals[teamIndex].players += 1;
          const player = candidates.find((item) => item.id === id);
          totals[teamIndex].power += player?.powerValue || 0;
        }
      }
    });
    [...rosterPlayers]
      .filter((player) => !titlePlayerIds.has(player.id))
      .sort((a, b) => b.powerValue - a.powerValue)
      .forEach((player) => {
        const availablePlayers = totals.filter((team) => team.players < MAX_TEAM_PLAYERS);
        const pool = availablePlayers.length ? availablePlayers : totals.filter((team) => team.reserves < MAX_TEAM_RESERVES);
        if (!pool.length) return;
        const team = pool.reduce((lowest, current) => current.power < lowest.power ? current : lowest, pool[0]);
        const teamIndex = totals.indexOf(team);
        const role = availablePlayers.length ? 'player' : 'reserve';
        assignments[player.id] = { teamIndex, role };
        team[role === 'player' ? 'players' : 'reserves'] += 1;
        team.power += player.powerValue;
      });
    return assignments;
  }, [candidates, rosterPlayers, teamCount, titleAssignments, titlePlayerIds]);

  const assignments = useMemo(() => ({ ...automaticAssignments, ...distributionOverrides }), [automaticAssignments, distributionOverrides]);
  const teams = useMemo(() => {
    const result = Array.from({ length: teamCount }, (_, index) => ({
      name: teamNames[index]?.trim() || `Team ${index + 1}`,
      titles: [],
      players: [],
      reserves: [],
      power: 0,
      score: 0,
    }));
    Object.entries(assignments).forEach(([id, assignment]) => {
      const player = candidates.find((item) => item.id === id);
      const team = result[assignment.teamIndex];
      if (!player || !team || titlePlayerIds.has(id)) return;
      if (assignment.role === 'reserve') team.reserves.push(player);
      else team.players.push(player);
      team.power += player.powerValue;
      team.score += player.score || 0;
    });
    titles.forEach((title) => {
      for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
        const id = titleAssignments[`${teamIndex}:${title}`];
        const player = id ? candidates.find((item) => item.id === id) : null;
        if (player && result[teamIndex]) result[teamIndex].titles.push({ title, player });
      }
    });
    return result;
  }, [assignments, candidates, teamCount, teamNames, titleAssignments]);

  const setDistributionAssignment = (playerId, teamIndex, role) => {
    setDistributionOverrides((current) => ({ ...current, [playerId]: { teamIndex, role } }));
  };
  const assignedIds = new Set(Object.keys(assignments));
  const availableForDistribution = candidatePool.filter((player) => !assignedIds.has(player.id));
  const filteredAdditionalCandidates = availableForDistribution.filter((player) =>
    !additionalCandidateQuery.trim()
    || `${player.name} ${player.id} ${player.alliance || ''}`.toLowerCase().includes(additionalCandidateQuery.trim().toLowerCase()),
  );
  const teamHasCapacity = (team, role) => role === 'player'
    ? team.players.length + team.titles.length < MAX_TEAM_PLAYERS
    : team.reserves.length < MAX_TEAM_RESERVES;
  const canAssign = (playerId, teamIndex, role) => {
    const current = assignments[playerId];
    if (current?.teamIndex === teamIndex && current.role === role) return true;
    const team = teams[teamIndex];
    if (!team) return false;
    const currentTeam = current ? teams[current.teamIndex] : null;
    const playerAvailable = teamHasCapacity(team, role)
      || (current?.teamIndex === teamIndex && current.role !== role);
    if (!playerAvailable) return false;
    if (currentTeam && current.teamIndex !== teamIndex && !teamHasCapacity(team, role)) return false;
    return true;
  };
  const canAddAdditionalCandidates = additionalCandidateIds.length > 0
    && additionalCandidateIds.every((id) => canAssign(id, additionalTeamIndex, additionalRole))
    && (additionalRole === 'player'
      ? teams[additionalTeamIndex]?.players.length + teams[additionalTeamIndex]?.titles.length + additionalCandidateIds.length <= MAX_TEAM_PLAYERS
      : teams[additionalTeamIndex]?.reserves.length + additionalCandidateIds.length <= MAX_TEAM_RESERVES);

  useEffect(() => {
    setCandidatePage(1);
  }, [minimumActivity, combatOnly, titleAssignments, memberQuery]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ROW_DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (Number.isInteger(draft.generateStep) && draft.generateStep >= 1 && draft.generateStep <= 3) setGenerateStep(draft.generateStep);
        if (draft.rowTab === 'generate' || draft.rowTab === 'saved') setRowTab(draft.rowTab);
        if (Number.isInteger(draft.teamCount) && draft.teamCount >= 1 && draft.teamCount <= 20) setTeamCount(draft.teamCount);
        if (draft.teamNames && typeof draft.teamNames === 'object') setTeamNames(draft.teamNames);
        if (Array.isArray(draft.selected)) setSelected(draft.selected);
        if (draft.titleAssignments && typeof draft.titleAssignments === 'object') setTitleAssignments(draft.titleAssignments);
        if (Number.isInteger(draft.minimumActivity)) setMinimumActivity(draft.minimumActivity);
        if (typeof draft.combatOnly === 'boolean') setCombatOnly(draft.combatOnly);
        if (typeof draft.memberQuery === 'string') setMemberQuery(draft.memberQuery);
        if (Number.isInteger(draft.candidatePage) && draft.candidatePage >= 1) setCandidatePage(draft.candidatePage);
        if (draft.distributionOverrides && typeof draft.distributionOverrides === 'object') setDistributionOverrides(draft.distributionOverrides);
      }
    } catch (error) {
      console.warn('[ROW] Unable to restore roster draft:', error);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      window.localStorage.setItem(ROW_DRAFT_STORAGE_KEY, JSON.stringify({
        rowTab,
        generateStep,
        teamCount,
        teamNames,
        selected,
        titleAssignments,
        minimumActivity,
        combatOnly,
        memberQuery,
        candidatePage,
        distributionOverrides,
      }));
    } catch (error) {
      console.warn('[ROW] Unable to persist roster draft:', error);
    }
  }, [
    draftReady,
    rowTab,
    generateStep,
    teamCount,
    teamNames,
    selected,
    titleAssignments,
    minimumActivity,
    combatOnly,
    memberQuery,
    candidatePage,
    distributionOverrides,
  ]);

  const selectAllVisible = () => setSelected((current) => [...new Set([...current, ...filteredCandidatePool.map((player) => player.id)])]);
  const unselectAllVisible = () => {
    const visibleIds = new Set(filteredCandidatePool.map((player) => player.id));
    setSelected((current) => current.filter((id) => !visibleIds.has(id)));
  };

  useEffect(() => {
    getSettings().then((result) => setSavedRoster(result.rowRoster || null)).catch(() => {});
  }, []);

  async function saveRoster() {
    setSavingRoster(true);
    setRosterSaveError('');
    try {
      const result = await updateSettings({
        rowRoster: {
          savedAt: new Date().toISOString(),
          teamCount,
          teamNames,
          titles: titleAssignments,
          teams: teams.map((team) => ({
            name: team.name,
            titles: team.titles.map(({ title, player }) => ({ title, id: player.id, name: player.name })),
            players: team.players.map((player) => ({ id: player.id, name: player.name })),
            reserves: team.reserves.map((player) => ({ id: player.id, name: player.name })),
            power: team.power,
            score: team.score,
          })),
        },
      });
      setSavedRoster(result.rowRoster);
    } catch (error) {
      setRosterSaveError(error instanceof Error ? error.message : 'Unable to save the roster.');
    } finally {
      setSavingRoster(false);
    }
  }

  const steps = [
    ['01', 'Setup', 'Teams and title assignments'],
    ['02', 'Members', 'Confirm the roster pool'],
    ['03', 'Distribution', 'Automatic team balancing'],
  ];

  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="RoW / Candidate finder" title="RoW roster management" description="Open a saved roster or generate a new roster through a guided setup, member selection, and automatic distribution flow." />
      <nav className="flex border-b border-gray-800" aria-label="RoW sections">
        {[['saved', 'Saved roster'], ['generate', 'Generate roster']].map(([key, label]) => <button key={key} type="button" onClick={() => setRowTab(key)} className={`border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${rowTab === key ? 'border-amber-400 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{label}</button>)}
      </nav>
      {rowTab === 'saved' ? (
        <Card title="Saved roster">
          {savedRoster ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{savedRoster.teams.map((team) => <div key={team.name} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><div className="flex justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">{team.name}</span><span className="font-mono text-[10px] text-amber-300">{team.players.length + team.titles.length} players</span></div><p className="mt-1 font-mono text-[10px] text-gray-600">Power {number(team.power)} · score {team.score}</p><p className="mt-2 text-xs leading-relaxed text-gray-400">{team.players.map((player) => player.name).join(' · ') || 'No automatic members.'}</p></div>)}</div> : <div className="flex min-h-56 flex-col items-center justify-center text-center"><p className="text-sm text-gray-300">No saved RoW roster</p><p className="mt-2 max-w-md text-xs leading-relaxed text-gray-600">Generate and save a roster to make the team assignments available across leadership devices.</p><button type="button" onClick={() => setRowTab('generate')} className="mt-4 rounded border border-gray-700 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 transition hover:border-amber-400">Generate roster</button></div>}
        </Card>
      ) : (
      <>
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map(([step, title, description], index) => <button key={step} type="button" onClick={() => setGenerateStep(index + 1)} className={`flex gap-3 rounded-md border p-3 text-left transition ${generateStep === index + 1 ? 'border-amber-400/60 bg-amber-400/[0.04]' : 'border-gray-800 bg-discord-bg-darker hover:border-gray-700'}`}><span className={`font-mono text-xs ${generateStep === index + 1 ? 'text-amber-300' : 'text-gray-600'}`}>{step}</span><span><span className="block text-sm text-gray-200">{title}</span><span className="mt-1 block text-xs text-gray-600">{description}</span></span></button>)}
      </div>
      {generateStep === 1 ? <Card title="01 / Team setup">
        <p className="mt-2 text-xs leading-relaxed text-gray-500">Choose how many teams to create, then assign the six RoW titles to players. Title holders are reserved and will not be added as automatic members.</p>
        <div className="mt-4 flex items-center gap-3"><label className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Number of teams <input type="number" min="1" max="20" value={teamCount} onChange={(event) => { const nextCount = Math.max(1, Math.min(20, Number(event.target.value) || 1)); setTeamCount(nextCount); setTitleAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key.split(':')[0]) < nextCount))); }} className="ml-2 w-16 rounded border border-gray-800 bg-transparent px-2 py-1.5 text-center text-gray-200 outline-none" /></label></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{titleSlots.map(({ teamIndex }) => <div key={teamIndex} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><label className="block"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Team {teamIndex + 1} name</span><input value={teamNames[teamIndex] || ''} onChange={(event) => setTeamName(teamIndex, event.target.value)} placeholder={`Team ${teamIndex + 1}`} className="mt-2 w-full rounded border border-gray-800 bg-discord-bg-darker px-2 py-1.5 text-sm text-gray-200 outline-none placeholder:text-gray-700 focus:border-gray-600" /></label><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Titles</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{titles.map((title) => { const key = `${teamIndex}:${title}`; const currentId = titleAssignments[key] || ''; const unavailable = new Set([...titlePlayerIds].filter((id) => id !== currentId)); return <label key={title} className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 text-xs text-gray-500"><span className="truncate">{title}</span><PlayerCombobox title={title} candidates={candidates} selectedId={currentId} unavailableIds={unavailable} onChange={(id) => setTitlePlayer(teamIndex, title, id)} /></label>; })}</div></div>)}</div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setGenerateStep(2)} className="rounded border border-amber-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/[0.06]">Next: select members</button></div>
      </Card> : null}
      {generateStep === 2 ? <Card title="02 / Member selection">
        <div className="mt-2 rounded-md border border-gray-800 bg-gray-500/[0.03] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm text-gray-200">Choose your members</p><p className="mt-1 text-xs text-gray-600">Title holders are already assigned and do not appear here. Candidates are ranked by score.</p></div>
            <div className="flex items-baseline gap-2"><span className="font-mono text-2xl text-amber-300">{selectedPlayers.length}</span><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">selected</span></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="flex items-center gap-2 rounded border border-gray-800 bg-discord-bg-darker px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-gray-600" /><span className="sr-only">Search candidates</span><input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Search name, game ID, or alliance" className="min-w-0 flex-1 bg-transparent text-sm text-gray-300 outline-none placeholder:text-gray-700" /></label>
            <button type="button" onClick={selectAllVisible} disabled={!filteredCandidatePool.length} className="rounded border border-gray-800 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400 hover:border-gray-600 hover:text-amber-300 disabled:opacity-30">Select {memberQuery.trim() ? 'matches' : 'all'}</button>
            <button type="button" onClick={unselectAllVisible} disabled={!filteredCandidatePool.length} className="rounded border border-gray-800 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400 hover:border-gray-600 hover:text-amber-300 disabled:opacity-30">Clear {memberQuery.trim() ? 'matches' : 'all'}</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <div className="relative flex items-center gap-2"><label className="flex items-center gap-2">Activity<select value={minimumActivity} onChange={(event) => setMinimumActivity(Number(event.target.value))} className="rounded border border-gray-800 bg-discord-bg-darker px-2 py-1 text-xs text-gray-300 outline-none"><option value={0}>Any</option><option value={1}>1+ intervals</option><option value={3}>3+ intervals</option><option value={5}>5+ intervals</option></select></label><button type="button" onClick={() => setFilterInfo((current) => current === 'activity' ? null : 'activity')} className="text-gray-600 transition hover:text-amber-300" aria-label="Activity filter information" aria-expanded={filterInfo === 'activity'}><Info className="h-3.5 w-3.5" /></button>{filterInfo === 'activity' ? <div className="absolute left-0 top-8 z-30 w-64 rounded border border-gray-700 bg-discord-bg-darker p-3 text-[11px] leading-relaxed text-gray-400 shadow-xl">Activity intervals count snapshot periods where the player showed measurable progression, such as power, kills, merits, or healing increases.</div> : null}</div>
            <div className="relative flex items-center gap-2"><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={combatOnly} onChange={(event) => setCombatOnly(event.target.checked)} className="accent-amber-400" /> Recent combat only</label><button type="button" onClick={() => setFilterInfo((current) => current === 'combat' ? null : 'combat')} className="text-gray-600 transition hover:text-amber-300" aria-label="Recent combat information" aria-expanded={filterInfo === 'combat'}><Info className="h-3.5 w-3.5" /></button>{filterInfo === 'combat' ? <div className="absolute left-0 top-8 z-30 w-64 rounded border border-gray-700 bg-discord-bg-darker p-3 text-[11px] leading-relaxed text-gray-400 shadow-xl">Shows only players with positive recent combat movement, based on kills, healing, merits, and deaths in the reporting window.</div> : null}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-3"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">{filteredCandidatePool.length} available{memberQuery.trim() ? ` · matching “${memberQuery.trim()}”` : ''}</p><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">Page {candidatePage} / {candidatePageCount}</p></div>
        </div>
        <div className="mt-3 overflow-hidden rounded-md border border-gray-800">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_90px] gap-3 border-b border-gray-800 bg-gray-500/[0.03] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600 sm:grid"><span>Player</span><span>Recommendation</span><span className="text-right">Score</span></div>
          <div className="divide-y divide-gray-800/80">
            {pageCandidates.map((player) => <div key={player.id} className="border-b border-gray-800/80 last:border-0"><div role="button" tabIndex={0} onClick={() => toggleSelected(player.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSelected(player.id); } }} className="flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-gray-500/[0.04]"><input type="checkbox" checked={selected.includes(player.id)} onChange={() => toggleSelected(player.id)} onClick={(event) => event.stopPropagation()} className="h-4 w-4 shrink-0 accent-amber-400" /><span className="min-w-0 flex-1"><span className="block truncate text-sm text-neutral-200">{player.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-gray-600">{player.id} · {player.alliance || 'Unaffiliated'} · {player.activity}</span></span><span className={`hidden text-right font-mono text-[10px] uppercase tracking-[0.12em] sm:block ${player.strength === 'Strong Candidate' ? 'text-amber-300' : player.strength === 'Consider' ? 'text-gray-300' : 'text-gray-600'}`}>{player.strength}</span><span className="w-14 text-right font-mono text-sm text-amber-200">{player.score === null ? '—' : player.score}</span><button type="button" onClick={(event) => { event.stopPropagation(); setExpandedScoreId((current) => current === player.id ? null : player.id); }} className="shrink-0 rounded border border-gray-800 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-gray-500 transition hover:border-gray-600 hover:text-amber-300">{expandedScoreId === player.id ? 'Hide breakdown' : 'View score breakdown'}</button></div>{expandedScoreId === player.id ? <div className="mx-3 mb-3 rounded border border-gray-800 bg-black/10 p-3"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Scoreboard</p><p className="mt-1 text-sm text-gray-200">{player.name}</p></div><p className="font-mono text-xl text-amber-300">{player.score === null ? '—' : `${player.score}/100`}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-5">{[['RoW performance', player.components.historical, '40%'], ['Recent combat', player.components.combat, '25%'], ['Consistency', player.components.consistency, '15%'], ['Competitive', player.components.competitive, '10%'], ['Capability', player.components.capability, '10%']].map(([label, value, weight]) => <div key={label} className="rounded border border-gray-800 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="text-[11px] text-gray-400">{label}</span><span className="font-mono text-[9px] text-gray-600">{weight}</span></div><p className="mt-1 font-mono text-lg text-amber-200">{value ?? '—'}</p><div className="mt-1 h-1 overflow-hidden rounded bg-gray-800"><div className="h-full rounded bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div></div>)}</div><p className="mt-3 text-[10px] leading-relaxed text-gray-600">Each component is a percentile among eligible players. Missing components are excluded and the remaining weights are normalized before the final score is calculated.</p></div> : null}</div>)}
            {!filteredCandidatePool.length ? <p className="px-3 py-10 text-center text-sm text-gray-500">No candidates match this search or the current filters.</p> : null}
          </div>
        </div>
        {filteredCandidatePool.length ? <div className="mt-3 flex items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">Showing {(candidatePage - 1) * PAGE_SIZE + 1}–{Math.min(candidatePage * PAGE_SIZE, filteredCandidatePool.length)} of {filteredCandidatePool.length}</p><div className="flex items-center gap-2"><button type="button" disabled={candidatePage === 1} onClick={() => setCandidatePage((page) => page - 1)} className="rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500 disabled:opacity-30">Previous</button><button type="button" disabled={candidatePage === candidatePageCount} onClick={() => setCandidatePage((page) => page + 1)} className="rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500 disabled:opacity-30">Next</button></div></div> : null}
        <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => setGenerateStep(1)} className="rounded border border-gray-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500 hover:text-gray-300">Back: setup</button><button type="button" onClick={() => setGenerateStep(3)} className="rounded border border-amber-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/[0.06]">Next: distribute</button></div>
      </Card> : null}
      {generateStep === 3 ? <Card title="03 / Automatic distribution">
          <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-gray-500">Distribution is automatic and balances team power after reserving title holders.</p><button type="button" onClick={() => setGenerateStep(2)} className="rounded border border-gray-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500 hover:text-gray-300">Back: members</button></div>
          <div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-xs text-gray-500">{rosterPlayers.length} roster players · {titlePlayerIds.size} title assignments</p><p className="mt-1 text-[10px] text-gray-600">Title holders are reserved and excluded from automatic team members.</p></div><label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Teams <input type="number" min="1" max="20" value={teamCount} onChange={(event) => { const nextCount = Math.max(1, Math.min(20, Number(event.target.value) || 1)); setTeamCount(nextCount); setTitleAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key.split(':')[0]) < nextCount))); }} className="w-14 rounded border border-gray-800 bg-transparent px-2 py-1 text-center text-gray-200 outline-none" /></label></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">{titleSlots.map(({ teamIndex }) => <div key={teamIndex} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Team {teamIndex + 1} titles</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{titles.map((title) => { const key = `${teamIndex}:${title}`; const currentId = titleAssignments[key] || ''; const unavailable = new Set([...titlePlayerIds].filter((id) => id !== currentId)); return <label key={title} className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 text-xs text-gray-500"><span className="truncate">{title}</span><PlayerCombobox title={title} candidates={candidates} selectedId={currentId} unavailableIds={unavailable} onChange={(id) => setTitlePlayer(teamIndex, title, id)} /></label>; })}</div></div>)}</div>
          <div className="mt-4 rounded-md border border-gray-800 bg-gray-500/[0.03] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-gray-200">Assign distributed members</p><p className="mt-1 text-xs text-gray-600">Each team supports up to {MAX_TEAM_PLAYERS} players, including title holders, plus {MAX_TEAM_RESERVES} reserves.</p></div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">{availableForDistribution.length} unassigned candidates</p></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <div className="relative min-w-0">
                <button type="button" onClick={() => setAdditionalCandidateOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded border border-gray-800 bg-discord-bg-darker px-3 py-2 text-left text-xs text-gray-300">
                  <span className="min-w-0 truncate">{additionalCandidateIds.length ? `${additionalCandidateIds.length} candidate${additionalCandidateIds.length === 1 ? '' : 's'} selected` : 'Add unselected candidates…'}</span>
                  <span className="text-gray-600">▾</span>
                </button>
                {additionalCandidateOpen ? <div className="absolute left-0 right-0 top-11 z-40 rounded border border-gray-700 bg-discord-bg-darker p-2 shadow-xl">
                  <input autoFocus value={additionalCandidateQuery} onChange={(event) => setAdditionalCandidateQuery(event.target.value)} placeholder="Search name, ID, or alliance" className="w-full rounded border border-gray-800 bg-black/10 px-2 py-1.5 text-xs text-gray-300 outline-none placeholder:text-gray-700" />
                  <div className="mt-2 max-h-56 overflow-y-auto">
                    {filteredAdditionalCandidates.map((player) => <label key={player.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs text-gray-300 hover:bg-gray-500/10"><input type="checkbox" checked={additionalCandidateIds.includes(player.id)} onChange={() => setAdditionalCandidateIds((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])} className="accent-amber-400" /><span className="min-w-0 flex-1 truncate">{player.name} <span className="font-mono text-[10px] text-gray-600">· {player.id}</span></span><span className="font-mono text-[10px] text-gray-600">{player.score ?? '—'}</span></label>)}
                    {!filteredAdditionalCandidates.length ? <p className="px-2 py-3 text-xs text-gray-600">No unassigned candidates match.</p> : null}
                  </div>
                  <div className="mt-2 flex justify-between border-t border-gray-800 pt-2"><button type="button" onClick={() => setAdditionalCandidateIds([])} className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-600 hover:text-gray-300">Clear</button><button type="button" onClick={() => setAdditionalCandidateOpen(false)} className="font-mono text-[9px] uppercase tracking-[0.1em] text-amber-300">Done</button></div>
                </div> : null}
              </div>
              <select value={additionalTeamIndex} onChange={(event) => setAdditionalTeamIndex(Number(event.target.value))} className="rounded border border-gray-800 bg-discord-bg-darker px-2 py-2 text-xs text-gray-300 outline-none">{teams.map((team, index) => <option key={team.name} value={index}>{team.name}</option>)}</select>
              <select value={additionalRole} onChange={(event) => setAdditionalRole(event.target.value)} className="rounded border border-gray-800 bg-discord-bg-darker px-2 py-2 text-xs text-gray-300 outline-none"><option value="player">Player</option><option value="reserve">Reserve</option></select>
              <button type="button" disabled={!canAddAdditionalCandidates} onClick={() => { setDistributionOverrides((current) => ({ ...current, ...Object.fromEntries(additionalCandidateIds.map((id) => [id, { teamIndex: additionalTeamIndex, role: additionalRole }])) })); setAdditionalCandidateIds([]); setAdditionalCandidateQuery(''); setAdditionalCandidateOpen(false); }} className="rounded border border-amber-400/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-300 disabled:cursor-not-allowed disabled:opacity-30">Add selected</button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">{teams.map((team, teamIndex) => <div key={team.name} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">{team.name}</p><p className="mt-1 font-mono text-[10px] text-gray-600">Power {number(team.power)} · score {team.score}</p></div><div className="text-right font-mono text-[9px] uppercase tracking-[0.1em]"><p className="text-amber-300">{team.players.length + team.titles.length}/{MAX_TEAM_PLAYERS} players</p><p className="text-gray-500">{team.reserves.length}/{MAX_TEAM_RESERVES} reserves</p></div></div>{team.titles.length ? <div className="mt-3 border-b border-gray-800 pb-2"><p className="mb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">Title holders</p>{team.titles.map(({ title, player }) => <p key={title} className="text-xs text-amber-200">{title}: <span className="text-gray-300">{player.name}</span></p>)}</div> : null}<div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">Players</p>{team.players.length ? team.players.map((player) => { const assignment = assignments[player.id] || { teamIndex, role: 'player' }; return <div key={player.id} className="mt-1 flex items-center gap-2 rounded border border-gray-800/80 px-2 py-1.5"><span className="min-w-0 flex-1 truncate text-xs text-gray-300">{player.name}</span><select value={assignment.teamIndex} onChange={(event) => { const nextTeam = Number(event.target.value); if (canAssign(player.id, nextTeam, assignment.role)) setDistributionAssignment(player.id, nextTeam, assignment.role); }} className="w-20 rounded border border-gray-800 bg-discord-bg-darker px-1 py-1 text-[10px] text-gray-500 outline-none">{teams.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select><button type="button" disabled={!canAssign(player.id, teamIndex, 'reserve')} onClick={() => setDistributionAssignment(player.id, teamIndex, 'reserve')} className="rounded border border-gray-800 px-1.5 py-1 font-mono text-[9px] text-gray-500 hover:text-amber-300 disabled:opacity-30">Reserve</button></div>; }) : <p className="mt-1 text-xs text-gray-600">No players assigned.</p>}</div><div className="mt-3 border-t border-gray-800 pt-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">Reserves</p>{team.reserves.length ? team.reserves.map((player) => { const assignment = assignments[player.id] || { teamIndex, role: 'reserve' }; return <div key={player.id} className="mt-1 flex items-center gap-2 rounded border border-gray-800/80 px-2 py-1.5"><span className="min-w-0 flex-1 truncate text-xs text-gray-400">{player.name}</span><select value={assignment.teamIndex} onChange={(event) => { const nextTeam = Number(event.target.value); if (canAssign(player.id, nextTeam, assignment.role)) setDistributionAssignment(player.id, nextTeam, assignment.role); }} className="w-20 rounded border border-gray-800 bg-discord-bg-darker px-1 py-1 text-[10px] text-gray-500 outline-none">{teams.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select><button type="button" disabled={!canAssign(player.id, teamIndex, 'player')} onClick={() => setDistributionAssignment(player.id, teamIndex, 'player')} className="rounded border border-gray-800 px-1.5 py-1 font-mono text-[9px] text-gray-500 hover:text-amber-300 disabled:opacity-30">Player</button></div>; }) : <p className="mt-1 text-xs text-gray-600">No reserves assigned.</p>}</div></div>)}</div>
          <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-red-300">{rosterSaveError}</p><button type="button" onClick={saveRoster} disabled={savingRoster || !teams.length} className="rounded border border-amber-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/[0.06] disabled:cursor-not-allowed disabled:opacity-40">{savingRoster ? 'Saving roster…' : 'Save roster'}</button></div>
      </Card>
      : null}
      </>
      )}
    </div>
  );
}

export default function LeadershipClient({ data }) {
  const [tab, setTab] = useState('overview');
  const content = { overview: <Overview data={data} />, players: <Players data={data} />, row: <Row data={data} /> }[tab];
  return <div className="space-y-5"><div><div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">03 / Leadership</div><h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">Leadership</h1><p className="mt-2 text-sm text-gray-500">Server {data.server} · rolling 7 days: {data.periodStart} → {data.periodEnd}</p></div><nav className="-mx-4 flex items-end border-b border-gray-800 px-4 pt-2 sm:mx-0 sm:px-0" aria-label="Leadership sections">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`relative -mb-px shrink-0 border border-b-0 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${tab === key ? 'border-gray-800 bg-discord-bg-darker text-amber-300' : 'border-transparent text-gray-500 hover:text-amber-200'}`}>{label}</button>)}</nav>{content}</div>;
}
