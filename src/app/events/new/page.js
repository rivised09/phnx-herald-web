import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EventForm from '../../../components/EventForm';

export const metadata = {
  title: 'Create Event — Phoenix Herald',
};

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-md border border-gray-800 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
          02 / Create
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">New Event</h1>
        <p className="mt-1 text-sm text-gray-500">
          Publishing will post an announcement card to Discord and create a Discord scheduled event.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-discord-surface p-5">
        <EventForm mode="create" />
      </div>
    </div>
  );
}