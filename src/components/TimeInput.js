'use client';

import { useEffect, useRef, useState } from 'react';

function digitsToMilitary(digits) {
  let h;
  let m = 0;
  if (digits.length <= 2) {
    h = parseInt(digits, 10);
  } else {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10) || 0;
  }
  if (Number.isNaN(h) || h > 23) return null;
  if (m > 59) m = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const inputClass =
  'w-full rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-1.5 text-sm text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500 focus:ring-1 focus:ring-gray-500';

export default function TimeInput({ value, onChange, required = false }) {
  const [draft, setDraft] = useState(value || '');
  const [focused, setFocused] = useState(false);
  const lastValidRef = useRef(value || '');

  useEffect(() => {
    if (!focused) {
      setDraft(value || '');
      if (value) lastValidRef.current = value;
    }
  }, [value, focused]);

  function parse(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return { empty: true };
    if (digits.length > 4) return null;
    const normalized = digitsToMilitary(digits);
    if (!normalized) return null;
    const exact = /^\d{2}:\d{2}$/.test(raw) || /^\d{4}$/.test(raw);
    return { normalized, exact };
  }

  function handleChange(raw) {
    setDraft(raw);
    const p = parse(raw);
    if (!p) return;
    if (p.empty) {
      lastValidRef.current = '';
      onChange(null);
      return;
    }
    if (p.exact) {
      lastValidRef.current = p.normalized;
      onChange(p.normalized);
    }
  }

  function handleBlur() {
    setFocused(false);
    const p = parse(draft);
    if (!p || p.empty) {
      setDraft('');
      lastValidRef.current = '';
      onChange(null);
      return;
    }
    setDraft(p.normalized);
    lastValidRef.current = p.normalized;
    onChange(p.normalized);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="20:00"
      maxLength={5}
      value={draft}
      required={required}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      className={inputClass}
    />
  );
}