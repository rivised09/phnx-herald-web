'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown } from 'lucide-react';

export const MERIT_TYPES = ['infantry', 'cavalry', 'marksman', 'mage'];

/**
 * Merit controls beside the roster search: a multi-select over the four troop
 * types (plus "All") and a descending/ascending toggle.
 *
 * The selection is a plain list of troop keys owned by the caller; an empty
 * list means "no merit filter" and the roster keeps its stored (power-rank)
 * order. A non-empty selection orders the players by the merit total of the
 * chosen types, which is what makes "All" the total-merits view. The choices
 * live in one dropdown rather than a chip per type, so the row stays compact
 * however many are picked; the trigger summarises the current selection and
 * the order button names its direction in words, not only by its arrow.
 */
export default function MeritFilter({
  value = [],
  onChange,
  order = 'desc',
  onOrderChange,
  label = 'Merit',
  allLabel = 'All',
  typeLabels = {},
  descLabel = 'Highest first',
  ascLabel = 'Lowest first',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const allActive = value.length === MERIT_TYPES.length;
  const active = value.length > 0;

  // The list is part of the page rather than a popover library, so dismissal
  // is a pointer that lands outside the control or a Escape keypress.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (key) => {
    if (key === 'all') {
      onChange(allActive ? [] : [...MERIT_TYPES]);
      return;
    }
    onChange(
      value.includes(key) ? value.filter((item) => item !== key) : [...value, key],
    );
  };

  const summary = !active
    ? '—'
    : allActive
      ? allLabel
      : value.map((key) => typeLabels[key] || key).join(', ');

  return (
    <div
      ref={rootRef}
      className="relative flex flex-wrap items-center gap-1.5 sm:justify-end"
    >
      <span className="mr-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-gray-600">
        {label}
      </span>

      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
          active
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
            : 'border-gray-800 bg-gray-500/5 text-gray-400 hover:border-gray-600 hover:text-neutral-100'
        }`}
      >
        <span className="max-w-[11rem] truncate">{summary}</span>
        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-800 bg-discord-surface py-1 shadow-xl shadow-black/50 sm:left-auto"
        >
          <MeritOption
            checked={allActive}
            label={allLabel}
            onClick={() => toggle('all')}
          />
          <div className="my-1 border-t border-gray-800" />
          {MERIT_TYPES.map((key) => (
            <MeritOption
              key={key}
              checked={value.includes(key)}
              label={typeLabels[key] || key}
              onClick={() => toggle(key)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        // Disabled while nothing is selected: there is no merit order to flip.
        disabled={!active}
        onClick={() => onOrderChange(order === 'desc' ? 'asc' : 'desc')}
        aria-label={order === 'desc' ? descLabel : ascLabel}
        title={order === 'desc' ? descLabel : ascLabel}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
          active
            ? 'cursor-pointer border-gray-800 bg-gray-500/5 text-gray-400 hover:border-gray-600 hover:text-neutral-100'
            : 'cursor-not-allowed border-gray-800/60 bg-gray-500/[0.03] text-gray-700'
        }`}
      >
        {order === 'desc' ? (
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-3 w-3" aria-hidden="true" />
        )}
        {/* The direction is spelled out, not only drawn. */}
        {order === 'desc' ? descLabel : ascLabel}
      </button>
    </div>
  );
}

function MeritOption({ checked, label, onClick }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-gray-300 transition hover:bg-gray-500/10 hover:text-neutral-100"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border transition ${
          checked ? 'border-amber-500/60 bg-amber-500/20 text-amber-300' : 'border-gray-700 text-transparent'
        }`}
      >
        <Check className="h-2.5 w-2.5" />
      </span>
      {label}
    </button>
  );
}
