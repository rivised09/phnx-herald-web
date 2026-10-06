'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import EventsView from '../../components/EventsView';
import { getEvents } from '../../lib/api';
import DashboardSkeleton from './DashboardSkeleton';

const TABS = [
  { key: 'ALL', label: (n) => `All (${n})` },
  { key: 'SCHEDULED', label: (n) => `Scheduled (${n})` },
  { key: 'ACTIVE', label: (n) => `Active (${n})` },
  { key: 'CANCELLED', label: (n) => `Cancelled (${n})` },
  { key: 'COMPLETED', label: (n) => `Completed (${n})` },
];

export default function DashboardClient({ initialFilter = 'SCHEDULED' }) {
  const [filter, setFilter] = useState(initialFilter);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvents();
      setAllEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('status', filter || 'ALL');
    window.history.replaceState(null, '', url.toString());
  }, [filter]);

  const counts = useMemo(() => {
    const c = { SCHEDULED: 0, ACTIVE: 0, CANCELLED: 0, COMPLETED: 0 };
    allEvents.forEach((e) => {
      if (c[e.status] !== undefined) c[e.status] += 1;
    });
    return c;
  }, [allEvents]);

  const events = useMemo(
    () => (filter ? allEvents.filter((e) => e.status === filter) : allEvents),
    [allEvents, filter]
  );

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
            01 / Events
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
            Manage Alliance Events
          </h1>
        </div>
        <Link
          href="/events/new"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition hover:-translate-y-px hover:border-white hover:bg-white hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_3px_8px_rgba(0,0,0,0.5)] active:translate-y-0"
        >
          <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
          Create Event
        </Link>
      </div>

      <div className="mb-3 -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <span className="mr-1 hidden font-mono text-[10px] uppercase tracking-[0.25em] text-gray-600 sm:inline-flex">
          Filter
        </span>
        {TABS.map((tab) => {
          const isActive = tab.key === 'ALL' ? filter === '' : filter === tab.key;
          const label =
            tab.key === 'ALL' ? tab.label(allEvents.length) : tab.label(counts[tab.key] || 0);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key === 'ALL' ? '' : tab.key)}
              aria-pressed={isActive}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
                isActive
                  ? 'border-transparent bg-gray-100 text-neutral-950'
                  : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-600 hover:text-neutral-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!loading && !error && allEvents.length > 0 && (
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-gray-500">
          Showing {events.length} of {allEvents.length} event{allEvents.length === 1 ? '' : 's'}
          {filter ? ` · filter: ${filter.toLowerCase()}` : ''}
        </p>
      )}

      {loading && <DashboardSkeleton />}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>Failed to load events: {error}</span>
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

      {!loading && !error && events.length === 0 && (
        <div className="halftone rounded-xl border border-dashed border-neutral-800 bg-discord-surface/50 px-6 py-12 text-center">
          <div className="mb-2 flex justify-center text-gray-500">
            <CalendarDays className="h-11 w-11" />
          </div>
          <p className="font-mono text-sm font-medium text-neutral-200">
            {filter ? `No ${filter.toLowerCase()} events found` : 'No events found'}
          </p>
          <p className="mb-3 mt-1 text-sm text-gray-500">
            {filter
              ? 'Events in this status will appear here.'
              : 'Create your first alliance event to announce it on Discord.'}
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && <EventsView events={events} />}
    </div>
  );
}