/**
 * Merits-to-power ratio, shared by the public roster and the leadership list.
 *
 * The number itself (`mpRatio`, a percentage with two decimals) is computed on
 * the server next to the player row, so both lists and both filters below read
 * one value instead of each dividing slightly differently. These helpers only
 * decide which band a row belongs to and how it prints.
 */

export const MP_BANDS = [
  { key: 'all', label: 'All M/P' },
  { key: 'gte10', label: '10% +' },
  { key: '5to10', label: '5–10%' },
  { key: '2to5', label: '2–5%' },
  { key: 'below2', label: '< 2%' },
];

/**
 * True when a ratio falls in the chosen band. A lord with no merits metric has
 * no ratio and belongs to no band, so any band other than "all" excludes them.
 */
export function matchesMpBand(ratio, band) {
  if (!band || band === 'all') return true;
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return false;
  const value = Number(ratio);
  if (band === 'gte10') return value >= 10;
  if (band === '5to10') return value >= 5 && value < 10;
  if (band === '2to5') return value >= 2 && value < 5;
  return value < 2;
}

/** One decimal on screen; the stored value keeps two for sorting and export. */
export function formatMpRatio(ratio) {
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return '—';
  return `${Number(ratio).toFixed(1)}%`;
}
