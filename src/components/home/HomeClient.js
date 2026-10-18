'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HomeView from './Home';

/**
 * The roster itself is server-rendered from the first load; this component
 * exists to keep two interactions working against the same read: the refresh
 * button, which goes through the web proxy so it can bypass the bot's short
 * cache, and the snapshot filter, which re-reads the list for another stored
 * date.
 *
 * The pinned date lives here rather than in the view because it selects the
 * DATA, not just where the row links point: picking a date fetches that
 * snapshot's payload through the same path the refresh button uses, and the
 * payload keeps its shape either way - same rows, same format, another day.
 * While that read is in flight the previous rows stay on screen at reduced
 * opacity (`pending`) instead of collapsing into a spinner: the old snapshot
 * is still true data, just about to be replaced.
 */
export default function HomeClient({ initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  // The snapshot the list is read for; '' means "newest", the default. It is
  // kept in the URL (?date=) by the view, so a reload or a round trip to a
  // detail page re-adopts it after hydration and reads it again here.
  const [snapshotDate, setSnapshotDate] = useState('');
  // True through the first effect run only: that first paint already carries
  // the server's read (including a pinned ?date= it rendered into the HTML),
  // so it only has to fetch when the read came up empty. Every later change -
  // including clearing the pin back to newest - must read again. Gating on
  // the empty date alone used to skip that and leave the pinned rows up.
  const firstEffect = useRef(true);

  const load = useCallback(async (iso, force) => {
    setPending(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (force) query.set('refresh', '1');
      if (iso) query.set('date', iso);
      const qs = query.toString();
      const res = await fetch(`/api/home/players${qs ? `?${qs}` : ''}`, {
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || body.error || `Request failed (${res.status})`);
      setData(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (firstEffect.current) {
      firstEffect.current = false;
      if (nonce === 0 && initialData) return;
    }
    load(snapshotDate, nonce > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, snapshotDate]);

  return (
    <HomeView
      data={data}
      loading={loading}
      pending={pending}
      error={error}
      snapshotDate={snapshotDate}
      onSnapshotChange={setSnapshotDate}
      onRetry={() => setNonce((n) => n + 1)}
    />
  );
}
