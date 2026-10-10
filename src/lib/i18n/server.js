import { cookies } from 'next/headers';
import { normalizeLocale } from './locales';

export const LANG_COOKIE = 'phoenix.lang';

/**
 * The saved language for the first server render. Anything invalid or absent
 * lands on English; the client picker can change it at any moment.
 */
export async function getLocale() {
  const jar = await cookies();
  return normalizeLocale(jar.get(LANG_COOKIE)?.value);
}
