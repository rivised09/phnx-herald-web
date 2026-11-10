import { getApiBaseUrl } from './apiBase';

/**
 * One request to the app's own API routes (or, server-side, straight to the
 * bot).
 *
 * Every call gets a timeout. Without one a settings proxy that accepts the
 * connection but never answers leaves the promise pending forever, which is
 * exactly how the RoW "Loading saved rosters…" spinner got stuck: the spinner
 * only clears when the promise settles, so a hung upstream meant an infinite
 * spinner. A timeout turns that into a visible error a user can retry.
 */
const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  let url = path;
  if (typeof window === 'undefined') {
    url = `${getApiBaseUrl()}${path}`;
  }

  const { timeout = DEFAULT_TIMEOUT_MS, ...rest } = options;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeout),
      ...rest,
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error(
        `The server did not respond within ${Math.round(timeout / 1000)} seconds. Please try again.`,
      );
    }
    throw error;
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

export function getEvents({ status, upcoming } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (upcoming) params.set('upcoming', 'true');
  const q = params.toString();
  return request(`/api/events${q ? `?${q}` : ''}`);
}

export function getEvent(id) {
  return request(`/api/events/${id}`);
}

export function getChannels() {
  return request('/api/channels');
}

export function getPlayerSurvey() {
  return request('/api/sheets/survey');
}

export function getSettings() {
  return request('/api/settings');
}

export function updateSettings(patch) {
  return request('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteSavedRowRoster(id) {
  return request('/api/settings', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}

export function startSnapshotFetch(date) {
  return request('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export function getScrapeState(after = 0) {
  return request(`/api/scrape?after=${encodeURIComponent(after)}`);
}

export function getScrapeOptions() {
  return request('/api/scrape/options');
}

export function startScrape(payload) {
  return request('/api/scrape', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelScrape() {
  return request('/api/scrape', { method: 'DELETE' });
}


export function createEvent(payload) {
  return request('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEvent(id, payload) {
  return request(`/api/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function cancelEvent(id) {
  return request(`/api/events/${id}/cancel`, { method: 'PATCH' });
}

export function deleteEvent(id) {
  return request(`/api/events/${id}`, { method: 'DELETE' });
}
