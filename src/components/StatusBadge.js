import { CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOTS } from '../lib/time';

// Terminal states carry an icon instead of the small dot, in the same
// green-check / red-cross language as the reminder embeds: Completed reads
// ✅ emerald, Cancelled reads ❌ red at a glance.
const STATUS_ICONS = {
  CANCELLED: XCircle,
  COMPLETED: CheckCircle2,
};

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'border-gray-700 text-gray-300';
  const dot = STATUS_DOTS[status] || 'bg-gray-300';
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${color}`}
    >
      {Icon ? (
        <Icon className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className={`h-1 w-1 rounded-full ${dot}`} />
      )}
      {label}
    </span>
  );
}
