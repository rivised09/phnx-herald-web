import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EventForm from '../../../../components/EventForm';
import { getEvent } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit Event — Phoenix Herald',
};

export default async function EditEventPage({ params }) {
  const { id } = await params;
  let event = null;
  let error = null;

  try {
    const data = await getEvent(id);
    event = data.event;
  } catch (err) {
    error = err.message;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-md border border-gray-800 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
          03 / Edit
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">Edit Event</h1>
        <p className="mt-1 text-sm text-gray-500">
          Changes will update the Discord announcement card and scheduled event.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-6 py-8 text-center">
          <p className="text-red-400">Failed to load event: {error}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-discord-surface p-5">
          <EventForm event={event} mode="edit" />
        </div>
      )}
    </div>
  );
}