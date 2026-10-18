'use client';

import Image from 'next/image';
import { useT } from './i18n/LocaleProvider';

/**
 * The centered "this is working" state, laid over the page.
 *
 * The same card appears wherever a wait begins: the home page while the picked
 * snapshot is read (the rows stay up behind it, dimmed), and the roster
 * profiles while a date switch is in flight - from the picker's transition
 * through the route's own loading screen, so one switch never loses its
 * indicator halfway through. The site's logo sits at the card's center with
 * the label under it, and three dots light up one after the other beneath -
 * motion that reads as "waiting" rather than a wheel going round. `labelKey`
 * names what is being waited on; the label doubles as the live region's
 * announcement.
 */
export default function LoadingOverlay({ labelKey }) {
  const t = useT();
  const label = t(labelKey);
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="flex w-full max-w-[15rem] flex-col items-center gap-3.5 rounded-xl border border-gray-700/70 bg-discord-surface px-7 py-8 text-center shadow-2xl shadow-black/60">
        <Image
          src="/logo.png"
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-200">
          {label}
        </span>
        <span className="loading-dots flex gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-100" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-100" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-100" />
        </span>
      </div>
    </div>
  );
}
