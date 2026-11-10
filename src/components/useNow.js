'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `ms`, so clock-derived UI (event phase,
 * status badges) flips live instead of waiting for a reload or for the
 * backend status to catch up.
 */
export default function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);

  return now;
}
