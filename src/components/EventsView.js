'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import EventCard from './EventCard';
import EventListItem from './EventListItem';

export default function EventsView({ events }) {
  const [view, setView] = useState('cards');

  useEffect(() => {
    const saved = localStorage.getItem('phnx-view');
    if (saved === 'cards' || saved === 'list') setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('phnx-view', view);
  }, [view]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-md border border-black/40 bg-discord-bg-darker p-0.5">
          <button
            onClick={() => setView('cards')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              view === 'cards'
                ? 'bg-blurple text-white'
                : 'text-discord-muted hover:text-discord-text'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              view === 'list'
                ? 'bg-blurple text-white'
                : 'text-discord-muted hover:text-discord-text'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}