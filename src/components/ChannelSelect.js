'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clapperboard, Volume2, X } from 'lucide-react';

function ChannelTypeIcon({ type }) {
  if (type === 'STAGE') return <Clapperboard className="mr-1.5 inline h-4 w-4" />;
  return <Volume2 className="mr-1.5 inline h-4 w-4" />;
}

const inputClass =
  'w-full rounded-md border border-black/40 bg-discord-bg-darker px-3 py-2 text-sm outline-none transition focus:border-blurple focus:ring-1 focus:ring-blurple';

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
        <div className="rounded-md border border-black/40 bg-discord-bg-darker px-3 py-2 text-sm text-discord-muted">
          Loading channels…
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
            <span className={selected || value ? 'flex items-center text-discord-text' : 'text-discord-muted'}>
              {selected && <ChannelTypeIcon type={selected.type} />}
              {display}
            </span>
            <ChevronDown className="h-4 w-4 text-discord-muted" />
          </div>

          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-black/40 bg-discord-bg-darker shadow-xl">
              <div className="border-b border-black/30 p-2">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to filter…"
                  className="w-full rounded border border-black/40 bg-discord-bg px-2 py-1.5 text-sm text-discord-text outline-none transition focus:border-blurple"
                />
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {value && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelect(null)}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-discord-muted transition hover:bg-discord-raised"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Clear selection
                    </button>
                  </li>
                )}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-discord-muted">No channels match.</li>
                )}
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-discord-raised ${
                        c.id === value ? 'font-semibold text-discord-text' : 'text-discord-text/90'
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