function pad(n) {
  return String(n).padStart(2, '0');
}

export function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function toTimeInputValue(date) {
  const d = new Date(date);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function datetimePartsToUtcIso(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const d = new Date(`${dateValue}T${timeValue}:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatUtc(date) {
  const d = new Date(date);
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function formatLocal(date) {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatLocalLong(date) {
  const d = new Date(date);
  const parts = d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${parts} at ${time}`;
}

export function formatDuration(start, end) {
  if (!end) return null;
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (parts.length === 0) return 'Less than a minute';
  return parts.join(' ');
}

export const BRANDING_FOOTER = 'Phoenix of War - Server 973';

export function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const STATUS_COLORS = {
  SCHEDULED: 'border-gray-700 text-gray-300',
  ACTIVE: 'border-emerald-500/40 text-emerald-400',
  CANCELLED: 'border-red-500/40 text-red-400',
  COMPLETED: 'border-gray-800 text-gray-500',
};

export const STATUS_DOTS = {
  SCHEDULED: 'bg-gray-300',
  ACTIVE: 'bg-emerald-400',
  CANCELLED: 'bg-red-400',
  COMPLETED: 'bg-gray-600',
};