'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Save, Table2 } from 'lucide-react';
import { getSettings, startSnapshotFetch, updateSettings } from '../../lib/api';
import { toastSuccess, toastError } from '../../lib/swal';

function formatSeconds(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(null);
  const [intervalSec, setIntervalSec] = useState(30);
  const [dirty, setDirty] = useState(false);
  const [fetchState, setFetchState] = useState(null);
  const [fetchDate, setFetchDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchStarting, setFetchStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSettings();
      if (res.autoRefresh) {
        setAutoRefresh(res.autoRefresh);
        setIntervalSec(Math.round(res.autoRefresh.intervalMs / 1000));
      }
      setFetchState(res.fetch || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!fetchState?.running) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const res = await getSettings();
        setFetchState(res.fetch || null);
      } catch {
        // The active fetch remains visible until the next successful poll.
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [fetchState?.running]);

  async function fetchSnapshot() {
    setFetchStarting(true);
    try {
      const res = await startSnapshotFetch(fetchDate);
      setFetchState(res.state);
      toastSuccess(`Snapshot fetch started for ${fetchDate}.`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setFetchStarting(false);
    }
  }

  async function toggle() {
    if (!autoRefresh) return;
    const next = { ...autoRefresh, enabled: !autoRefresh.enabled };
    setAutoRefresh(next);
    setSaving(true);
    try {
      const res = await updateSettings({ enabled: next.enabled });
      setAutoRefresh(res.autoRefresh);
      toastSuccess(
        res.autoRefresh.enabled
          ? 'Spreadsheet auto-refresh enabled.'
          : 'Spreadsheet auto-refresh paused.',
      );
    } catch (err) {
      setAutoRefresh(autoRefresh);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveInterval() {
    setSaving(true);
    try {
      const res = await updateSettings({ intervalMs: intervalSec * 1000 });
      setAutoRefresh(res.autoRefresh);
      setIntervalSec(Math.round(res.autoRefresh.intervalMs / 1000));
      setDirty(false);
      toastSuccess('Refresh interval saved.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
            06 / Settings
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
            Bot Settings
          </h1>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-800 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {loading && (
        <div className="space-y-3" role="status" aria-label="Loading settings">
          <div className="h-24 animate-pulse rounded-lg border border-gray-800 bg-discord-surface" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>Failed to load settings: {error}</span>
            <button
              type="button"
              onClick={load}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && autoRefresh && (
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-800 bg-discord-surface">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-100">Fetch a specific snapshot</div>
                  <p className="mt-0.5 max-w-xl text-[13px] text-gray-500">Fetch the roster and detail pages for one source date. This runs independently from the scheduled latest/history jobs.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={fetchDate} onChange={(event) => setFetchDate(event.target.value)} disabled={fetchState?.running} className="rounded-md border border-gray-800 bg-discord-bg-darker px-2 py-1.5 font-mono text-sm text-neutral-100 outline-none focus:border-gray-500 disabled:opacity-50" />
                <button type="button" onClick={fetchSnapshot} disabled={fetchStarting || fetchState?.running || !fetchDate} className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">{fetchState?.running ? 'Fetching…' : 'Fetch snapshot'}</button>
              </div>
            </div>
            {fetchState ? (
              <div className="border-t border-gray-800 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">Fetch status · {fetchState.date || '—'}</p>
                  <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${fetchState.phase === 'failed' ? 'text-red-400' : fetchState.phase === 'complete' ? 'text-emerald-400' : 'text-amber-300'}`}>{fetchState.phase}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800"><div className={`h-full rounded-full ${fetchState.phase === 'failed' ? 'bg-red-400' : fetchState.phase === 'complete' ? 'w-full bg-emerald-400' : 'w-1/2 animate-pulse bg-amber-400'}`} /></div>
                {fetchState.progress?.stats ? <p className="mt-2 text-xs text-gray-500">Detail progress: {fetchState.progress.stats.pages || 0} pages · {fetchState.progress.stats.lords || 0} players · {fetchState.progress.stats.alliances || 0} alliances.</p> : null}
                {fetchState.result?.details?.stats ? <p className="mt-2 text-xs text-gray-500">Snapshot saved, then {fetchState.result.details.stats.pages || 0} detail pages processed ({fetchState.result.details.stats.lords || 0} players and {fetchState.result.details.stats.alliances || 0} alliances).</p> : null}
                {fetchState.phase === 'failed' && fetchState.result?.snapshot ? <p className="mt-2 text-xs text-amber-300">The roster rows were saved, but the player detail phase did not complete. Retry this date after checking the bot detail settings and source access.</p> : null}
                {fetchState.error ? <p className="mt-2 text-xs text-red-400">{fetchState.error}</p> : null}
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-gray-800 bg-discord-surface">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <Table2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-100">
                    Spreadsheet auto-refresh
                  </div>
                  <p className="mt-0.5 max-w-xl text-[13px] text-gray-500">
                    Polls the tasks sheet and updates the Discord task board. When off,
                    the bot only checks this setting and makes no sheet requests.
                    The 🔄 button in Discord still refreshes instantly.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoRefresh.enabled}
                disabled={saving}
                onClick={toggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition disabled:opacity-50 ${
                  autoRefresh.enabled
                    ? 'border-gray-100 bg-gray-100'
                    : 'border-gray-800 bg-neutral-900'
                }`}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full transition-all ${
                    autoRefresh.enabled
                      ? 'left-[26px] bg-neutral-950'
                      : 'left-[3px] bg-gray-500'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  Refresh interval
                </div>
                <div className="mt-0.5 text-[13px] text-neutral-100">
                  Currently polling every{' '}
                  <span className="font-medium">
                    {formatSeconds(autoRefresh.intervalMs)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={600}
                  value={intervalSec}
                  onChange={(e) => {
                    setIntervalSec(Number(e.target.value));
                    setDirty(true);
                  }}
                  className="w-20 rounded-md border border-gray-800 bg-discord-bg-darker px-2 py-1 text-right font-mono text-sm text-neutral-100 outline-none transition focus:border-gray-500"
                />
                <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  sec
                </span>
                <button
                  type="button"
                  onClick={saveInterval}
                  disabled={saving || !dirty}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-wider text-gray-600">
            Longer intervals cut Railway usage. 5 min is usually plenty — the
            Discord 🔄 button refreshes on demand.
          </p>
        </div>
      )}
    </div>
  );
}