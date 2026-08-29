'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ban, Pencil, Trash2 } from 'lucide-react';
import { cancelEvent, deleteEvent } from '../lib/api';
import { askConfirmation, toastSuccess, toastError } from '../lib/swal';

export default function EventActions({ event, onCancelled }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    const confirmed = await askConfirmation({
      title: `Cancel "${event.title}"?`,
      text: 'Members will be notified and the Discord scheduled event will be cancelled.',
      confirmText: 'Yes, cancel it',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await cancelEvent(event.id);
      onCancelled?.(res.event);
      router.refresh();
      toastSuccess('Event cancelled.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const confirmed = await askConfirmation({
      title: `Delete "${event.title}"?`,
      text: 'This permanently deletes the event and removes its Discord announcement and scheduled event.',
      confirmText: 'Yes, delete it',
      danger: true,
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await deleteEvent(event.id);
      router.push('/dashboard');
      router.refresh();
      toastSuccess('Event deleted.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (event.status === 'COMPLETED') return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        {event.status !== 'CANCELLED' && (
          <>
            <Link
              href={`/events/${event.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md bg-discord-raised px-3.5 py-1.5 text-sm font-semibold text-discord-text transition hover:bg-discord-bg-darker"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/90 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Cancel Event
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-500/90 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}