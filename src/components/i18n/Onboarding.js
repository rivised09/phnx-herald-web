'use client';

import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { LOCALES } from '../../lib/i18n';
import Flag from './Flag';
import { DONE_KEY, OPEN_EVENT, useLocale } from './LocaleProvider';

/**
 * First-visit language prompt, opened again from the header button. Picking a
 * language previews it immediately; Start (or Escape) dismisses and remembers
 * the choice for this browser only. The panel takes focus when it opens so
 * Escape works no matter where the dialog was summoned from.
 */
export default function Onboarding() {
  const { locale, t, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DONE_KEY) !== '1') setOpen(true);
    } catch {
      setOpen(true);
    }
    const onOpen = () => {
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const finish = () => {
    try {
      window.localStorage.setItem(DONE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onb.welcome')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') finish();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-gray-800 bg-neutral-950 p-5 shadow-2xl shadow-black/60 outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-700 bg-gray-100 text-neutral-950">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Phoenix of War <span className="text-amber-400">973</span>
          </p>
        </div>

        <h2 className="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-100">
          {t('onb.title')}
        </h2>
        <p className="mt-1 text-[12px] text-gray-500">{t('onb.hint')}</p>

        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLocale(item.code)}
              aria-pressed={item.code === locale}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                item.code === locale
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-gray-800 bg-gray-500/5 text-gray-400 hover:border-gray-600 hover:text-neutral-100'
              }`}
            >
              <Flag code={item.code} className="h-3.5 w-5" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[12px]">{item.label}</span>
                <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">
                  {item.en}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={finish}
            className="cursor-pointer rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 transition hover:bg-amber-500/20"
          >
            {t('onb.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
