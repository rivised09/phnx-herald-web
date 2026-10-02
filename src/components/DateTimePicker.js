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
  'w-full rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-1.5 text-sm text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500 focus:ring-1 focus:ring-gray-500';

const labelClass = 'mb-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500';

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
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
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
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Time · 24-hour
          </span>
          <TimeInput value={time} required={required} onChange={(t) => apply(date, t)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">Quick:</span>
        {QUICK_TIMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => apply(date, t)}
            className={`rounded-full border px-2 py-0.5 font-mono text-xs transition ${
              time === t
                ? 'border-transparent bg-gray-100 font-medium text-neutral-950'
                : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-600 hover:text-neutral-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {previewIso && (
        <div className="rounded-md border border-gray-800 bg-discord-bg-darker/60 px-3 py-1.5 text-xs">
          <div className="text-neutral-100">
            Your time: {formatLocalLong(previewIso)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
            UTC: <span className="font-medium text-gray-300">{formatUtc(previewIso)}</span>
          </div>
        </div>
      )}
    </div>
  );
}