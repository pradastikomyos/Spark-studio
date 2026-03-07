type AutoSyncParams = {
  orderNumber: string;
  effectiveStatus: string | null;
  initialIsPending: boolean;
  ticketsCount: number;
};

type ConfettiParams = {
  ticketsCount: number;
  effectiveStatus: string | null;
  loading: boolean;
};

export const MAX_SKELETON_MS = 20000;

export function shouldAutoSyncBookingStatus({
  orderNumber,
  effectiveStatus,
  initialIsPending,
  ticketsCount,
}: AutoSyncParams) {
  return Boolean(
    orderNumber &&
      (effectiveStatus === 'pending' || effectiveStatus === 'paid' || (effectiveStatus === null && initialIsPending)) &&
      ticketsCount === 0
  );
}

export function shouldTriggerBookingConfetti({ ticketsCount, effectiveStatus, loading }: ConfettiParams) {
  return ticketsCount > 0 && effectiveStatus === 'paid' && !loading;
}
