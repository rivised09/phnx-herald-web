import { getApiBaseUrl } from './apiBase';

async function request(path, options = {}) {
  let url = path;
  if (typeof window === 'undefined') {
    url = `${getApiBaseUrl()}${path}`;
  }

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });

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

export function startSnapshotFetch(date) {
  return request('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
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
