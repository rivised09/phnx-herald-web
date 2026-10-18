'use client';

import { History } from 'lucide-react';

/**
 * The home page's snapshot selector: the same date list and styling as the
 * detail page's SnapshotPicker, but it does not navigate itself - the picked
 * date rides along on every roster row link as ?date=, so clicking a player
 * or an alliance opens that snapshot's detail, where the detail's own picker
 * then shows the same date. Picking the newest date drops the pin again, and
 * the choice is mirrored into the page URL so a reload or a round trip to a
 * detail page keeps it.
 *
 * Like the detail picker, it renders nothing while only one snapshot exists -
 * there would be nothing to switch to.
 */
export default function SnapshotFilter({
  dates = [],
  value = '',
  onChange,
  label = 'Snapshot',
  ariaLabel = 'Snapshot date',
  latestLabel = (date) => `Latest \u00b7 ${date}`,
  archivedLabel = null,
}) {
  if (dates.length < 2) return null;

  const latest = dates[0];
  const active = value || latest;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
        <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
        <select
          aria-label={ariaLabel}
          value={active}
          onChange={(event) => onChange(event.target.value)}
          className="cursor-pointer rounded-md border border-gray-700/70 bg-discord-bg-darker px-2 py-1 font-mono text-[11px] tracking-normal text-neutral-100 outline-none transition hover:border-gray-500 focus:border-gray-400"
        >
          {dates.map((date) => (
            <option key={date} value={date}>
              {date === latest ? latestLabel(date) : date}
            </option>
          ))}
        </select>
      </label>

      {value && value !== latest && archivedLabel ? (
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-200">
          {archivedLabel}
        </span>
      ) : null}
    </div>
  );
}
