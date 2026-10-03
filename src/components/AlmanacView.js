'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Loader2, Lock, Megaphone, RefreshCw, Users, Volume2 } from 'lucide-react';

const PAGE_SIZE = 50;
const POLL_MS = 20000;

/** Survives channel switches for the life of the tab. */
const messageCache = new Map();

const CHANNEL_ICON = {
  GUILD_ANNOUNCEMENT: Megaphone,
  GUILD_VOICE: Volume2,
  GUILD_STAGE_VOICE: Volume2,
};

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AlmanacView() {
  const [channels, setChannels] = useState([]);
  const [guildName, setGuildName] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState({});
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setError(null);
    try {
      const res = await fetch('/api/almanac/channels', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load channels');
      setChannels(body.channels || []);
      setGuildName(body.guildName || '');
      setActiveId((prev) => prev || body.channels?.[0]?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId, { after, before } = {}) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (after) params.set('after', after);
    if (before) params.set('before', before);

    const res = await fetch(
      `/api/almanac/channels/${encodeURIComponent(channelId)}/messages?${params}`,
      { cache: 'no-store' },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Failed to load messages');
    return body.messages || [];
  }, []);

  /** Cold open: only hits the network when the channel is not already cached. */
  const openChannel = useCallback(
    async (channelId) => {
      if (!channelId) return;

      const cached = messageCache.get(channelId);
      if (cached) {
        setMessages(cached.messages);
        setLoadingMessages(false);
      } else {
        setMessages([]);
        setLoadingMessages(true);
      }

      try {
        // Revalidate from the newest message we already hold.
        const pivot = cached?.messages?.length ? cached.messages[cached.messages.length - 1].id : null;
        const delta = pivot ? await fetchMessages(channelId, { after: pivot }) : [];

        if (delta.length) {
          const base = cached?.messages || [];
          const known = new Set(base.map((m) => m.id));
          const merged = [...base, ...delta.filter((m) => !known.has(m.id))];
          messageCache.set(channelId, { messages: merged });
          setMessages(merged);
        } else if (!cached) {
          const fresh = await fetchMessages(channelId);
          messageCache.set(channelId, { messages: fresh });
          setMessages(fresh);
        }
      } catch (err) {
        if (!cached) setError(err.message);
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchMessages],
  );

  const loadOlder = useCallback(async () => {
    if (!activeId) return;
    const cached = messageCache.get(activeId);
    if (!cached?.messages?.length || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const older = await fetchMessages(activeId, { before: cached.messages[0].id });
      if (older.length) {
        const known = new Set(cached.messages.map((m) => m.id));
        const merged = [...older.filter((m) => !known.has(m.id)), ...cached.messages];
        messageCache.set(activeId, { messages: merged });
        setMessages(merged);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [activeId, fetchMessages, loadingOlder]);

  /**
   * One heads call tells us every channel's newest message. Channels whose head
   * moved are then asked only for the messages we have not seen, so quiet
   * channels cost a single tiny request and busy ones cost one small delta.
   */
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/almanac/channels/heads', { cache: 'no-store' });
      if (!res.ok) return;
      const { heads = {} } = await res.json().catch(() => ({}));

      const current = activeIdRef.current;
      const additions = {};

      await Promise.all(
        Object.entries(heads).map(async ([channelId, head]) => {
          if (!head) return;
          const cached = messageCache.get(channelId);
          const newestId = cached?.messages?.length
            ? cached.messages[cached.messages.length - 1].id
            : null;

          // Never seen this channel at all: nothing to count against.
          if (!newestId) return;
          if (head.id === newestId) return;

          const delta = await fetchMessages(channelId, { after: newestId }).catch(() => []);
          if (!delta.length) return;

          if (channelId === current) {
            const known = new Set(cached.messages.map((m) => m.id));
            const merged = [...cached.messages, ...delta.filter((m) => !known.has(m.id))];
            messageCache.set(channelId, { messages: merged });
            setMessages(merged);
          } else {
            // Defer merging so the reader sees the badge before the jump.
            const known = new Set(cached.messages.map((m) => m.id));
            messageCache.set(channelId, {
              messages: [...cached.messages, ...delta.filter((m) => !known.has(m.id))],
            });
            additions[channelId] = (additions[channelId] || 0) + delta.length;
          }
        }),
      );

      if (Object.keys(additions).length) {
        setUnread((prev) => {
          const next = { ...prev };
          Object.entries(additions).forEach(([id, n]) => {
            next[id] = (next[id] || 0) + n;
          });
          return next;
        });
      }
    } catch {
      /* transient poll failure; next tick retries */
    }
  }, [fetchMessages]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    setMessages([]);
    openChannel(activeId);
  }, [activeId, openChannel]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (!loadingMessages) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loadingMessages]);

  const selectChannel = useCallback((channelId) => {
    setActiveId(channelId);
    setUnread((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : channels;
    const map = new Map();
    filtered.forEach((c) => {
      const key = c.parentName || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return [...map.entries()];
  }, [channels, query]);

  const activeChannel = channels.find((c) => c.id === activeId) || null;
  const oldestId = messages.length ? messages[0].id : null;

  let lastDay = null;

  return (
    <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
      <div className="flex h-[70vh] min-h-[26rem] flex-col overflow-hidden rounded-lg border border-gray-800 bg-discord-surface">
        <div className="shrink-0 border-b border-gray-800 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              {guildName || 'Channels'}
            </span>
            <button
              type="button"
              onClick={loadChannels}
              aria-label="Refresh channels"
              className="cursor-pointer rounded p-1 text-gray-500 transition hover:bg-gray-500/10 hover:text-neutral-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingChannels ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative mt-2">
            <Hash className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter channels"
              className="w-full rounded-md border border-gray-800 bg-discord-bg-darker py-1.5 pl-7 pr-2 text-[12px] text-neutral-100 outline-none transition placeholder:text-gray-600 focus:border-gray-500"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {loadingChannels && channels.length === 0 && (
            <div className="px-2 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-gray-600">
              Loading
            </div>
          )}
          {!loadingChannels && grouped.length === 0 && (
            <div className="px-2 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-gray-600">
              No channels
            </div>
          )}

          {grouped.map(([group, list]) => (
            <div key={group} className="mb-2">
              <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">
                {group}
              </div>
              {list.map((channel) => {
                const Icon = CHANNEL_ICON[channel.type] || Hash;
                const active = channel.id === activeId;
                const count = unread[channel.id] || 0;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => selectChannel(channel.id)}
                    aria-pressed={active}
                    className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] transition ${
                      active
                        ? 'bg-gray-500/10 text-neutral-100'
                        : 'text-gray-400 hover:bg-gray-500/5 hover:text-neutral-100'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0 text-gray-600" />
                    <span className="truncate">{channel.name}</span>
                    {channel.nsfw && (
                      <span className="font-mono text-[8px] text-gray-600">NSFW</span>
                    )}
                    {count > 0 && (
                      <span className="ml-auto flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-gray-100 px-1 font-mono text-[9px] font-semibold leading-none text-neutral-950">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-[70vh] min-h-[26rem] flex-col overflow-hidden rounded-lg border border-gray-800 bg-discord-surface">
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-800 px-4 py-3">
          <Hash className="h-4 w-4 text-gray-600" />
          <span className="text-[13px] font-medium text-neutral-100">
            {activeChannel?.name || 'Select a channel'}
          </span>
          {activeChannel?.topic && (
            <span className="ml-2 hidden truncate border-l border-gray-800 pl-2 text-[12px] text-gray-500 sm:block">
              {activeChannel.topic}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error && (
            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
              {error}
            </div>
          )}

          {loadingMessages && (
            <div className="flex items-center justify-center gap-2 py-10 font-mono text-[10px] uppercase tracking-wider text-gray-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading messages
            </div>
          )}

          {!loadingMessages && messages.length === 0 && activeId && !error && (
            <div className="halftone flex flex-col items-center justify-center py-16 text-center">
              <Lock className="mb-2 h-8 w-8 text-gray-600" />
              <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                No messages to show
              </p>
              <p className="mt-1 text-[12px] text-gray-600">
                The bot may not have access to this channel.
              </p>
            </div>
          )}

          {messages.length > 0 && (
            <>
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="cursor-pointer rounded-md border border-gray-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100 disabled:opacity-40"
                >
                  {loadingOlder ? 'Loading...' : 'Load older messages'}
                </button>
              </div>

              {messages.map((m) => {
                const day = formatDay(m.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;

                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="my-3 flex items-center gap-3">
                        <span className="h-px flex-1 bg-gray-800" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">
                          {day}
                        </span>
                        <span className="h-px flex-1 bg-gray-800" />
                      </div>
                    )}

                    <div className="flex gap-3 rounded-md px-1 py-1.5 transition hover:bg-gray-500/5">
                      {m.author.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.author.avatar}
                          alt=""
                          aria-hidden="true"
                          className="h-8 w-8 shrink-0 rounded-full"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-500/10 font-mono text-[10px] text-gray-400">
                          {initials(m.author.displayName)}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-neutral-100">
                            {m.author.displayName}
                          </span>
                          {m.author.bot && (
                            <span className="rounded bg-gray-500/20 px-1 font-mono text-[8px] uppercase text-gray-400">
                              bot
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-gray-600">
                            {formatTime(m.createdAt)}
                          </span>
                          {m.pinned && (
                            <span className="font-mono text-[9px] text-gray-600">pinned</span>
                          )}
                        </div>

                        {m.content && (
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-300">
                            {m.content}
                          </p>
                        )}

                        {m.attachments.map((a) => (
                          <a
                            key={a.url}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-block rounded border border-gray-800 px-2 py-1 text-[12px] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100"
                          >
                            {a.name}
                          </a>
                        ))}

                        {m.embeds.map((e, i) => (
                          <a
                            key={`${m.id}-embed-${i}`}
                            href={e.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 block rounded border-l-2 border-gray-600 bg-gray-500/5 px-2 py-1.5 text-[12px] text-gray-400 transition hover:text-neutral-100"
                          >
                            {e.title && <span className="block text-neutral-100">{e.title}</span>}
                            {e.description}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-gray-800 px-4 py-2.5">
          <Users className="h-3.5 w-3.5 text-gray-600" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">
            Read-only archive
          </span>
        </div>
      </div>
    </div>
  );
}