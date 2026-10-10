'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isPublicPath, isRtl, messagesFor, normalizeLocale, translate } from '../../lib/i18n';

export const LANG_COOKIE = 'phoenix.lang';
export const DONE_KEY = 'phoenix.onboarded';
export const OPEN_EVENT = 'phoenix:open-lang';

const LocaleContext = createContext(null);

/**
 * Holds the chosen language for the whole tree and supplies `t`. The choice
 * lives in a cookie (so the first server render can honour it) mirrored into
 * localStorage (so the onboarding prompt knows a choice was already made).
 *
 * <html lang/dir> is only applied while a translated page is shown (the
 * homepage and the public roster detail pages); every other route is a
 * leadership view that stays English LTR.
 */
export default function LocaleProvider({ initialLocale = 'en', children }) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));
  const [dict, setDict] = useState(() => messagesFor(initialLocale));

  const setLocale = useCallback((code) => {
    const next = normalizeLocale(code);
    setLocaleState(next);
    setDict(messagesFor(next));
    try {
      window.localStorage.setItem(LANG_COOKIE, next);
      document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // Storage can be unavailable (private mode); the UI still switches.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isPublicPath(pathname)) {
      root.lang = locale;
      root.dir = isRtl(locale) ? 'rtl' : 'ltr';
    } else {
      root.lang = 'en';
      root.dir = 'ltr';
    }
  }, [locale, pathname]);

  const t = useCallback(
    (key, vars, fallback) => translate(dict, key, vars, fallback),
    [dict],
  );

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

export function useT() {
  return useLocale().t;
}
