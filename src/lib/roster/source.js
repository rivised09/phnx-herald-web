/**
 * Which source server this deployment reads, and the URL it was crawled from.
 *
 * This mirrors `CALLOFSTATS_SERVER_ID` / `PLAYER_STATS_SOURCE_URL` on the bot
 * so the `server.url` field the home page shows matches what the scraper used,
 * and so a deployment pointed at a different server reads that server's rows.
 * The scraping itself stays on the bot; nothing here contacts the source site.
 */

const DEFAULT_SERVER_ID = '973';
const DEFAULT_BASE = 'https://callofstats.com';

function baseUrl() {
  return process.env.CALLOFSTATS_BASE_URL || DEFAULT_BASE;
}

export function serverId() {
  const raw = String(process.env.CALLOFSTATS_SERVER_ID || '').trim();
  return /^\d+$/.test(raw) ? raw : DEFAULT_SERVER_ID;
}

export function sourceUrl() {
  const raw = String(process.env.PLAYER_STATS_SOURCE_URL || '').trim();
  if (raw) {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Source URL must use http or https');
    }
    if (parsed.origin !== new URL(baseUrl()).origin) {
      throw new Error(`Source URL must be on ${new URL(baseUrl()).origin}`);
    }
    return parsed.toString();
  }
  return `${baseUrl()}/server/${serverId()}`;
}
