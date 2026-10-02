import { STATUS_LABELS, STATUS_COLORS, STATUS_DOTS } from '../lib/time';

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'border-gray-700 text-gray-300';
  const dot = STATUS_DOTS[status] || 'bg-gray-300';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${color}`}
    >
      <span className={`h-1 w-1 rounded-full ${dot}`} />
      {label}
    </span>
  );
}