/**
 * Read-time repair for days written by different scrapers.
 *
 * The published files are additive and never rewritten, so two older naming
 * quirks survive in them:
 *
 *   - callofstats enrichment wrote "ToC Stats", "RoW Stats" and "Callof Stats"
 *     instead of the section names the full scrape used;
 *   - DragonStats days do not contain the fields only callofstats captured
 *     (ToC/RoW, achievements, king/division profile rows, tiered kills).
 *
 * Normalising the sections here keeps the page uniform without touching R2.
 * Missing rows are copied from the newest earlier day that has them, the same
 * way the bot carries them forward for new scrapes.
 */

const FACTION_NAMES = {
  1: 'League of Order',
  2: 'Wilderburg',
  3: 'Springwardens',
};

const RULES = [
  [
    /^(id|alliance|server|current power|highest power|town hall|currently king|days as king|division|faction|leadership time|migration score)$/i,
    '',
  ],
  [/^toc\b|^tournament/i, 'Tournament of Champion Stats'],
  [/league/i, 'Root of War League Stats'],
  [/row\b|roots? of war/i, 'Roots of War Stats'],
  [/^historical\b|^season/i, 'Historical Season Stats'],
  [/^t[1-5] kills?$/i, 'Historic Tiered Kills'],
  [/resource assistance/i, 'Extra Resource Stats'],
  [/^total resources gathered$/i, 'Extra Resource Stats'],
  [/^times alliance helps given$/i, 'Extra Resource Stats'],
  [/^gather|gathered$/i, 'Gathered Resources'],
  [/^spent\b| spent$/i, 'Historic Resources Spent'],
  [/^(city sieges|defeats|times scouted|victories|victory to defeat ratio)$/i, 'Extra War Stats'],
  [/^(kill to heal|merit to power) ratio$/i, 'War Stats'],
  [/^alliance donations?$|^alliance helps$|^behemoth\b|^build time$|^destruction time$/i, 'Alliance Activity'],
  [/^t[45](?:\/t[45])? units/i, 'Advanced War Stats'],
  [/^(cavalry|infantry|mage|marksman|other) merits$/i, 'Advanced War Stats'],
  [/^merits$/i, 'War Stats'],
  [/kill|defeat|victor|siege|scout|unit|dead|heal/i, 'War Stats'],
  [/power|troop|building|hero|tech|policy/i, 'Power Spread'],
  [/merit/i, 'Advanced War Stats'],
];

const ALIASES = new Set(['ToC Stats', 'RoW Stats', 'Callof Stats']);

/**
 * Raw source fields that are replaced by a readable canonical row. They stay
 * in R2, but the page should not show a bare numeric code beside the name.
 */
const HIDDEN_ROWS = new Set(['Faction ID']);

/**
 * Labels whose value is a cumulative counter. A zero after a non-zero reading
 * means the newer source did not populate the field, not that the player lost
 * the progress.
 */
const NON_ZERO_LABELS = new Set([
  'T1 Kills',
  'T2 Kills',
  'T3 Kills',
  'T4 Kills',
  'T5 Kills',
  'T4/T5 Units Dead',
  'T4/T5 Units Rss Healed',
  'Historical Highest Merits',
  'Historical Most Resource Healing',
]);

function sectionFor(label) {
  const text = String(label || '').trim();
  for (const [pattern, section] of RULES) {
    if (pattern.test(text)) return section;
  }
  return 'Callof Stats';
}

function canonicalSection(section, label) {
  if (section === 'Dragon Stats') return 'Dragon Stats';
  if (section === 'ToC Stats') return 'Tournament of Champion Stats';
  if (section === 'RoW Stats') {
    return /league/i.test(label) ? 'Root of War League Stats' : 'Roots of War Stats';
  }
  if (section === 'Callof Stats') return sectionFor(label);
  return sectionFor(label);
}

/** Merge the old enrichment section names into the published names. */
export function normalizeSections(sections) {
  const order = [];
  const grouped = new Map();

  const add = (section, row, overwrite) => {
    if (!grouped.has(section)) {
      grouped.set(section, new Map());
      order.push(section);
    }
    const rows = grouped.get(section);
    if (!overwrite && rows.has(row.label)) return;
    rows.set(row.label, row);
  };

  for (const block of sections || []) {
    const dragon = block.section === 'Dragon Stats';
    for (const row of block.rows || []) {
      const target = canonicalSection(block.section, row.label);
      const misplaced = !dragon && target !== block.section;
      add(target, row, ALIASES.has(block.section) || misplaced);
    }
  }

  return order
    .map((section) => ({ section, rows: [...grouped.get(section).values()] }))
    .filter((block) => block.rows.length);
}

function number(value) {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/ Sec$/, '')
    .trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  const parsed = number(value);
  return parsed === null ? String(value) : parsed.toLocaleString('en-US');
}

function percent(value, digits = 2) {
  return `${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function factionName(raw) {
  const code = String(raw ?? '').trim();
  if (!code) return null;
  return FACTION_NAMES[code] || code;
}

/**
 * Correct the old DragonStats mappings in place. This is what makes an
 * already-published Oct 26/28 page show League of Order instead of Faction ID,
 * the KvK merits instead of the lifetime total, and the same percentage units
 * the callofstats days used.
 */
function repairEntry(file, wanted, entry) {
  const sections = entry.sections;
  const index = new Map();
  for (const block of sections) {
    for (const row of block.rows) index.set(row.label, row);
  }

  const get = (label) => index.get(label)?.value;
  const set = (section, label, value) => {
    if (value === null || value === undefined || value === '') return;
    const row = index.get(label);
    if (row) {
      row.value = value;
      return;
    }
    let block = sections.find((item) => item.section === section);
    if (!block) {
      block = { section, rows: [] };
      sections.push(block);
    }
    const added = { label, value };
    block.rows.push(added);
    index.set(label, added);
  };

  const faction = get('Faction ID');
  if (faction !== undefined) set('', 'Faction', factionName(faction));

  const kvk = get('KvK Merits');
  if (kvk !== undefined) {
    const total = get('Total Merits') ?? file.metrics?.[wanted]?.Merits;
    if (total !== undefined && String(total) !== String(kvk)) {
      set('Dragon Stats', 'Total Merits', formatNumber(total));
    }
    set('War Stats', 'Merits', kvk);
  }

  const highest = get('Highest PvP Points');
  if (highest !== undefined && get('Historical Highest Merits') === undefined) {
    set('Historical Season Stats', 'Historical Highest Merits', highest);
  }

  const played = number(get('Seasons Played'));
  const wins = number(get('Season Victories'));
  if (played !== null && wins !== null) {
    set('Historical Season Stats', 'Season Defeats', formatNumber(Math.max(0, played - wins)));
    set('Historical Season Stats', 'Season Winrate', percent((wins / played) * 100));
  }

  const victories = number(get('Victories'));
  const defeats = number(get('Defeats'));
  if (victories !== null && defeats !== null && defeats > 0) {
    set('Extra War Stats', 'Victory to Defeat Ratio', percent((victories / defeats) * 100, 1));
  }

  const kills = number(get('Units Killed'));
  const healed = number(get('Units Healed'));
  if (kills !== null && healed) {
    set('War Stats', 'Kill to Heal Ratio', percent((kills / healed) * 100));
  }

  const merits = number(get('KvK Merits') ?? get('Merits'));
  const power = number(get('Current Power'));
  if (merits !== null && power) {
    set('War Stats', 'Merit to Power Ratio', percent((merits / power) * 100));
  }
}

/**
 * The requested day with the newest earlier callofstats-only rows filled in.
 * Values the day already has always win, except for cumulative counters that
 * a newer source left at zero.
 */
export function carryForwardEntry(file, wanted) {
  const source = file?.byDate?.[wanted];
  if (!source) return null;

  const entry = {
    ...source,
    sections: normalizeSections(source.sections),
    achievements: source.achievements ? source.achievements.map((item) => ({ ...item })) : [],
  };

  const rowsByLabel = new Map();
  for (const block of entry.sections) {
    for (const row of block.rows) rowsByLabel.set(row.label, row);
  }

  const sections = entry.sections.map((block) => ({
    ...block,
    rows: [...block.rows],
  }));
  const bySection = new Map(sections.map((block) => [block.section, block]));

  const earlier = (file.dates || [])
    .filter((day) => day < wanted && file.byDate?.[day])
    .sort()
    .reverse();

  for (const day of earlier) {
    const older = file.byDate[day];
    for (const block of normalizeSections(older.sections)) {
      for (const row of block.rows) {
        const current = rowsByLabel.get(row.label);
        if (current) {
          if (
            NON_ZERO_LABELS.has(row.label) &&
            number(current.value) === 0 &&
            number(row.value) !== 0
          ) {
            current.value = row.value;
          }
          continue;
        }
        let target = bySection.get(block.section);
        if (!target) {
          target = { section: block.section, rows: [] };
          bySection.set(block.section, target);
          sections.push(target);
        }
        const added = { ...row };
        target.rows.push(added);
        rowsByLabel.set(row.label, added);
      }
    }
    if (!entry.achievements.length && older.achievements?.length) {
      entry.achievements = older.achievements.map((item) => ({ ...item }));
    }
    if (!entry.avatar && older.avatar) entry.avatar = older.avatar;
  }

  entry.sections = sections;
  repairEntry(file, wanted, entry);
  entry.sections = entry.sections
    .map((block) => ({
      ...block,
      rows: [...block.rows].sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .map((block) => ({
      ...block,
      rows: block.rows.filter((row) => !HIDDEN_ROWS.has(row.label)),
    }))
    .filter((block) => block.rows.length);
  return entry;
}
