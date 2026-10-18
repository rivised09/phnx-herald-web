import { PlayerDetailSkeleton } from '../../DetailSkeleton';
import LoadingOverlay from '../../../../components/LoadingOverlay';

export default function Loading() {
  // The skeleton keeps the shape of what is coming; the centered card is the
  // part that reads as "working" without asking anyone to interpret shimmer
  // as meaning - the same state a date switch shows from the picker on.
  return (
    <>
      <PlayerDetailSkeleton />
      <LoadingOverlay labelKey="roster.loadingPlayer" />
    </>
  );
}
