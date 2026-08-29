'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  toDateInputValue,
  toTimeInputValue,
  datetimePartsToUtcIso,
  formatLocalLong,
  formatUtc,
} from '../lib/time';
import TimeInput from './TimeInput';

const QUICK_TIMES = ['08:00', '12:00', '16:00', '18:00', '20:00', '23:00'];

const inputClass =
  'w-full rounded-md border border-black/40 bg-discord-bg-darker px-3 py-1.5 text-sm text-discord-text outline-none transition focus:border-blurple focus:ring-1 focus:ring-blurple';

const labelClass = 'mb-0.5 block text-[13px] font-medium text-discord-muted';

export default function DateTimePicker({ value, label, onChange, required = false }) {
  const [date, setDate] = useState(() => (value ? toDateInputValue(value) : ''));
  const [time, setTime] = useState(() => (value ? toTimeInputValue(value) : ''));

  useEffect(() => {
    if (value) {
      setDate(toDateInputValue(value));
      setTime(toTimeInputValue(value));
    }
  }, [value]);

  const previewIso = useMemo(() => datetimePartsToUtcIso(date, time), [date, time]);

  function apply(nextDate, nextTime) {
    setDate(nextDate);
    setTime(nextTime);
    onChange(datetimePartsToUtcIso(nextDate, nextTime));
  }

  return (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-discord-muted">
            Date
          </span>
          <input
            type="date"
            value={date}
            required={required}
            onChange={(e) => apply(e.target.value, time)}
            className={inputClass}
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-discord-muted">
            Time · 24-hour
          </span>
          <TimeInput value={time} required={required} onChange={(t) => apply(date, t)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-discord-muted">Quick:</span>
        {QUICK_TIMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => apply(date, t)}
            className={`rounded border px-2 py-0.5 text-xs transition ${
              time === t
                ? 'border-blurple bg-blurple/20 font-semibold text-blurple'
                : 'border-black/40 bg-discord-bg-darker text-discord-muted hover:text-discord-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {previewIso && (
        <div className="rounded-md border border-black/30 bg-discord-bg-darker/60 px-3 py-1.5 text-xs">
          <div className="text-discord-text">
            Your time: {formatLocalLong(previewIso)}
          </div>
          <div className="text-discord-muted">
            UTC: <span className="font-medium text-discord-text">{formatUtc(previewIso)}</span>
          </div>
        </div>
      )}
    </div>
  );
}