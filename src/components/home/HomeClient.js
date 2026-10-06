'use client';

import { useCallback, useEffect, useState } from 'react';
import HomeView from './Home';

/**
 * The roster itself is server-rendered from the first load; this component only
 * exists to keep the refresh button working, which has to go through the web
 * proxy so it can bypass the bot's short cache.
 */
export default function HomeClient({ initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = nonce > 0 ? new URLSearchParams({ refresh: '1' }) : null;
      const res = await fetch(`/api/home/players${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || body.error || `Request failed (${res.status})`);
      setData(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  // First paint already carries the server's read, so only ask again when it
  // came up empty or when someone hits the refresh button.
  useEffect(() => {
    if (nonce === 0 && initialData) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <HomeView
      data={data}
      loading={loading}
      error={error}
      onRetry={() => setNonce((n) => n + 1)}
    />
  );
}
