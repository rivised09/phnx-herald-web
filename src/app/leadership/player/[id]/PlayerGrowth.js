'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, compact } from './player-ui';

/**
 * Leadership-exclusive: the same player as trends over their whole stored
 * history (the public page shows snapshots and insight prose, not charts).
 *
 * Everything here comes from `profile.insights.timeline` (one row per stored
 * snapshot: power, rank, kills, deaths, healed, merits, ...) and
 * `profile.gathered` (per-date resource gains), so the charts cover the full
 * history - up to ~60 snapshots - not just the leadership window.
 */

const TICK = { fill: '#71717a', fontSize: 10 };
const TOOLTIP_STYLE = {
  background: '#202225',
  border: '1px solid #3f4147',
  borderRadius: 4,
  fontSize: 11,
};

const AXIS_LABELS = {
  kills: 'Units killed',
  deaths: 'Units dead',
  healed: 'Units healed',
  merits: 'Merits',
};

function dateTick(value) {
  return String(value).slice(5); // MM-DD
}

/** Daily gains from a cumulative counter (null where a reading is missing). */
function dailyGains(timeline, key) {
  const rows = [];
  for (let i = 1; i < timeline.length; i += 1) {
    const previous = timeline[i - 1][key];
    const current = timeline[i][key];
    rows.push({
      date: timeline[i].date,
      gain: previous != null && current != null && current >= previous ? current - previous : null,
    });
  }
  return rows;
}

function ChartFrame({ title, description, height = 200, children }) {
  return (
    <Card title={title} description={description}>
      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Empty({ children }) {
  return (
    <Card title="Growth">
      <p className="mt-3 text-sm text-gray-600">{children}</p>
    </Card>
  );
}

export default function PlayerGrowth({ profile }) {
  const timeline = (profile.insights?.timeline || []).filter((row) => row.date);
  const gathered = profile.gathered || [];

  if (timeline.length < 2) {
    return (
      <Empty>
        Not enough tracked snapshots yet - at least two are needed before trends can be drawn.
      </Empty>
    );
  }

  const powerRank = timeline.map((row) => ({
    date: row.date,
    power: row.power,
    rank: row.rank,
  }));

  const counters = ['kills', 'deaths', 'healed', 'merits'];
  const killGains = dailyGains(timeline, 'kills');

  const gatheredRows = gathered.map((row) => ({
    date: row.date,
    gold: row.gold ?? null,
    wood: row.wood ?? null,
    ore: row.ore ?? null,
    mana: row.mana ?? null,
  }));
  const hasGathered = gatheredRows.some(
    (row) => row.gold != null || row.wood != null || row.ore != null || row.mana != null,
  );

  const coverage = profile.insights?.coverage;

  return (
    <div className="space-y-5">
      <ChartFrame
        title="Power & rank"
        description={`Full stored history · ${timeline.length} snapshots${coverage ? ` · ${coverage.first} → ${coverage.last}` : ''}`}
        height={240}
      >
        <LineChart data={powerRank} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="#2b2d31" vertical={false} />
          <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis yAxisId="power" tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
          {/* Rank #1 belongs at the top, so this axis runs the other way. */}
          <YAxis yAxisId="rank" orientation="right" reversed tick={TICK} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(value, name) =>
              name === 'power' ? [Number(value).toLocaleString('en-US'), 'Power'] : [`#${value}`, 'Rank']
            }
            labelFormatter={(label) => `Snapshot ${label}`}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#d1d5db' }}
          />
          <Line yAxisId="power" type="monotone" dataKey="power" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
          <Line yAxisId="rank" type="monotone" dataKey="rank" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
        </LineChart>
      </ChartFrame>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Daily kill gains"
          description="Kills added between consecutive snapshots - the rhythm of activity, not the total."
        >
          <BarChart data={killGains} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#2b2d31" vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString('en-US'), 'Kills gained']}
              labelFormatter={(label) => `Snapshot ${label}`}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#d1d5db' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="gain" fill="#fbbf24" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ChartFrame>

        <ChartFrame
          title="Activity coverage"
          description="Snapshots where each counter moved - gaps are days with no detail data, not zeroes."
        >
          <div className="flex h-full flex-col justify-center gap-2 px-1">
            {counters.map((key) => {
              const values = timeline.map((row) => row[key]).filter((v) => v != null);
              const moved = timeline.filter((row, i) => {
                if (i === 0 || row[key] == null || timeline[i - 1][key] == null) return false;
                return row[key] > timeline[i - 1][key];
              }).length;
              const pct = values.length > 1 ? Math.round((moved / (values.length - 1)) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">{AXIS_LABELS[key]}</span>
                    <span className="font-mono text-gray-500">
                      {moved} of {Math.max(0, values.length - 1)} intervals · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full ${pct >= 60 ? 'bg-emerald-400' : pct >= 30 ? 'bg-amber-400' : 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartFrame>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {counters.map((key) => {
          const data = timeline.map((row) => ({ date: row.date, value: row[key] }));
          return (
            <ChartFrame
              key={key}
              title={AXIS_LABELS[key]}
              description="Cumulative total as recorded on each snapshot."
              height={170}
            >
              <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#2b2d31" vertical={false} />
                <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString('en-US'), AXIS_LABELS[key]]}
                  labelFormatter={(label) => `Snapshot ${label}`}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={key === 'kills' ? '#fbbf24' : key === 'healed' ? '#34d399' : key === 'merits' ? '#38bdf8' : '#f87171'}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ChartFrame>
          );
        })}
      </div>

      {hasGathered ? (
        <ChartFrame
          title="Resources gathered"
          description="Per-snapshot gains by resource (gathering between readings)."
          height={200}
        >
          <LineChart data={gatheredRows} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#2b2d31" vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
            <Tooltip
              formatter={(value, name) => [Number(value).toLocaleString('en-US'), String(name).toUpperCase()]}
              labelFormatter={(label) => `Snapshot ${label}`}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#d1d5db' }}
            />
            <Line type="monotone" dataKey="gold" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="wood" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="ore" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="mana" stroke="#c084fc" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ChartFrame>
      ) : null}
    </div>
  );
}
