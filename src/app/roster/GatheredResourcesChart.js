'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * One line per resource, all five in the same frame, each point a gain since
 * the previous capture. Gems are counted in hundreds where the rest run in
 * the hundreds of millions, so gems get their own right-hand axis - without it
 * the red line would sit flat on the floor and read as "nothing gathered"
 * rather than as a resource that moves in small numbers.
 */
const SERIES = [
  { key: 'mana', label: 'Mana', color: '#3b82f6', axis: 'main' },
  { key: 'gems', label: 'Gems', color: '#ef4444', axis: 'gems' },
  { key: 'wood', label: 'Wood', color: '#f97316', axis: 'main' },
  { key: 'gold', label: 'Gold', color: '#eab308', axis: 'main' },
  { key: 'ore', label: 'Ore', color: '#a1a1aa', axis: 'main' },
];

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Axis ticks, abbreviated the way the roster prints power. */
function compact(value) {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${Math.round(value / 1e6)}M`;
  if (abs >= 1e3) return `${Math.round(value / 1e3)}K`;
  return `${Math.round(value)}`;
}

function exact(value) {
  return value === null || value === undefined ? '—' : value.toLocaleString('en-US');
}

export default function GatheredResourcesChart({ points = [] }) {
  const data = (points || [])
    .map((point) => ({
      date: point?.date || null,
      ...Object.fromEntries(SERIES.map((item) => [item.key, number(point?.[item.key])])),
    }))
    .filter((point) => point.date && SERIES.some((item) => point[item.key] !== null));

  if (data.length < 2) {
    return (
      <p className="mb-5 text-xs text-gray-600">
        The gathered-resources trend appears after this player has been captured in at least three
        snapshots.
      </p>
    );
  }

  const latest = data[data.length - 1];

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
            Gathered trend
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Gained since the previous capture, not the running total · mana, wood, gold and ore on
            the left axis, gems on the right
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-gray-600">
          {data.length} snapshots
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              yAxisId="main"
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compact}
              width={44}
            />
            <YAxis
              yAxisId="gems"
              orientation="right"
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compact}
              width={44}
            />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value, name) => [exact(value), name]}
            />
            {SERIES.map((item) => (
              <Line
                key={item.key}
                yAxisId={item.axis}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {SERIES.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
              {item.label}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-neutral-200">
              {exact(latest[item.key])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
