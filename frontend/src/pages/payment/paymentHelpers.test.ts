import { describe, expect, it } from 'vitest';
import { buildBookingSuccessState, formatPaymentDate, getPaymentBookingDetails, hasRequiredPaymentDetails } from './paymentHelpers';

describe('paymentHelpers', () => {
  it('builds booking details with defaults and total', () => {
    const details = getPaymentBookingDetails({
      ticketId: 1,
      ticketName: 'Spark Entry',
      ticketType: 'entrance',
      price: 150000,
      quantity: 2,
      date: '2026-03-08',
      time: '10:00',
    });

    expect(details.total).toBe(300000);
    expect(hasRequiredPaymentDetails(details)).toBe(true);
  });

  it('formats payment dates and success navigation state', () => {
    expect(formatPaymentDate('2026-03-08')).toContain('2026');

    expect(
      buildBookingSuccessState({
        orderNumber: 'ORD-1',
        orderId: 1,
        ticketName: 'Spark Entry',
        total: 150000,
        date: '2026-03-08',
        time: '10:00',
        customerName: 'Nadia',
      })
    ).toMatchObject({
      orderNumber: 'ORD-1',
      isPending: true,
      customerName: 'Nadia',
    });
  });
});
