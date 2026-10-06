'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Info, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PAGE_SIZE = 25;

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

function Row({ data }) {
  const [rowTab, setRowTab] = useState('saved');
  const [generateStep, setGenerateStep] = useState(1);
  const [teamCount, setTeamCount] = useState(2);
  const [selected, setSelected] = useState([]);
  const [titleAssignments, setTitleAssignments] = useState({});
  const [minimumActivity, setMinimumActivity] = useState(1);
  const [combatOnly, setCombatOnly] = useState(false);

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
  const selectedPlayers = candidates.filter((player) => selected.includes(player.id));
  const titles = ['Leader', 'Warmaster', 'Scholar', 'Envoy', 'Beastmaster', 'Saintess'];
  const titleSlots = Array.from({ length: teamCount }, (_, teamIndex) => ({
    teamIndex,
    titles,
  }));
  const titlePlayerIds = new Set(Object.values(titleAssignments).filter(Boolean));
  const rosterPlayers = candidates.filter((player) => selected.includes(player.id) || titlePlayerIds.has(player.id));
  const setTitlePlayer = (teamIndex, title, id) => {
    const key = `${teamIndex}:${title}`;
    setTitleAssignments((current) => {
      const next = { ...current };
      if (id) next[key] = id;
      else delete next[key];
      return next;
    });
  };
  const teams = useMemo(() => {
    const result = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      titles: [],
      players: [],
      power: 0,
      score: 0,
    }));
    result.forEach((team, teamIndex) => {
      titles.forEach((title) => {
        const player = candidates.find((item) => item.id === titleAssignments[`${teamIndex}:${title}`]);
        if (player) {
          team.titles.push({ title, player });
          team.power += player.powerValue;
          team.score += player.score || 0;
        }
      });
    });
    [...rosterPlayers].filter((player) => !titlePlayerIds.has(player.id)).sort((a, b) => b.powerValue - a.powerValue).forEach((player) => {
      const team = result.reduce((lowest, current) => current.power < lowest.power ? current : lowest, result[0]);
      team.players.push(player);
      team.power += player.powerValue;
      team.score += player.score || 0;
    });
    return result;
  }, [candidates, rosterPlayers, teamCount, titleAssignments, titlePlayerIds]);

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
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-300">No saved RoW roster</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-gray-600">Generated rosters will appear here once roster saving is connected. Start a new generation to configure teams and delegates.</p>
            <button type="button" onClick={() => setRowTab('generate')} className="mt-4 rounded border border-gray-700 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 transition hover:border-amber-400">Generate roster</button>
          </div>
        </Card>
      ) : (
      <>
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map(([step, title, description], index) => <button key={step} type="button" onClick={() => setGenerateStep(index + 1)} className={`flex gap-3 rounded-md border p-3 text-left transition ${generateStep === index + 1 ? 'border-amber-400/60 bg-amber-400/[0.04]' : 'border-gray-800 bg-discord-bg-darker hover:border-gray-700'}`}><span className={`font-mono text-xs ${generateStep === index + 1 ? 'text-amber-300' : 'text-gray-600'}`}>{step}</span><span><span className="block text-sm text-gray-200">{title}</span><span className="mt-1 block text-xs text-gray-600">{description}</span></span></button>)}
      </div>
      {generateStep === 1 ? <Card title="01 / Team setup">
        <p className="mt-2 text-xs leading-relaxed text-gray-500">Choose how many teams to create, then assign the six RoW titles to players. Title holders are reserved and will not be added as automatic members.</p>
        <div className="mt-4 flex items-center gap-3"><label className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Number of teams <input type="number" min="1" max="20" value={teamCount} onChange={(event) => { const nextCount = Math.max(1, Math.min(20, Number(event.target.value) || 1)); setTeamCount(nextCount); setTitleAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key.split(':')[0]) < nextCount))); }} className="ml-2 w-16 rounded border border-gray-800 bg-transparent px-2 py-1.5 text-center text-gray-200 outline-none" /></label></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{titleSlots.map(({ teamIndex }) => <div key={teamIndex} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Team {teamIndex + 1} titles</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{titles.map((title) => { const key = `${teamIndex}:${title}`; const currentId = titleAssignments[key] || ''; const unavailable = new Set([...titlePlayerIds].filter((id) => id !== currentId)); return <label key={title} className="flex items-center justify-between gap-2 text-xs text-gray-500"><span>{title}</span><select value={currentId} onChange={(event) => setTitlePlayer(teamIndex, title, event.target.value)} className="min-w-0 max-w-36 rounded border border-gray-800 bg-discord-bg-darker px-2 py-1 text-xs text-gray-300 outline-none"><option value="">Unassigned</option>{candidates.filter((player) => !unavailable.has(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>; })}</div></div>)}</div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setGenerateStep(2)} className="rounded border border-amber-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/[0.06]">Next: select members</button></div>
      </Card> : null}
      {generateStep === 2 ? <Card title="02 / Member selection">
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-500">Select the members to include. Title holders are already reserved and excluded from this list.</p><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">{selectedPlayers.length} selected</p></div>
      <Card title="01 / Configure candidate signals">
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">Minimum active intervals</span><select value={minimumActivity} onChange={(event) => setMinimumActivity(Number(event.target.value))} className="mt-2 w-full bg-transparent text-sm text-gray-300 outline-none"><option value={0}>Any activity</option><option value={1}>At least 1</option><option value={3}>At least 3</option><option value={5}>At least 5</option></select></label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-800 bg-gray-500/[0.03] p-3 text-xs text-gray-400"><input type="checkbox" checked={combatOnly} onChange={(event) => setCombatOnly(event.target.checked)} className="accent-amber-400" /> Require recent combat activity</label>
          <div className="rounded-md border border-dashed border-gray-800 px-3 py-2 text-xs leading-relaxed text-gray-600">Percentiles are calculated among eligible players. Missing historical records are excluded.</div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-800 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-600">Candidate score uses normalized percentiles</p>
          <details className="relative">
            <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded border border-gray-800 text-gray-500 transition hover:border-gray-600 hover:text-amber-300" aria-label="Show scoring breakdown"><Info className="h-3.5 w-3.5" /></summary>
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-gray-700 bg-discord-bg-darker p-3 shadow-xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-300">Scoring breakdown</p>
              <div className="mt-3 space-y-2 text-xs">{[['RoW performance', '40%', 'Historical matches, wins, league record, and highest score.'], ['Recent combat', '25%', 'Kill, merit, death, healing, and power movement.'], ['RoW consistency', '15%', 'Reliable activity across the snapshot window.'], ['Competitive performance', '10%', 'ToC placement, win rate, and battle count.'], ['Account capability', '10%', 'Power and available account-strength indicators.']].map(([label, weight, description]) => <div key={label} className="border-b border-gray-800 pb-2 last:border-0 last:pb-0"><div className="flex justify-between gap-3 text-gray-300"><span>{label}</span><span className="font-mono text-amber-300">{weight}</span></div><p className="mt-1 leading-relaxed text-gray-600">{description}</p></div>)}</div>
              <p className="mt-3 text-[10px] leading-relaxed text-gray-600">Missing historical data is excluded and the remaining weights are renormalized. This is a selection aid, not a guaranteed result.</p>
            </div>
          </details>
        </div>
      </Card>
      <Card title={`Candidate pool · ${candidates.length}`}>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-500">Select players for the confirmed roster. Scores are decision support, not guaranteed results.</p><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600">{selectedPlayers.length} selected</p></div>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[minmax(220px,1fr)_110px_80px_80px_80px_90px] gap-2 border-b border-gray-800 px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600"><span>Player</span><span>Recommendation</span><span className="text-right">RoW</span><span className="text-right">Activity</span><span className="text-right">Capability</span><span className="text-right">Candidate</span></div>
            <div className="divide-y divide-gray-800/80">
            {candidates.slice(0, 30).map((player) => <label key={player.id} className="flex cursor-pointer items-center gap-3 py-3 hover:bg-gray-500/[0.03]">
              <input type="checkbox" checked={selected.includes(player.id)} onChange={() => toggleSelected(player.id)} className="accent-amber-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-neutral-200">{player.name}</span>
                <span className="font-mono text-[10px] text-gray-600">{player.activity} · {player.activityDays} intervals · {player.power}</span>
                <span className="mt-1 block font-mono text-[9px] text-gray-700">
                  RoW {player.components.historical ?? '—'} · Activity {player.components.combat ?? '—'} · Consistency {player.components.consistency ?? '—'} · ToC {player.components.competitive ?? '—'} · Capability {player.components.capability ?? '—'}
                </span>
              </span>
              <span className={`hidden w-20 text-right font-mono text-[10px] uppercase tracking-[0.12em] sm:block ${player.strength === 'Strong Candidate' ? 'text-amber-300' : player.strength === 'Consider' ? 'text-gray-300' : 'text-gray-600'}`}>{player.strength}</span>
              <span className="hidden w-16 text-right font-mono text-[10px] text-gray-500 sm:block">{player.components.historical ?? '—'}</span>
              <span className="hidden w-16 text-right font-mono text-[10px] text-gray-500 sm:block">{player.components.combat ?? '—'}</span>
              <span className="hidden w-16 text-right font-mono text-[10px] text-gray-500 sm:block">{player.components.capability ?? '—'}</span>
              <span className="w-14 text-right font-mono text-xs text-amber-200">{player.score === null ? '—' : `${player.score}/100`}</span>
            </label>)}
            {!candidates.length ? <p className="py-8 text-center text-sm text-gray-500">No players match the current signals.</p> : null}
            </div>
          </div>
        </div>
      </Card>
      <div className="mt-4 flex justify-between"><button type="button" onClick={() => setGenerateStep(1)} className="rounded border border-gray-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500 hover:text-gray-300">Back: setup</button><button type="button" onClick={() => setGenerateStep(3)} className="rounded border border-amber-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/[0.06]">Next: distribute</button></div>
      </Card> : null}
      {generateStep === 3 ? <Card title="03 / Automatic distribution">
          <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-gray-500">Distribution is automatic and balances team power after reserving title holders.</p><button type="button" onClick={() => setGenerateStep(2)} className="rounded border border-gray-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500 hover:text-gray-300">Back: members</button></div>
          <div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-xs text-gray-500">{rosterPlayers.length} roster players · {titlePlayerIds.size} title assignments</p><p className="mt-1 text-[10px] text-gray-600">Title holders are reserved and excluded from automatic team members.</p></div><label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Teams <input type="number" min="1" max="20" value={teamCount} onChange={(event) => { const nextCount = Math.max(1, Math.min(20, Number(event.target.value) || 1)); setTeamCount(nextCount); setTitleAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key.split(':')[0]) < nextCount))); }} className="w-14 rounded border border-gray-800 bg-transparent px-2 py-1 text-center text-gray-200 outline-none" /></label></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">{titleSlots.map(({ teamIndex }) => <div key={teamIndex} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Team {teamIndex + 1} titles</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{titles.map((title) => { const key = `${teamIndex}:${title}`; const currentId = titleAssignments[key] || ''; const unavailable = new Set([...titlePlayerIds].filter((id) => id !== currentId)); return <label key={title} className="flex items-center justify-between gap-2 text-xs text-gray-500"><span>{title}</span><select value={currentId} onChange={(event) => setTitlePlayer(teamIndex, title, event.target.value)} className="min-w-0 max-w-36 rounded border border-gray-800 bg-discord-bg-darker px-2 py-1 text-xs text-gray-300 outline-none"><option value="">Unassigned</option>{candidates.filter((player) => !unavailable.has(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>; })}</div></div>)}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{teams.map((team) => <div key={team.name} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><div className="flex justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">{team.name}</span><span className="font-mono text-[10px] text-amber-300">{team.players.length + team.titles.length} players</span></div><p className="mt-1 font-mono text-[10px] text-gray-600">Power {number(team.power)} · score {team.score}</p>{team.titles.length ? <div className="mt-2 space-y-1 border-b border-gray-800 pb-2">{team.titles.map(({ title, player }) => <p key={title} className="text-xs text-amber-200">{title}: <span className="text-gray-300">{player.name}</span></p>)}</div> : null}<p className="mt-2 text-xs leading-relaxed text-gray-400">{team.players.length ? team.players.map((player) => player.name).join(' · ') : 'No automatic members assigned.'}</p></div>)}</div>
      </Card>
      : null}
      <Card title="How to read the recommendations">
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ['RoW Performance', 'Historical score, match record, wins/losses, league record, and highest score. This is the strongest signal when available.'],
            ['Current Activity', 'Recent kill, merit, death, healing, and power movement, plus consistency across the rolling snapshot window.'],
            ['Combat Capability', 'Account power and available T4/T5 or hero indicators. Capability is capacity, not proof of RoW performance.'],
          ].map(([title, description]) => <div key={title} className="rounded-md border border-gray-800 bg-gray-500/[0.03] p-3"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">{title}</p><p className="mt-2 text-xs leading-relaxed text-gray-600">{description}</p></div>)}
        </div>
        <p className="mt-3 text-xs text-gray-600">Leadership should treat these recommendations as selection support. Actual RoW results remain the definitive performance record.</p>
      </Card>
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
