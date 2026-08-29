import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EventForm from '../../../components/EventForm';

export const metadata = {
  title: 'Create Event — Phoenix Herald',
};

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-discord-muted transition hover:text-discord-text">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Create New Event</h1>
        <p className="text-sm text-discord-muted">
          Publishing will post an announcement card to Discord and create a Discord scheduled event.
        </p>
      </div>

      <div className="rounded-xl border border-black/40 bg-discord-surface p-6 shadow-lg">
        <EventForm mode="create" />
      </div>
    </div>
  );
}