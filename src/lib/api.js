const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
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