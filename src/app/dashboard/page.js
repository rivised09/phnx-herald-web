import Link from 'next/link';
import { CalendarDays, Funnel } from 'lucide-react';
import EventsView from '../../components/EventsView';
import { getEvents } from '../../lib/api';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['SCHEDULED', 'ACTIVE', 'CANCELLED', 'COMPLETED'];

export default async function DashboardPage({ searchParams }) {
  const sp = await searchParams;
  const requested = String(sp?.status || '').toUpperCase();
  const activeStatus = VALID_STATUS.includes(requested) ? requested : '';

  let allEvents = [];
  let error = null;

  try {
    const data = await getEvents();
    allEvents = data.events || [];
  } catch (err) {
    error = err.message;
  }

  const counts = { SCHEDULED: 0, ACTIVE: 0, CANCELLED: 0, COMPLETED: 0 };
  allEvents.forEach((e) => {
    if (counts[e.status] !== undefined) counts[e.status] += 1;
  });

  const events = activeStatus ? allEvents.filter((e) => e.status === activeStatus) : allEvents;

  const tabs = [
    { key: '', label: `All (${allEvents.length})` },
    { key: 'SCHEDULED', label: `Scheduled (${counts.SCHEDULED})` },
    { key: 'ACTIVE', label: `Active (${counts.ACTIVE})` },
    { key: 'CANCELLED', label: `Cancelled (${counts.CANCELLED})` },
    { key: 'COMPLETED', label: `Completed (${counts.COMPLETED})` },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Alliance Events</h1>
          <p className="mt-1 text-sm text-discord-muted">
            Events sync instantly to your Discord channel as announcement cards and scheduled events.
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-md bg-blurple px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blurple/30 transition hover:bg-blurple-dark"
        >
          + Create Event
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-discord-muted">
          <Funnel className="h-3.5 w-3.5" />
          Filter
        </span>
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <Link
              key={tab.key || 'all'}
              href={tab.key ? `/dashboard?status=${tab.key}` : '/dashboard'}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-blurple text-white shadow-md shadow-blurple/30'
                  : 'bg-discord-raised text-discord-muted hover:bg-discord-bg-darker hover:text-discord-text'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {!error && allEvents.length > 0 && (
        <p className="mb-3 text-xs text-discord-muted">
          Showing {events.length} of {allEvents.length} event{allEvents.length === 1 ? '' : 's'}
          {activeStatus ? ` · filter: ${activeStatus.toLowerCase()}` : ''}
        </p>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load events: {error}
        </div>
      )}

      {!error && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/40 bg-discord-surface/50 px-6 py-16 text-center">
          <div className="mb-2 flex justify-center text-discord-muted">
            <CalendarDays className="h-12 w-12" />
          </div>
          <p className="mb-1 font-semibold">
            {activeStatus ? `No ${activeStatus.toLowerCase()} events found` : 'No events found'}
          </p>
          <p className="mb-4 text-sm text-discord-muted">
            {activeStatus
              ? 'Events filtered by this status will appear here.'
              : 'Create your first alliance event to announce it on Discord.'}
          </p>
          <Link
            href="/events/new"
            className="inline-block rounded-md bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple-dark"
          >
            + Create Event
          </Link>
        </div>
      )}

      {!error && events.length > 0 && <EventsView events={events} />}
    </div>
  );
}