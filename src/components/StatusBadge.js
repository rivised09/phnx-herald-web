import { STATUS_LABELS, STATUS_COLORS } from '../lib/time';

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'bg-slate-500';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/10 ${color}`}
    >
      {label}
    </span>
  );
}