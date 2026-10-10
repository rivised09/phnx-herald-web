'use client';

import Flag from './Flag';
import { OPEN_EVENT, useLocale } from './LocaleProvider';
import { LOCALES } from '../../lib/i18n';

/**
 * Header control on the public homepage: the current language's flag and
 * native name. It reopens the onboarding dialog rather than keeping its own
 * menu, so there is one language UI in the whole app.
 */
export default function LanguageButton() {
  const { locale, t } = useLocale();
  const current = LOCALES.find((item) => item.code === locale) || LOCALES[0];

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      title={t('lang.change')}
      aria-label={t('lang.change')}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-800 bg-gray-500/5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400 transition hover:-translate-y-px hover:border-gray-600 hover:bg-gray-500/10 hover:text-neutral-100 sm:gap-2 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]"
    >
      <Flag code={current.code} className="h-3.5 w-5" />
      {/* The name collapses on phones so the header keeps icon-sized controls. */}
      <span className="hidden sm:inline">{current.label}</span>
    </button>
  );
}
