const FALLBACK = 'http://localhost:3001';

export function normalizeBaseUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return FALLBACK;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || FALLBACK).replace(/\/$/, '');
}