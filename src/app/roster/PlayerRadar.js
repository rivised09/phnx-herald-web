const CENTER_X = 320;
const CENTER_Y = 230;
const RADIUS = 145;
// Where the axis labels sit. Just outside the outer ring, close enough that the
// hexagon still reads as one object instead of a small shape with captions.
const LABEL_RADIUS = 168;
// Tighter than the drawing's own bounds: the labels decide both edges, so the
// spare margin only ever added height to the section.
const VIEWBOX = '74 68 492 330';
const RINGS = [1, 0.8, 0.6, 0.4, 0.2];
// The game fixes these: Merits, Behemoths, Gathering, Peacekeeping, Healing,
// Engineering at 60 degree steps on a flat-top hexagon.
const ANGLES = [-120, -60, 0, 60, 120, 180];

const DEFAULT_AXES = [
  { key: 'merits', label: 'Merits' },
  { key: 'behemoths', label: 'Behemoths' },
  { key: 'gathering', label: 'Gathering' },
  { key: 'peacekeeping', label: 'Peacekeeping' },
  { key: 'healing', label: 'Healing' },
  { key: 'engineering', label: 'Engineering' },
];

function polar(angle, radius) {
  const radians = (angle * Math.PI) / 180;
  return [CENTER_X + Math.cos(radians) * radius, CENTER_Y + Math.sin(radians) * radius];
}

function ringPath(scale) {
  return `${ANGLES.map((angle, index) => {
    const [x, y] = polar(angle, RADIUS * scale);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ')} Z`;
}

function pointFactor(value) {
  // The source clamps so a 100th percentile never reaches the exact centre.
  return Number.isFinite(value) ? Math.max(0.055, 1 - value / 100) : 0.055;
}

function polygonPath(values) {
  return `${values
    .map((value, index) => {
      const [x, y] = polar(ANGLES[index], RADIUS * pointFactor(value));
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}

function anchorFor(angle) {
  return angle > -90 && angle < 90 ? 'start' : 'end';
}

function percentile(value) {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function points(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded} pts`;
}

function readingLabel(reading) {
  if (!reading) return null;
  if (reading.season) return `Season ${reading.season}`;
  return reading.date;
}

/**
 * The source's own playstyle hexagon, redrawn. Percentiles run backwards here:
 * a lower number is a better KvK standing, so the source pulls a smaller
 * percentage further from the centre and prints "Lower percentages indicate a
 * higher KvK ranking" under the chart. A bigger polygon is the better account.
 *
 * The frame is always drawn - an uncaptured player gets the empty chart rather
 * than a sentence explaining why there is no chart.
 */
export default function PlayerRadar({ radar }) {
  const axes = radar?.axes?.length === ANGLES.length ? radar.axes : DEFAULT_AXES;
  const current = radar?.available ? radar.current : null;
  const previous = radar?.available ? radar.previous : null;
  const deltas = radar?.available ? radar.deltas : [];
  const values = current ? current.values : axes.map(() => null);
  const note = radar?.note || 'Lower percentages indicate a higher KvK ranking.';
  const summary = current ? radar.summary : null;

  return (
    <section className="border-t border-gray-800 px-4 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Playstyle hexagon
          </h2>
          <p className="mt-1 text-xs text-gray-600">{note}</p>
        </div>
        {current ? (
          <span className="shrink-0 font-mono text-[10px] text-gray-600">
            {radar.readings.length} reading{radar.readings.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className={current ? 'mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]' : ''}>
        <svg
          viewBox={VIEWBOX}
          className="mx-auto h-auto w-full max-w-[28rem]"
          role="img"
          aria-label={summary ? `Playstyle hexagon. ${summary}` : 'Playstyle hexagon, no readings yet'}
        >
          <title>{summary || 'No playstyle readings captured yet.'}</title>

          {RINGS.map((scale) => (
            <path
              key={scale}
              d={ringPath(scale)}
              fill="none"
              stroke="#27272a"
              strokeWidth={scale === 1 ? 1.5 : 1}
              strokeDasharray={scale === 1 ? undefined : '3 4'}
            />
          ))}

          {ANGLES.map((angle) => {
            const [x, y] = polar(angle, RADIUS);
            return (
              <line
                key={angle}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={x}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
              />
            );
          })}

          {previous ? (
            <path
              d={polygonPath(previous.values)}
              fill="rgba(161,161,170,0.10)"
              stroke="#71717a"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          ) : null}

          {current ? (
            <path
              d={polygonPath(current.values)}
              fill="rgba(245,158,11,0.18)"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ) : null}

          {values.map((value, index) => {
            const [x, y] = polar(ANGLES[index], RADIUS * pointFactor(value));
            const axis = axes[index];
            const delta = deltas.find((row) => row.key === axis.key);
            const labelPos = polar(ANGLES[index], LABEL_RADIUS);
            return (
              <g key={axis.key}>
                {current ? <circle cx={x} cy={y} r="3.5" fill="#f59e0b" /> : null}
                <title>
                  {current
                    ? `${axis.label}: ${percentile(value)}${
                        previous && delta ? ` (previous ${percentile(previous.values[index])})` : ''
                      }`
                    : `${axis.label}: no reading`}
                </title>
                <text
                  x={labelPos[0]}
                  y={labelPos[1]}
                  textAnchor={anchorFor(ANGLES[index])}
                  fontSize="12"
                  fill={current ? '#d4d4d8' : '#52525b'}
                  fontWeight="500"
                >
                  {axis.label}
                </text>
                <text
                  x={labelPos[0]}
                  y={labelPos[1] + 15}
                  textAnchor={anchorFor(ANGLES[index])}
                  fontSize="11"
                  fill="#71717a"
                  fontFamily="ui-monospace, monospace"
                >
                  {current ? `Top ${percentile(value)}` : '—'}
                </text>
              </g>
            );
          })}
        </svg>

        {current ? (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Plotted</p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-5 shrink-0 rounded-sm bg-amber-400" />
                  <span className="text-xs text-neutral-100">
                    {readingLabel(current) || 'Latest'}
                  </span>
                </li>
                {previous ? (
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-5 shrink-0 rounded-sm border border-dashed border-gray-500 bg-gray-500/20" />
                    <span className="text-xs text-gray-400">{readingLabel(previous)}</span>
                  </li>
                ) : null}
              </ul>
            </div>

            {deltas.length ? (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">
                  Since {readingLabel(previous)}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {deltas.map((row) => {
                    const tone =
                      row.direction === 'better'
                        ? 'text-emerald-300'
                        : row.direction === 'worse'
                          ? 'text-rose-300'
                          : 'text-gray-500';
                    const arrow =
                      row.direction === 'better' ? '↓' : row.direction === 'worse' ? '↑' : '→';
                    return (
                      <li key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="truncate text-neutral-300">{row.label}</span>
                        <span className="flex shrink-0 items-baseline gap-1.5 font-mono text-[10px]">
                          <span className="text-gray-600">{percentile(row.previous)}</span>
                          <span className={tone}>
                            {arrow} {points(Math.abs(row.delta))}
                          </span>
                          <span className="text-neutral-100">{percentile(row.current)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                A second reading is needed before any axis can move.
              </p>
            )}

            <p className="border-t border-gray-800 pt-3 text-xs leading-relaxed text-gray-600">
              {summary}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
