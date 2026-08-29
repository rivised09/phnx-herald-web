'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent, updateEvent, getChannels } from '../lib/api';
import ChannelSelect from './ChannelSelect';
import DateTimePicker from './DateTimePicker';
import { toastSuccess, toastError } from '../lib/swal';

const ENTITY_TYPES = ['EXTERNAL', 'VOICE', 'STAGE_INSTANCE'];

const ENTITY_LABELS = {
  EXTERNAL: 'External Location',
  VOICE: 'Voice Channel Event',
  STAGE_INSTANCE: 'Stage Event',
};

export default function EventForm({ event: initialEvent, mode = 'create' }) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    title: initialEvent?.title || '',
    description: initialEvent?.description || '',
    startTime: initialEvent?.startTime || '',
    endTime: initialEvent?.endTime || '',
    location: initialEvent?.location || '',
    entityType: initialEvent?.entityType || 'EXTERNAL',
    channelId: initialEvent?.channelId || '',
  });

  const [submitting, setSubmitting] = useState(false);

  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState('');

  useEffect(() => {
    getChannels()
      .then((data) => setChannels(data.channels || []))
      .catch((err) => setChannelsError(err.message || 'Failed to load channels.'))
      .finally(() => setChannelsLoading(false));
  }, []);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      toastError('Title is required.');
      return;
    }
    if (!form.startTime) {
      toastError('Start time is required.');
      return;
    }
    if (form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
      toastError('End time must be after the start time.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startTime: form.startTime,
      endTime: form.endTime || null,
      location: form.location.trim() || null,
      entityType: form.entityType,
      channelId: form.entityType === 'EXTERNAL' ? null : form.channelId || null,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateEvent(initialEvent.id, payload);
        toastSuccess('Event updated.');
      } else {
        await createEvent(payload);
        toastSuccess('Event published.');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toastError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-black/40 bg-discord-bg-darker px-3 py-1.5 text-sm text-discord-text outline-none transition focus:border-blurple focus:ring-1 focus:ring-blurple';

  const labelClass = 'mb-0.5 block text-[13px] font-medium text-discord-muted';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Event Title *</label>
        <input
          type="text"
          maxLength={100}
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="eg. Elite Bear Raid"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Describe the event..."
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimePicker
          label="Start Time *"
          value={form.startTime}
          onChange={(v) => setField('startTime', v)}
          required
        />
        <DateTimePicker
          label="End Time"
          value={form.endTime}
          onChange={(v) => setField('endTime', v)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Event Type</label>
          <select
            value={form.entityType}
            onChange={(e) => setField('entityType', e.target.value)}
            className={inputClass}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {form.entityType === 'EXTERNAL' ? (
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              maxLength={100}
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              placeholder="[optional] (eg. Zone 1)"
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              {form.entityType === 'VOICE' ? 'Voice Channel' : 'Stage Channel'}
            </label>
            <ChannelSelect
              channels={
                form.entityType === 'VOICE'
                  ? channels.filter((c) => c.type === 'VOICE')
                  : channels
              }
              value={form.channelId}
              onChange={(id) => setField('channelId', id)}
              loading={channelsLoading}
              error={channelsError}
              placeholder={
                form.entityType === 'VOICE'
                  ? 'Search voice channels…'
                  : 'Search all channels…'
              }
            />
            {!channelsLoading && !channelsError && (
              <p className="mt-1 text-xs text-discord-muted">
                Channels sync automatically from Discord.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (isEdit ? 'Saving...' : 'Publishing...') : isEdit ? 'Save Changes' : 'Publish Event'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-discord-raised px-4 py-2 text-sm font-semibold text-discord-text transition hover:bg-discord-bg-darker"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}