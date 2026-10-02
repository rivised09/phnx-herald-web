'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clapperboard, Volume2, X } from 'lucide-react';

function ChannelTypeIcon({ type }) {
  if (type === 'STAGE') return <Clapperboard className="mr-1.5 inline h-4 w-4" />;
  return <Volume2 className="mr-1.5 inline h-4 w-4" />;
}

const inputClass =
  'w-full rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-1.5 text-sm outline-none transition placeholder:text-gray-600 focus:border-gray-500 focus:ring-1 focus:ring-gray-500';

export default function ChannelSelect({ channels = [], value, onChange, loading, error, placeholder = 'Search channels…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selected = channels.find((c) => c.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, query]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  function handleToggle() {
    setQuery('');
    setOpen((o) => !o);
  }

  function handleSelect(id) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  let display = placeholder;
  if (selected) {
    display = `${selected.name}`;
  } else if (value) {
    display = `Unknown channel (${value})`;
  }

  return (
    <div ref={containerRef} className="relative">
      {loading ? (
        <div className="space-y-1.5" role="status" aria-label="Loading channels">
          <div className="h-9 animate-pulse rounded-md border border-gray-800 bg-discord-bg-darker" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-800" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            className={`${inputClass} flex cursor-pointer items-center justify-between`}
          >
            <span className={selected || value ? 'flex items-center text-neutral-100' : 'text-gray-500'}>
              {selected && <ChannelTypeIcon type={selected.type} />}
              {display}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>

          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-800 bg-neutral-950 shadow-xl">
              <div className="border-b border-gray-800 p-2">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to filter…"
                  className="w-full rounded border border-gray-800 bg-discord-bg px-2 py-1.5 text-sm text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {value && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelect(null)}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-500 transition hover:bg-gray-800/40 hover:text-neutral-100"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Clear selection
                    </button>
                  </li>
                )}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">No channels match.</li>
                )}
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-gray-800/40 ${
                        c.id === value ? 'bg-gray-800/60 font-medium text-neutral-100' : 'text-neutral-100/90'
                      }`}
                    >
                      <ChannelTypeIcon type={c.type} />
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}