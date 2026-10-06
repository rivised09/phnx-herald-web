'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Clock,
  ImageIcon,
  RefreshCw,
  Search,
  Shield,
  Swords,
  Target,
  Users,
} from 'lucide-react';
import ActivityTimeline, {
  ActivityCoverage,
  parseSlots,
} from '../../components/ActivityTimeline';
import Radar3D from '../../components/Radar3D';
import { getPlayerSurvey } from '../../lib/api';

const PLAYSTYLE_AXES = [
  { label: 'Farming', re: /farm/i, icon: '/icons/farming.svg', tone: 'text-amber-400' },
  { label: 'Fighting', re: /fight|war/i, icon: '/icons/fighting.svg', tone: 'text-red-400' },
  { label: 'Building', re: /build/i, icon: '/icons/building.svg', tone: 'text-orange-400' },
];

const TROOP_TYPES = [
  { label: 'Infantry', icon: '/icons/infantry.svg', tone: 'text-sky-400' },
  { label: 'Mage', icon: '/icons/mage.svg', tone: 'text-purple-400' },
  { label: 'Archer', icon: '/icons/archer.svg', tone: 'text-emerald-400' },
  { label: 'Cavalry', icon: '/icons/cavalry.svg', tone: 'text-amber-400' },
];

const TROOP_ICON_MAP = new Map(TROOP_TYPES.map((t) => [t.label.toLowerCase(), t]));

const TABS = [
  { id: 'players', label: 'Player Information', icon: Users },
  { id: 'results', label: 'Survey Results', icon: BarChart3 },
];

const SLOT_HOURS = 2;
const SLOT_COUNT = 24 / SLOT_HOURS;

function buildIndex(header) {
  const norm = String(header || '').replace(/\s+/g, ' ').trim();
  const n = norm.toLowerCase();
  const has = (...words) => words.some((w) => n.includes(w));

  if (has('name')) return 'name';
  if (has('secondary')) return 'secondary';
  if (has('march type', 'main', 'primary')) return 'main';
  if (has('picture', 'photo', 'upload', 'legion')) return 'troopLink';
  if (has('weekday')) return 'weekday';
  if (has('weekend')) return 'weekend';
  if (has('active', 'time')) return 'activity';
  if (has('farming', 'fighting', 'building', 'prefer')) return 'playstyle';
  if (has('donate', 'understand', 'i understand', 'occassion', 'occasion')) return 'farmwar';
  return 'other';
}

function isLink(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function splitTokens(value) {
  return String(value || '')
    .split(/[,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tally(values) {
  const counts = new Map();
  values.forEach((v) => {
    splitTokens(v).forEach((token) => {
      const key = token.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const SEARCHABLE_FIELDS = ['name', 'main', 'secondary', 'playstyle', 'farmwar'];

/**
 * Folds the characters that make visually identical text fail a plain
 * `includes`: fullwidth Latin (ｒｉｖ vs riv), decomposed accents, and case.
 */
function normalizeText(value) {
  return String(value ?? '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function radarFor(text) {
  const tokens = splitTokens(text);
  return PLAYSTYLE_AXES.map((axis) => ({
    axis: axis.label,
    duty: tokens.filter((t) => axis.re.test(t)).length,
  }));
}

function slotLabel(index) {
  const pad = (h) => String(h).padStart(2, '0');
  const start = index * SLOT_HOURS;
  return `${pad(start)}:00-${pad(start + SLOT_HOURS)}:00`;
}

/**
 * Icons are solid silhouettes, so they render as CSS masks. Colour comes from
 * the element's own background (bg-current), which lets a `text-*` class on the
 * caller drive the tint. A plain <img> cannot do this: an SVG loaded through
 * <img> is isolated from the document, so currentColor never resolves.
 */
function MonoIcon({ src, alt = '', className = '' }) {
  const mask = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  };

  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`inline-block bg-current ${className}`}
      style={mask}
    />
  );
}

function TabBar({ active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Player info views"
      className="inline-flex w-full gap-1 rounded-lg border border-gray-800 bg-discord-surface p-1 sm:w-auto"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition sm:flex-none ${
              isActive
                ? 'bg-gray-100 text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                : 'text-gray-500 hover:text-neutral-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-3 border-b border-gray-800/70 py-2.5 last:border-b-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-[13px] leading-relaxed text-neutral-100">
          {children}
        </dd>
      </div>
    </div>
  );
}

function PeakHours({ weekdayCounts, weekendCounts, total }) {
  const rows = [
    { label: 'Weekdays', counts: weekdayCounts, dot: 'bg-gray-100' },
    { label: 'Weekends', counts: weekendCounts, dot: 'bg-gray-300' },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-discord-surface p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
        Most Active Hour
      </h3>
      <div className="mt-3 space-y-4">
        {rows.map((row, ri) => {
          const ranked = row.counts
            .map((count, index) => ({ count, index }))
            .sort((a, b) => b.count - a.count);
          const [top, second, third] = ranked;
          const pct = total ? Math.round((top.count / total) * 100) : 0;

          return (
            <div key={row.label}>
              {ri > 0 && <div className="mb-4 border-t border-gray-800/70" />}
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                  {row.label}
                </span>
                <span className="font-mono text-[10px] text-gray-600">
                  {top.count} of {total}
                </span>
              </div>

              <div className="mt-1 font-mono text-xl font-semibold tracking-tight text-neutral-100">
                {slotLabel(top.index)}
              </div>
              <div className="font-mono text-[10px] text-gray-500">{pct}% of members</div>

              <div className="my-2.5 border-t border-gray-800/70" />

              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">
                next busiest
              </div>
              <div className="mt-1 space-y-0.5 font-mono text-[11px] leading-relaxed text-gray-400">
                <div>
                  {slotLabel(second.index)}
                  <span className="text-gray-600"> &middot; {second.count}</span>
                </div>
                <div>
                  {slotLabel(third.index)}
                  <span className="text-gray-600"> &middot; {third.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TroopTile({ type, count, total }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div
      title={`${type.label}: ${count} of ${total} members (${pct}%)`}
      className="flex items-center gap-2.5 rounded-md border border-gray-800/80 bg-discord-bg-darker/40 px-3 py-2 transition hover:border-gray-700"
    >
      <MonoIcon src={type.icon} className={`h-7 w-7 shrink-0 opacity-80 ${type.tone}`} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-lg font-semibold leading-none text-neutral-100">
            {pct}%
          </span>
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
            {type.label}
          </span>
        </div>
        <div className="mt-1 font-mono text-[9px] leading-tight text-gray-600">
          {count} members
        </div>
      </div>
    </div>
  );
}

function TroopGrid({ sections }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-discord-surface p-4">
      {sections.map((section, i) => {
        const byLabel = new Map(section.counts);
        const total = section.counts.reduce((sum, [, count]) => sum + count, 0);
        return (
          <div key={section.title}>
            {i > 0 && <div className="mb-3.5 mt-3.5 border-t border-gray-800/70" />}
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              {section.title}
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {TROOP_TYPES.map((type) => (
                <TroopTile
                  key={type.label}
                  type={type}
                  count={byLabel.get(type.label) || 0}
                  total={total}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PlayersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('players');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlayerSurvey();
      setData({ headers: res.headers || [], rows: res.rows || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const players = useMemo(() => {
    const rows = data?.rows || [];
    const headers = data?.headers || [];
    return rows.map((row, i) => {
      const out = { __i: i };
      headers.forEach((h) => {
        out[buildIndex(h)] = row[h] ?? '';
      });
      return out;
    });
  }, [data]);

  const searchIndex = useMemo(() => {
    const map = new Map();
    players.forEach((p) => {
      map.set(
        p.__i,
        normalizeText(SEARCHABLE_FIELDS.map((f) => p[f]).filter(Boolean).join(' ')),
      );
    });
    return map;
  }, [players]);

  const filtered = useMemo(() => {
    const terms = normalizeText(query).split(' ').filter(Boolean);
    if (!terms.length) return players;
    return players.filter((p) => {
      const haystack = searchIndex.get(p.__i) || '';
      return terms.every((term) => haystack.includes(term));
    });
  }, [players, query, searchIndex]);

  useEffect(() => {
    if (!players.length) return;
    if (!filtered.some((p) => p.__i === selected)) {
      setSelected(filtered.length ? filtered[0].__i : 0);
    }
  }, [filtered, players.length, selected]);

  const current = useMemo(
    () => players.find((p) => p.__i === selected) || filtered[0] || null,
    [players, selected, filtered],
  );

  const summary = useMemo(() => {
    const slotCounts = (field) => {
      const counts = new Array(SLOT_COUNT).fill(0);
      players.forEach((p) => {
        parseSlots(p[field]).starts.forEach((start) => {
          counts[start / SLOT_HOURS] += 1;
        });
      });
      return counts;
    };

    return {
      troops: tally(players.map((p) => p.main)),
      secondaryTroops: tally(players.map((p) => p.secondary)),
      playstyleRadar: PLAYSTYLE_AXES.map((axis) => ({
        axis: axis.label,
        duty: players.reduce((total, p) => {
          const tokens = splitTokens(`${p.playstyle || ''} ${p.farmwar || ''}`);
          return total + tokens.filter((t) => axis.re.test(t)).length;
        }, 0),
      })),
      weekdayCounts: slotCounts('weekday'),
      weekendCounts: slotCounts('weekend'),
    };
  }, [players]);

  const playstylePeak = useMemo(
    () => Math.max(1, ...summary.playstyleRadar.map((r) => r.duty)),
    [summary],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
            05 / Player Info
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
            Alliance Survey
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden font-mono text-[11px] uppercase tracking-wider text-gray-500 sm:block">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {players.length} player{players.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={load}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-800 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4">
        <TabBar active={tab} onChange={setTab} />
      </div>

      {loading && (
        <div
          className="grid gap-3 lg:grid-cols-[18rem_1fr]"
          role="status"
          aria-label="Loading player info"
        >
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-md border border-gray-800 bg-discord-surface"
              />
            ))}
          </div>
          <div className="space-y-3 rounded-lg border border-gray-800 bg-discord-surface p-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>Failed to load player info: {error}</span>
            <button
              type="button"
              onClick={load}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && players.length === 0 && (
        <div className="halftone rounded-xl border border-dashed border-neutral-800 bg-discord-surface/50 px-6 py-12 text-center">
          <div className="mb-2 flex justify-center text-gray-500">
            <Users className="h-11 w-11" />
          </div>
          <p className="font-mono text-sm font-medium text-neutral-200">
            No survey responses found
          </p>
          <p className="mt-1 text-sm text-gray-500">The survey sheet has no data yet.</p>
        </div>
      )}

      {!loading && !error && players.length > 0 && tab === 'players' && (
        <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
          {/* Left: player list */}
          <div className="rounded-lg border border-gray-800 bg-discord-surface">
            <div className="border-b border-gray-800 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search players&hellip;"
                  className="w-full rounded-md border border-gray-800 bg-discord-bg-darker py-1.5 pl-8 pr-2.5 text-[13px] text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500"
                />
              </div>
            </div>

            <ul className="max-h-72 overflow-y-auto p-1.5 sm:max-h-[32rem] lg:max-h-[38rem]">
              {filtered.length === 0 && (
                <li className="px-2 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  No matches
                </li>
              )}
              {filtered.map((p) => {
                const active = current?.__i === p.__i;
                return (
                  <li key={p.__i}>
                    <button
                      type="button"
                      onClick={() => setSelected(p.__i)}
                      aria-pressed={active}
                      className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition ${
                        active
                          ? 'bg-gray-500/10 text-neutral-100'
                          : 'text-gray-400 hover:bg-gray-500/5 hover:text-neutral-100'
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-gray-100 transition-all ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] uppercase tracking-wide transition ${
                          active
                            ? 'border-gray-500 bg-gray-300/15 text-neutral-100'
                            : 'border-gray-800 bg-gray-500/5 text-gray-500 group-hover:border-gray-700'
                        }`}
                      >
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {String(p.name || '-')}
                        </span>
                        <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-gray-500">
                          {[p.main, p.secondary].filter(Boolean).join(' / ') || '-'}
                        </span>
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition ${
                          active
                            ? 'translate-x-0 text-gray-400'
                            : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: selected player */}
          <div className="rounded-lg border border-gray-800 bg-discord-surface">
            {current ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-800 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-700 bg-gray-500/10 font-mono text-sm text-neutral-100">
                      {initials(current.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight text-neutral-100">
                        {String(current.name || '-')}
                      </h2>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        Survey response #{current.__i + 1}
                      </p>
                    </div>
                  </div>
                  {isLink(current.troopLink) && (
                    <a
                      href={String(current.troopLink)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-500/5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 transition hover:-translate-y-px hover:border-gray-600 hover:text-neutral-100"
                    >
                      <ImageIcon className="h-3 w-3" />
                      Legion Photo
                    </a>
                  )}
                </div>

                <dl className="px-4 pb-4">
                  <Field icon={Swords} label="Troops">
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                      {[
                        { tag: 'Main', value: current.main },
                        { tag: 'Secondary', value: current.secondary },
                      ].map((row) => {
                        const name = String(row.value || '').trim();
                        if (!name) return null;
                        const troop = TROOP_ICON_MAP.get(name.toLowerCase());
                        return (
                          <div key={row.tag} className="flex items-center gap-2">
                            {troop && (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                <MonoIcon src={troop.icon} className={`h-4 w-4 ${troop.tone}`} />
                              </span>
                            )}
                            <span className="text-[13px] text-neutral-100">{name}</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">
                              {row.tag}
                            </span>
                          </div>
                        );
                      })}
                      {!String(current.main || '').trim() &&
                        !String(current.secondary || '').trim() && <span>-</span>}
                    </div>
                  </Field>

                  <div className="border-b border-gray-800/70 py-3">
                    <div className="mb-2 flex items-center gap-3">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        Most Active Hours
                      </dt>
                    </div>
                    <div className="pl-[1.6rem]">
                      <ActivityTimeline weekday={current.weekday} weekend={current.weekend} />
                    </div>
                  </div>

                  <div className="border-b border-gray-800/70 py-3">
                    <div className="mb-2 flex items-center gap-3">
                      <Target className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        Playstyle Profile
                      </dt>
                    </div>
                    <div className="flex items-center gap-4 pl-[1.6rem]">
                      <div className="w-[46%] min-w-0 max-w-[13rem] flex-1">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                          Selected duties
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-neutral-100">
                          {String(current.playstyle || '-')}
                        </p>
                        <div className="mt-3 space-y-1.5">
                          {PLAYSTYLE_AXES.map((axis) => {
                            const on =
                              axis.re.test(String(current.playstyle || '')) ||
                              axis.re.test(String(current.farmwar || ''));
                            return (
                              <div key={axis.label} className="flex items-center gap-2">
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center transition ${
                                    on ? 'opacity-95' : 'opacity-25'
                                  }`}
                                >
                                  <MonoIcon src={axis.icon} className={`h-4 w-4 ${axis.tone}`} />
                                </span>
                                <span
                                  className={`font-mono text-[11px] uppercase tracking-wider ${
                                    on ? 'text-neutral-100' : 'text-gray-600'
                                  }`}
                                >
                                  {axis.label}
                                </span>
                                <span className="ml-auto font-mono text-[10px] text-gray-600">
                                  {on ? 'yes' : 'no'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 flex min-w-0 flex-1 justify-end">
                        <Radar3D
                          data={radarFor(`${current.playstyle || ''} ${current.farmwar || ''}`)}
                          valueKey="duty"
                          size={216}
                          depth={8}
                          label={`${current.name || 'Player'} playstyle profile`}
                        />
                      </div>
                    </div>
                  </div>

                  <Field icon={Shield} label="Farming / War Duty">
                    {String(current.farmwar || '-')}
                  </Field>
                  {current.other && (
                    <Field icon={Users} label="Other Notes">
                      {String(current.other)}
                    </Field>
                  )}
                  <Field icon={Clock} label="Submitted">
                    {String(current.activity || '-')}
                  </Field>
                </dl>
              </>
            ) : (
              <div className="halftone flex h-full min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-2 flex text-gray-500">
                  <Users className="h-10 w-10" />
                </div>
                <p className="font-mono text-sm text-neutral-200">Select a player</p>
                <p className="mt-1 text-sm text-gray-500">
                  {query ? 'No players match your search.' : 'Pick a name from the list.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && players.length > 0 && tab === 'results' && (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="halftone-strong rounded-lg border border-gray-800 bg-discord-surface p-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                Alliance Playstyle
              </h3>
              <div className="mt-1 flex justify-center">
                <Radar3D
                  data={summary.playstyleRadar}
                  valueKey="duty"
                  size={248}
                  depth={9}
                  label="Alliance playstyle distribution"
                />
              </div>
              <div className="mt-1 grid grid-cols-3 gap-3 border-t border-gray-800/70 pt-3">
                {summary.playstyleRadar.map((row) => {
                  const pct = playstylePeak
                    ? Math.round((row.duty / playstylePeak) * 100)
                    : 0;
                  return (
                    <div key={row.axis}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                        {row.axis}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="font-mono text-base font-semibold leading-none text-neutral-100">
                          {row.duty}
                        </span>
                        <span className="font-mono text-[9px] text-gray-600">selections</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-gray-300 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <TroopGrid
              sections={[
                { title: 'Main Troop', counts: summary.troops },
                { title: 'Secondary Troop', counts: summary.secondaryTroops },
              ]}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <PeakHours
              weekdayCounts={summary.weekdayCounts}
              weekendCounts={summary.weekendCounts}
              total={players.length}
            />

            <div className="rounded-lg border border-gray-800 bg-discord-surface p-4 lg:col-span-2">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                Alliance Activity Coverage
              </h3>
              <p className="mt-1 text-[13px] text-gray-500">
                How many of the {players.length} respondents are active in each 2-hour UTC
                window.
              </p>
              <div className="mt-3">
                <ActivityCoverage players={players} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}