'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Play, Terminal } from 'lucide-react';
import {
  cancelScrape,
  getScrapeOptions,
  getScrapeState,
  importDragonSession,
  startScrape,
} from '../../lib/api';
import { toastError, toastSuccess } from '../../lib/swal';

const PHASES = {
  starting: 'starting',
  login: 'waiting for sign-in',
  scraping: 'scraping',
  enriching: 'enriching',
  complete: 'complete',
  failed: 'failed',
  cancelled: 'cancelled',
};

function clock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour12: false });
}

function duration(start, end) {
  if (!start) return '—';
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}

const field =
  'mt-1 block rounded-md border border-gray-800 bg-discord-bg-darker px-2 py-1.5 font-mono text-sm text-neutral-100 outline-none transition focus:border-gray-500 disabled:opacity-50';
const label = 'font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500';

/**
 * Starts roster jobs on the bot and shows their output.
 *
 * The panel is deliberately a thin shell over the existing commands: the bot
 * spawns `scripts/scrape.js`, `scripts/enrich.js`,
 * `scripts/callofstats-scrape.js` or `scripts/dragon-login.js`, and this only
 * chooses the arguments, polls the job state, and renders the lines.
 */
export default function ScrapePanel() {
  const [kind, setKind] = useState('dragon');
  const [mode, setMode] = useState('latest');
  const [server, setServer] = useState('973');
  const [date, setDate] = useState('');
  const [enrichDate, setEnrichDate] = useState('');
  const [scanIndex, setScanIndex] = useState('0');
  const [concurrency, setConcurrency] = useState('1');
  const [relogin, setRelogin] = useState(true);
  const [enrichAfter, setEnrichAfter] = useState(false);

  const [options, setOptions] = useState(null);
  const [job, setJob] = useState(null);
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);

  const lastSeq = useRef(0);
  const jobId = useRef(null);
  const logRef = useRef(null);
  const fileRef = useRef(null);

  const applyState = useCallback((res) => {
    const incoming = res?.job || null;
    if (incoming && incoming.id !== jobId.current) {
      jobId.current = incoming.id;
      setLines(res.logs || []);
      lastSeq.current = res.logs?.length ? res.logs[res.logs.length - 1].seq : 0;
    } else if (res?.logs?.length) {
      setLines((previous) => [...previous, ...res.logs].slice(-1500));
      lastSeq.current = res.logs[res.logs.length - 1].seq;
    }
    setJob(incoming);
    if (incoming && !incoming.running) {
      getScrapeOptions()
        .then(setOptions)
        .catch(() => {
          /* the status line keeps the last known values */
        });
    }
  }, []);

  const poll = useCallback(
    async (reset = false) => {
      try {
        const res = await getScrapeState(reset ? 0 : lastSeq.current);
        applyState(res);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    },
    [applyState],
  );

  useEffect(() => {
    poll(true);
    getScrapeOptions()
      .then(setOptions)
      .catch(() => {
        /* defaults stay usable without the options call */
      });
  }, [poll]);

  useEffect(() => {
    if (!job?.running) return undefined;
    const timer = window.setInterval(() => poll(false), 1200);
    return () => window.clearInterval(timer);
  }, [job?.running, poll]);

  useEffect(() => {
    if (!job?.running) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [job?.running]);

  useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lines.length]);

  const running = Boolean(job?.running);
  const needsDate = kind === 'dragon' && mode === 'date' && !date;
  const canStart = !running && !busy && !importing && !needsDate && (kind === 'login' || Boolean(server.trim()));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const payload = { kind, relogin };
      if (kind !== 'login') payload.server = server.trim();
      if (kind === 'dragon') {
        payload.mode = mode;
        if (mode === 'date') payload.date = date;
        if (mode === 'scan-index') payload.scanIndex = Number(scanIndex) || 0;
        payload.enrichAfter = enrichAfter;
      }
      if (kind === 'enrich') {
        payload.concurrency = Number(concurrency) || 1;
        if (enrichDate) payload.date = enrichDate;
      }
      if (kind === 'callofstats') payload.concurrency = Number(concurrency) || 1;

      const res = await startScrape(payload);
      jobId.current = null;
      lastSeq.current = 0;
      applyState(res);
      toastSuccess(`${res.job?.label || 'Scrape'} started.`);
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    try {
      const res = await cancelScrape();
      applyState(res);
    } catch (err) {
      toastError(err.message);
    }
  }

  async function importSessionFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setError(null);
    try {
      let state;
      try {
        state = JSON.parse(await file.text());
      } catch {
        throw new Error('That file is not valid JSON.');
      }

      const res = await importDragonSession(state);
      const until = res?.session?.expiresAt
        ? clock(new Date(res.session.expiresAt).getTime())
        : null;
      toastSuccess(`DragonStats session imported${until ? `, valid until ${until}` : ''}.`);
      setOptions(await getScrapeOptions());
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setImporting(false);
    }
  }

  const dragon = options?.dragon;
  const sessionText = !options
    ? 'checking session…'
    : dragon?.valid
      ? `session valid${dragon.expiresAt ? ` until ${clock(new Date(dragon.expiresAt).getTime())}` : ''}`
      : dragon?.hasSession
        ? 'session expired'
        : 'no saved session';
  const sessionTone = !options ? 'text-gray-500' : dragon?.valid ? 'text-emerald-400' : 'text-amber-300';

  return (
    <div className="rounded-lg border border-gray-800 bg-discord-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-neutral-100">Roster scraping</div>
            <p className="mt-0.5 max-w-xl text-[13px] text-gray-500">
              Runs the same commands as the terminal, on the bot host, and streams every line
              here. If the DragonStats session is missing, import one below or run the login on a
              desktop.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? 'Running…' : busy ? 'Starting…' : 'Start scraping'}
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[16rem]">
            <span className={label}>Command</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              disabled={running}
              className={`${field} w-full`}
            >
              <option value="dragon">DragonStats — scrape roster</option>
              <option value="enrich">CallofStats — enrich players</option>
              <option value="callofstats">CallofStats — full scrape</option>
              <option value="login">DragonStats — sign in only</option>
            </select>
          </label>

          {kind !== 'login' ? (
            <label>
              <span className={label}>Server</span>
              <input
                value={server}
                onChange={(event) => setServer(event.target.value)}
                disabled={running}
                inputMode="numeric"
                className={`${field} w-24`}
              />
            </label>
          ) : null}

          {kind === 'enrich' || kind === 'callofstats' ? (
            <label>
              <span className={label}>Parallel accounts</span>
              <select
                value={concurrency}
                onChange={(event) => setConcurrency(event.target.value)}
                disabled={running}
                className={field}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {kind === 'dragon' ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className={label}>Scan</span>
              <div className="mt-1 inline-flex rounded-md border border-gray-800 p-0.5">
                {[
                  ['latest', 'Latest'],
                  ['date', 'Specific date'],
                  ['scan-index', 'Older #'],
                ].map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      if (value === 'date' && !date && options?.latest) setDate(options.latest);
                      if (value === 'scan-index' && scanIndex === '0') setScanIndex('1');
                    }}
                    disabled={running}
                    className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition disabled:opacity-50 ${
                      mode === value
                        ? 'bg-gray-100 text-neutral-950'
                        : 'text-gray-400 hover:text-neutral-100'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'date' ? (
              <label>
                <span className={label}>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  disabled={running}
                  placeholder={options?.latest || 'YYYY-MM-DD'}
                  className={field}
                />
              </label>
            ) : null}

            {mode === 'scan-index' ? (
              <label>
                <span className={label}>Index</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={scanIndex}
                  onChange={(event) => setScanIndex(event.target.value)}
                  disabled={running}
                  className={`${field} w-20`}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {kind === 'enrich' ? (
          <label>
            <span className={label}>Date to enrich (optional)</span>
            <input
              type="date"
              value={enrichDate}
              onChange={(event) => setEnrichDate(event.target.value)}
              disabled={running}
              placeholder={options?.latest || 'YYYY-MM-DD'}
              className={field}
            />
          </label>
        ) : null}

        {kind === 'dragon' ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-gray-400">
              <input
                type="checkbox"
                checked={relogin}
                onChange={(event) => setRelogin(event.target.checked)}
                disabled={running}
                className="h-3.5 w-3.5 accent-gray-200"
              />
              Sign in automatically when the session is rejected
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-gray-400">
              <input
                type="checkbox"
                checked={enrichAfter}
                onChange={(event) => setEnrichAfter(event.target.checked)}
                disabled={running}
                className="h-3.5 w-3.5 accent-gray-200"
              />
              Enrich with CallofStats afterwards
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
          <span className={sessionTone}>
            DragonStats {sessionText}
          </span>
          <span>{options?.callofstats?.accounts ?? 0} CallofStats account(s)</span>
          {options?.latest ? (
            <span>
              {options.dates?.length ?? 0} dates · newest {options.latest}
            </span>
          ) : null}
          {needsDate ? <span className="text-amber-300">pick a date to continue</span> : null}
          {options?.dragon?.gate && !options.dragon.gate.valid ? (
            <span className="text-amber-300">gate token expired</span>
          ) : null}
          {options?.canOpenWindow === false ? (
            <span className="text-amber-300">no display on the bot host — sign-in unavailable</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={running || importing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-300 transition hover:border-gray-500 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing ? 'Importing…' : 'Import DragonStats session'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={importSessionFile}
            className="hidden"
          />
          <span className="text-[11px] text-gray-600">
            Run <code className="text-gray-400">npm run dragon:login</code> on a desktop, then
            import <code className="text-gray-400">data/dragonstats-session.json</code> here.
          </span>
        </div>
      </div>

      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
            {job ? `${job.label} · ${PHASES[job.phase] || job.phase}` : 'No scrape has run yet'}
          </p>
          {job ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              {job.running ? duration(job.startedAt) : duration(job.startedAt, job.finishedAt)}
              {job.exitCode !== null && job.exitCode !== undefined ? ` · exit ${job.exitCode}` : ''}
            </p>
          ) : null}
        </div>

        {job ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full ${
                job.phase === 'failed'
                  ? 'w-full bg-red-400'
                  : job.phase === 'complete'
                    ? 'w-full bg-emerald-400'
                    : job.phase === 'cancelled'
                      ? 'w-full bg-gray-500'
                      : 'w-1/2 animate-pulse bg-amber-400'
              }`}
            />
          </div>
        ) : null}

        {job?.error ? <p className="mt-2 text-xs text-red-400">{job.error}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

        <div
          ref={logRef}
          className="mt-2 h-64 overflow-auto rounded-md border border-gray-800 bg-discord-bg-darker p-3 font-mono text-[11px] leading-relaxed"
        >
          {lines.length === 0 ? (
            <span className="text-gray-600">Output appears here while a job runs.</span>
          ) : (
            lines.map((line) => (
              <div
                key={line.seq}
                className={
                  line.stream === 'stderr'
                    ? 'whitespace-pre-wrap break-words text-red-400'
                    : line.stream === 'meta'
                      ? 'whitespace-pre-wrap break-words text-gray-500'
                      : 'whitespace-pre-wrap break-words text-neutral-300'
                }
              >
                <span className="mr-2 text-gray-600">{clock(line.at)}</span>
                {line.line}
              </div>
            ))
          )}
        </div>

        <p className="mt-2 text-[11px] text-gray-600">
          Sign-in needs a desktop window. Capture a session with{' '}
          <code className="text-gray-400">npm run dragon:login</code> and import it above, or run
          the scrape on a desktop. Jobs write straight to R2, and only one job runs at a time so
          the two sources never race.
        </p>
      </div>
    </div>
  );
}
