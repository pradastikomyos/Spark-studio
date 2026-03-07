import { describe, expect, it } from 'vitest';
import { MAX_SKELETON_MS, shouldAutoSyncBookingStatus, shouldTriggerBookingConfetti } from './bookingSuccessHelpers';

describe('bookingSuccessHelpers', () => {
  it('keeps the expected skeleton timeout constant', () => {
    expect(MAX_SKELETON_MS).toBe(20000);
  });

  it('decides auto sync only for pending or paid states without tickets', () => {
    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-1',
        effectiveStatus: 'pending',
        initialIsPending: false,
        ticketsCount: 0,
      })
    ).toBe(true);

    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-1',
        effectiveStatus: 'paid',
        initialIsPending: false,
        ticketsCount: 1,
      })
    ).toBe(false);
  });

  it('only triggers confetti when tickets are available and loading is done', () => {
    expect(
      shouldTriggerBookingConfetti({
        ticketsCount: 2,
        effectiveStatus: 'paid',
        loading: false,
      })
    ).toBe(true);

    expect(
      shouldTriggerBookingConfetti({
        ticketsCount: 0,
        effectiveStatus: 'paid',
        loading: false,
      })
    ).toBe(false);
  });
});
