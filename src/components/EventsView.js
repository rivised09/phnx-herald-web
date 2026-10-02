'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import EventCard from './EventCard';
import EventListItem from './EventListItem';
import Pagination from './Pagination';

const DEFAULT_PAGE_SIZE = 4;

export default function EventsView({ events, pageSize = DEFAULT_PAGE_SIZE }) {
  const [view, setView] = useState('cards');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem('phnx-view');
    if (saved === 'cards' || saved === 'list') setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('phnx-view', view);
  }, [view]);

  useEffect(() => {
    setPage(1);
  }, [events]);

  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return events.slice(start, start + pageSize);
  }, [events, page, pageSize]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="inline-flex rounded-full border border-gray-800 bg-transparent p-0.5">
          <button
            onClick={() => setView('cards')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
              view === 'cards'
                ? 'bg-gray-100 text-neutral-950'
                : 'text-gray-500 hover:text-neutral-200'
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            Cards
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
              view === 'list'
                ? 'bg-gray-100 text-neutral-950'
                : 'text-gray-500 hover:text-neutral-200'
            }`}
          >
            <List className="h-3 w-3" />
            List
          </button>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {paged.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </div>
      )}

      <Pagination
        total={total}
        pageSize={pageSize}
        page={page}
        onPageChange={setPage}
        className="mt-3"
      />
    </div>
  );
}