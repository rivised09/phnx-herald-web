'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  Loader2,
  Search,
} from 'lucide-react';

const PAGE_SIZE = 25;

function initialDraft(player) {
  return { discordId: player.discordId || '', discordName: player.discordName || '' };
}

export default function TrackingClient() {
  const [players, setPlayers] = useState([]);
  const [query, setQuery] = useState('');
  const [trackingFilter, setTrackingFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/tracking', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('The tracking list could not be loaded');
        return response.json();
      })
      .then((data) => {
        setPlayers(data.players || []);
        setDrafts(Object.fromEntries((data.players || []).map((player) => [player.id, initialDraft(player)])));
      })
      .catch((err) => setError(err.message));
  }, []);

  const visiblePlayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = players.filter((player) => {
      const tracked = Boolean(player.discordId || player.discordName);
      const matchesStatus =
        trackingFilter === 'all' ||
        (trackingFilter === 'tracked' && tracked) ||
        (trackingFilter === 'untracked' && !tracked);
      const matchesSearch =
        !needle ||
        [player.gameId, player.name, player.discordId, player.discordName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesSearch;
    });

    return filtered.sort((left, right) => {
      const a = String(left[sortKey] || '').toLowerCase();
      const b = String(right[sortKey] || '').toLowerCase();
      const result = a.localeCompare(b, undefined, { numeric: sortKey === 'gameId' });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [players, query, sortKey, sortDirection, trackingFilter]);

  const pageCount = Math.max(1, Math.ceil(visiblePlayers.length / PAGE_SIZE));
  const pagePlayers = visiblePlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = visiblePlayers.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, visiblePlayers.length);

  useEffect(() => {
    setPage(1);
  }, [query, trackingFilter, sortKey, sortDirection]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  function changeSort(key) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function updateDraft(id, field, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setSaved(null);
  }

  async function save(player) {
    setSaving(player.id);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch(`/api/tracking/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drafts[player.id]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The player could not be updated');
      setPlayers((current) =>
        current.map((item) =>
          item.id === player.id
            ? { ...item, discordId: data.discordId, discordName: data.discordName }
            : item,
        ),
      );
      setDrafts((current) => ({ ...current, [player.id]: initialDraft(data) }));
      setSaved(player.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
          02 / Tracking
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Player Discord Tracking
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Bind game accounts to their Discord profiles so players can be identified in the alliance.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-gray-800 bg-discord-surface px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-gray-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search game ID, player, or Discord profile"
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-gray-600"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
          Filter
        </span>
        {[
          ['all', 'All'],
          ['tracked', 'Tracked'],
          ['untracked', 'Untracked'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTrackingFilter(value)}
            aria-pressed={trackingFilter === value}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
              trackingFilter === value
                ? 'border-transparent bg-gray-100 text-neutral-950'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-neutral-200'
            }`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
          Sort
          <select
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value);
              setSortDirection('asc');
            }}
            className="rounded border border-gray-800 bg-discord-surface px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-gray-400 outline-none focus:border-gray-600"
          >
            <option value="gameId">Game ID</option>
            <option value="name">Name</option>
            <option value="discordId">Discord ID</option>
            <option value="discordName">Discord name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            className="rounded border border-gray-800 p-1.5 text-gray-500 transition hover:border-gray-600 hover:text-neutral-200"
            aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
          </button>
        </label>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-gray-800 bg-discord-surface">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="border-b border-gray-800 bg-black/20">
            <tr className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              {[
                ['gameId', 'Game ID'],
                ['name', 'Name'],
                ['discordId', 'Discord ID'],
                ['discordName', 'Discord name'],
              ].map(([key, label]) => (
                <th key={key} className="px-4 py-3 font-normal">
                  <button
                    type="button"
                    onClick={() => changeSort(key)}
                    className="inline-flex items-center gap-1.5 transition hover:text-neutral-200"
                    aria-label={`Sort by ${label}`}
                    aria-sort={sortKey === key ? sortDirection : 'none'}
                  >
                    {label}
                    {sortKey === key ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-700" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {pagePlayers.map((player) => {
              const draft = drafts[player.id] || initialDraft(player);
              const isSaving = saving === player.id;
              return (
                <tr key={player.id} className="align-middle hover:bg-gray-500/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-amber-200">
                    {player.gameId}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-100">{player.name}</td>
                  <td className="px-4 py-3">
                    <input
                      value={draft.discordId}
                      onChange={(event) => updateDraft(player.id, 'discordId', event.target.value)}
                      placeholder="Not linked"
                      className="w-full rounded border border-gray-700 bg-black/20 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-gray-600 focus:border-gray-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={draft.discordName}
                      onChange={(event) => updateDraft(player.id, 'discordName', event.target.value)}
                      placeholder="Not linked"
                      className="w-full rounded border border-gray-700 bg-black/20 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-gray-600 focus:border-gray-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => save(player)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 rounded border border-gray-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved === player.id ? <Check className="h-3 w-3" /> : null}
                      {isSaving ? 'Saving' : saved === player.id ? 'Saved' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!players.length && !error ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Loading players...</p>
        ) : null}
        {players.length > 0 && !visiblePlayers.length ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No matching players found.</p>
        ) : null}
      </div>

      {visiblePlayers.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
            Showing {firstResult}-{lastResult} of {visiblePlayers.length} players
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-3 w-3" />
              Previous
            </button>
            <span className="min-w-20 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="inline-flex items-center gap-1 rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
