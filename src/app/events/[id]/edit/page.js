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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-discord-muted transition hover:text-discord-text">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Event</h1>
        <p className="text-sm text-discord-muted">
          Changes will update the Discord announcement card and scheduled event.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-8 text-center">
          <p className="text-red-400">Failed to load event: {error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-black/40 bg-discord-surface p-6 shadow-lg">
          <EventForm event={event} mode="edit" />
        </div>
      )}
    </div>
  );
}