'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';

export default function AlmanacGate() {
  const router = useRouter();
  const [pass, setPass] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/almanac/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Incorrect password');
        return;
      }
      setPass('');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="halftone flex min-h-[70vh] items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-gray-800 bg-discord-surface p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-gray-500">
          <KeyRound className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Restricted
          </span>
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-neutral-100">Almanac</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
          Enter the password to continue.
        </p>

        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Password
          </span>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
            className="mt-1.5 w-full rounded-md border border-gray-800 bg-discord-bg-darker px-3 py-2 text-[13px] text-neutral-100 outline-none transition focus:border-gray-500"
          />
        </label>

        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || !pass}
          className="mt-5 w-full cursor-pointer rounded-md bg-gray-100 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}