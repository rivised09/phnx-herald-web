import crypto from 'crypto';

export const ALMANAC_COOKIE = 'phnx_almanac';
export const ALMANAC_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * The cookie value is an HMAC of a fixed label, so a valid cookie cannot be
 * forged without ALMANAC_SECRET and the raw password is never stored.
 */
export function almanacToken() {
  return crypto
    .createHmac('sha256', process.env.ALMANAC_SECRET || '')
    .update('phnx-almanac-access')
    .digest('hex');
}

export function passwordMatches(candidate) {
  const expected = process.env.ALMANAC_PASS || '';
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

export function isUnlocked(cookieValue) {
  if (!cookieValue) return false;
  if (!process.env.ALMANAC_SECRET) return false;
  return safeEqual(cookieValue, almanacToken());
}