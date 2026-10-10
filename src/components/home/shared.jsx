'use client';

import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useT } from '../i18n/LocaleProvider';

const TONES = {
  neutral: 'border-gray-800 bg-discord-surface text-gray-400',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  error: 'border-red-500/40 bg-red-500/10 text-red-400',
};

export function Notice({ tone = 'neutral', icon: Icon, title, children }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${TONES[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-neutral-100">{title}</div>
        {children && <div className="mt-0.5 text-[13px] opacity-80">{children}</div>}
      </div>
    </div>
  );
}

export function Loading({ label }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2 py-20 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-600">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label ?? t('home.loading')}
    </div>
  );
}

/**
 * `label` overrides the default "N players" summary so a page with more than
 * one category can report both counts at once.
 */
export function RosterFooter({ count, onRetry, source, label }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
        {label || `${count} ${t(count === 1 ? 'home.playerOne' : 'home.playerMany')}`}
        {source ? ` · ${source}` : ''}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100"
        >
          <RefreshCw className="h-3 w-3" />
          {t('home.refresh')}
        </button>
      )}
    </div>
  );
}

export function ErrorNotice({ error }) {
  const t = useT();
  return (
    <Notice icon={AlertTriangle} title={t('home.loadFailed')}>
      {error}
    </Notice>
  );
}
