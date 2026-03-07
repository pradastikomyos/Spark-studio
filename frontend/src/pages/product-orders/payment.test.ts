import { describe, expect, it } from 'vitest';
import {
  buildInstructionSteps,
  formatCountdown,
  getCountdownParts,
  getPaymentMethodLabel,
  getProductOrderPaymentInfo,
  getRemainingMs,
} from './payment';

describe('product order payment helpers', () => {
  it('extracts bank transfer payment info', () => {
    const paymentInfo = getProductOrderPaymentInfo({
      payment_data: {
        payment_type: 'bank_transfer',
        expiry_time: '2026-03-07T12:00:00Z',
        va_numbers: [{ bank: 'bca', va_number: '1234567890' }],
      },
    });

    expect(paymentInfo.paymentType).toBe('bank_transfer');
    expect(paymentInfo.primaryCode).toBe('1234567890');
    expect(paymentInfo.primaryCodeLabel).toBe('BCA Virtual Account');
    expect(buildInstructionSteps(paymentInfo, 150000)).toHaveLength(3);
  });

  it('formats countdown and clamps negative time', () => {
    expect(getRemainingMs('2026-03-07T12:00:10Z', new Date('2026-03-07T12:00:00Z').getTime())).toBe(10000);
    expect(getRemainingMs('2026-03-07T12:00:00Z', new Date('2026-03-07T12:00:10Z').getTime())).toBe(0);
    expect(getCountdownParts(3661000)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
    expect(formatCountdown(3661000)).toBe('01:01:01');
  });

  it('maps payment method labels', () => {
    expect(
      getPaymentMethodLabel({
        channel: 'cashier',
        payment_data: null,
      })
    ).toBe('Bayar di Kasir');

    expect(
      getPaymentMethodLabel({
        channel: 'midtrans',
        payment_data: {
          payment_type: 'qris',
        },
      })
    ).toBe('QRIS');
  });
});
