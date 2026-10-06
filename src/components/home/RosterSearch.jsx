'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

const KINDS = {
  alliance: { label: 'Alliance', chip: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  lord: { label: 'Lord', chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
};

/**
 * The home roster's lookup box: it does not narrow the tables, it offers the
 * rows you are probably after and takes you there.
 *
 * Every suggestion carries what kind of thing it is - an ALLIANCE or a LORD -
 * because the two lists have nothing else in common: without the label a tag
 * and a player name are just two strings on the same panel. Picking one goes
 * straight to that page, which is the point of a search that lands on a result
 * instead of a shorter table.
 *
 * It is a combobox: the arrow keys walk the list, Enter opens the highlighted
 * row, Escape closes the list first and clears the box second, and focus
 * leaving the whole control dismisses it. The rows are links as well, so a
 * pointer does the same job as the keyboard.
 *
 * `loading` is for the pages that read their roster as the box is used: while
 * the list has not arrived yet the box says so instead of reporting a term
 * that has not been searched for.
 */
export default function RosterSearch({ value, onChange, suggestions = [], loading = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = 'roster-suggestions';

  const expanded = open && value.trim().length > 0;
  const hasMatches = suggestions.length > 0;

  // A new term starts the highlight back on the first row, so Enter always
  // opens the top match rather than the one that used to sit there.
  useEffect(() => {
    setActive(0);
  }, [value]);

  const close = () => {
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (expanded) close();
      else if (value) onChange('');
      return;
    }
    if (!expanded || !hasMatches) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      const target = suggestions[active];
      if (target) {
        event.preventDefault();
        close();
        router.push(target.href);
      }
    }
  };

  return (
    <div
      className="relative w-full max-w-sm"
      onBlur={(event) => {
        // The list is inside this box, so only a focus that actually left the
        // control dismisses it - clicking a row keeps focus where it is.
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && hasMatches ? `${listId}-${active}` : undefined
          }
          aria-label="Search alliances and lords"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search alliances and lords…"
          className="w-full rounded-md border border-gray-800 bg-discord-bg-darker py-1.5 pl-8 pr-8 text-[13px] text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              close();
            }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-gray-500 transition hover:bg-gray-500/10 hover:text-neutral-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Roster suggestions"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-md border border-gray-800 bg-discord-surface py-1 shadow-xl shadow-black/50"
        >
          {hasMatches ? (
            suggestions.map((item, index) => {
              const kind = KINDS[item.kind];
              return (
                <li
                  key={item.key}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  className={`transition ${index === active ? 'bg-gray-500/10' : ''}`}
                >
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] ${kind.chip}`}
                    >
                      {kind.label}
                    </span>
                    <span className="min-w-0 truncate text-[13px] text-neutral-100">
                      {item.name}
                    </span>
                    {item.meta && (
                      <span className="ml-auto min-w-0 shrink truncate text-right font-mono text-[10px] text-gray-500">
                        {item.meta}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })
          ) : (
            <li
              role="presentation"
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500"
            >
              {/* A page that is still reading the roster says so rather than
                  claiming there are no matches for a term nobody has judged. */}
              {loading ? 'Loading roster…' : <>No matches for “{value.trim()}”</>}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
