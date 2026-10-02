'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const SLOT_HOURS = 2;
const SLOT_COUNT = 24 / SLOT_HOURS;
const AXIS_LABELS = [
  { label: '00', col: 'col-start-1' },
  { label: '06', col: 'col-start-4' },
  { label: '12', col: 'col-start-7' },
  { label: '18', col: 'col-start-10' },
  { label: '24', col: 'col-start-12 text-right' },
];

const HOVER_INTENT_MS = 140;

function parseToken(token) {
  const m = String(token).trim().match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end > 24 || end <= start) return null;
  return start;
}

export function parseSlots(value) {
  const starts = new Set();
  const raw = [];
  String(value || '')
    .split(',')
    .forEach((token) => {
      const t = token.trim();
      if (!t) return;
      const start = parseToken(t);
      if (start === null) {
        raw.push(t);
        return;
      }
      starts.add(start);
    });
  return { starts, raw };
}

const fmt = (h) => `${String(h).padStart(2, '0')}:00`;

function mergeRanges(starts) {
  const sorted = [...starts].sort((a, b) => a - b);
  const ranges = [];
  let from = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const s = sorted[i];
    if (s !== prev + SLOT_HOURS) {
      ranges.push(`${fmt(from)}–${fmt(prev + SLOT_HOURS)}`);
      from = s;
    }
    prev = s;
  }
  if (sorted.length) ranges.push(`${fmt(from)}–${fmt(prev + SLOT_HOURS)}`);
  return ranges;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Shared tooltip state for the slot charts.
 * Hover shows after a short intent delay; click pins the tooltip open until it
 * is dismissed with the close button, Escape, or a click outside the root.
 */
function useSlotTooltip() {
  const [pinned, setPinned] = useState(null);
  const [hovered, setHovered] = useState(null);
  const rootRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!pinned) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setPinned(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPinned(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pinned]);

  const showHover = useCallback((payload) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovered(payload), HOVER_INTENT_MS);
  }, []);

  const hideHover = useCallback(() => {
    clearTimeout(timer.current);
    setHovered(null);
  }, []);

  const togglePin = useCallback((payload) => {
    clearTimeout(timer.current);
    setPinned((prev) => (prev && prev.key === payload.key ? null : payload));
  }, []);

  const active = pinned || hovered;

  return { active, rootRef, showHover, hideHover, togglePin, setPinned };
}

function SlotTooltip({ data, onClose, xPercent }) {
  return (
    <div
      role="tooltip"
      style={{ left: `${xPercent}%` }}
      className="pointer-events-auto absolute bottom-full z-30 mb-1.5 w-max max-w-[14rem] -translate-x-1/2 rounded-md border border-gray-700 bg-discord-bg-darker px-2.5 py-2 text-left shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
          {data.heading}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="-mr-0.5 -mt-0.5 cursor-pointer rounded p-0.5 text-gray-500 transition hover:bg-gray-500/10 hover:text-neutral-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1 font-mono text-[11px] text-neutral-100">{data.range}</div>

      <dl className="mt-1.5 space-y-0.5 font-mono text-[10px]">
        {data.rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className={row.strong ? 'text-neutral-100' : 'text-gray-400'}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[2px] bg-gray-100" />
        Active
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[2px] border border-gray-800 bg-gray-800/50" />
        Not active
      </span>
      <span>All times UTC</span>
    </div>
  );
}

function TimelineRow({ label, value, activeClass }) {
  const { starts, raw } = useMemo(() => parseSlots(value), [value]);
  const hours = starts.size * SLOT_HOURS;
  const ranges = useMemo(() => mergeRanges(starts), [starts]);
  const { active, rootRef, showHover, hideHover, togglePin, setPinned } = useSlotTooltip();

  const header = (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
        {label}
      </span>
      <span className="font-mono text-[10px] text-gray-400">
        {hours}h active
        {raw.length > 0 && (
          <span className="ml-1.5 text-gray-600">+ {raw.length} unrecognised</span>
        )}
      </span>
    </div>
  );

  if (!starts.size && !raw.length) {
    return (
      <div>
        {header}
        <div className="grid grid-cols-12 gap-[3px]">
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <div
              key={i}
              className="h-6 rounded-[3px] border border-gray-800/60 bg-gray-800/30"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}

      <div className="relative" ref={rootRef}>
        <div className="grid grid-cols-12 gap-[3px]">
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const start = i * SLOT_HOURS;
            const activeSlot = starts.has(start);
            const key = `${label}:${start}`;
            const isActive = active?.key === key;

            return (
              <button
                key={start}
                type="button"
                onClick={() =>
                  togglePin({
                    key,
                    heading: label,
                    range: `${fmt(start)} – ${fmt(start + SLOT_HOURS)} UTC`,
                    rows: [
                      {
                        label: 'Status',
                        value: activeSlot ? 'Active' : 'Not active',
                        strong: activeSlot,
                      },
                    ],
                  })
                }
                onMouseEnter={() =>
                  showHover({
                    key,
                    heading: label,
                    range: `${fmt(start)} – ${fmt(start + SLOT_HOURS)} UTC`,
                    rows: [
                      {
                        label: 'Status',
                        value: activeSlot ? 'Active' : 'Not active',
                        strong: activeSlot,
                      },
                    ],
                  })
                }
                onMouseLeave={hideHover}
                onFocus={() =>
                  showHover({
                    key,
                    heading: label,
                    range: `${fmt(start)} – ${fmt(start + SLOT_HOURS)} UTC`,
                    rows: [
                      {
                        label: 'Status',
                        value: activeSlot ? 'Active' : 'Not active',
                        strong: activeSlot,
                      },
                    ],
                  })
                }
                onBlur={hideHover}
                aria-label={`${label} ${fmt(start)} to ${fmt(start + SLOT_HOURS)} UTC, ${
                  activeSlot ? 'active' : 'not active'
                }`}
                className={`flex h-6 cursor-pointer items-center justify-center rounded-[3px] font-mono text-[9px] leading-none transition focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 ${
                  activeSlot
                    ? `${activeClass} text-neutral-950`
                    : 'border border-gray-800/60 bg-gray-800/30 text-gray-600'
                } ${isActive ? 'ring-1 ring-neutral-100' : ''}`}
              >
                <span className="hidden sm:inline">{String(start).padStart(2, '0')}</span>
              </button>
            );
          })}
        </div>

        {active && (
          <SlotTooltip
            data={active}
            onClose={() => setPinned(null)}
            xPercent={clamp(
              (((active.key.split(':')[1] || 0) / SLOT_HOURS + 0.5) / SLOT_COUNT) * 100,
              12,
              88,
            )}
          />
        )}
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-gray-500">
        {ranges.join('  ·  ')}
      </p>
    </div>
  );
}

export default function ActivityTimeline({ weekday, weekend }) {
  return (
    <div className="space-y-3.5">
      <TimelineRow label="Weekdays" value={weekday} activeClass="bg-gray-100" />
      <TimelineRow label="Weekends" value={weekend} activeClass="bg-gray-300" />
      <Legend />
    </div>
  );
}

export function ActivityCoverage({ players }) {
  const { total, week, weekend } = useMemo(() => {
    const w = Array(SLOT_COUNT).fill(0);
    const e = Array(SLOT_COUNT).fill(0);
    players.forEach((p) => {
      parseSlots(p.weekday).starts.forEach((s) => {
        w[s / SLOT_HOURS] += 1;
      });
      parseSlots(p.weekend).starts.forEach((s) => {
        e[s / SLOT_HOURS] += 1;
      });
    });
    return { total: players.length || 1, week: w, weekend: e };
  }, [players]);

  const rows = [
    { label: 'Weekdays', counts: week, bar: 'bg-gray-100' },
    { label: 'Weekends', counts: weekend, bar: 'bg-gray-300' },
  ];

  const { active, rootRef, showHover, hideHover, togglePin, setPinned } = useSlotTooltip();

  return (
    <div className="space-y-4" ref={rootRef}>
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              {row.label}
            </span>
            <span className="font-mono text-[10px] text-gray-600">
              peak {Math.max(...row.counts)} of {total}
            </span>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="border-t border-dashed border-gray-800" />
              <div className="border-t border-dashed border-gray-800" />
              <div className="border-t border-gray-800" />
            </div>

            <div className="relative grid grid-cols-12 gap-[3px]">
              {row.counts.map((count, i) => {
                const pct = Math.round((count / total) * 100);
                const start = i * SLOT_HOURS;
                const key = `${row.label}:${start}`;
                const isActive = active?.key === key;
                const payload = {
                  key,
                  heading: `${row.label} · ${fmt(start)}`,
                  range: `${fmt(start)} – ${fmt(start + SLOT_HOURS)} UTC`,
                  rows: [
                    { label: 'Members', value: `${count} of ${total}`, strong: true },
                    { label: 'Share', value: `${pct}%` },
                  ],
                };

                return (
                  <button
                    key={start}
                    type="button"
                    onClick={() => togglePin(payload)}
                    onMouseEnter={() => showHover(payload)}
                    onMouseLeave={hideHover}
                    onFocus={() => showHover(payload)}
                    onBlur={hideHover}
                    aria-label={`${row.label} ${fmt(start)} to ${fmt(
                      start + SLOT_HOURS,
                    )} UTC, ${count} of ${total} members, ${pct} percent`}
                    className={`flex h-14 cursor-pointer flex-col justify-end rounded-[2px] focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 ${
                      isActive ? 'bg-gray-500/10' : ''
                    }`}
                  >
                    <span className="mb-0.5 text-center font-mono text-[9px] leading-none text-gray-400">
                      {count ? `${pct}%` : '–'}
                    </span>
                    <span
                      className={`block w-full rounded-[2px] ${row.bar} ${
                        isActive ? 'ring-1 ring-neutral-100' : ''
                      }`}
                      style={{
                        height: `${Math.max(pct, count ? 5 : 2)}%`,
                        opacity: count ? 0.4 + (pct / 100) * 0.6 : 0.12,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {active && active.key.startsWith(`${row.label}:`) && (
              <SlotTooltip
                data={active}
                onClose={() => setPinned(null)}
                xPercent={clamp(
                  (((active.key.split(':')[1] || 0) / SLOT_HOURS + 0.5) / SLOT_COUNT) * 100,
                  12,
                  88,
                )}
              />
            )}

            <div className="mt-1 grid grid-cols-12 font-mono text-[9px] text-gray-600">
              {AXIS_LABELS.map((a) => (
                <span key={a.label} className={a.col}>
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}