import { describe, expect, it, vi } from 'vitest';
import { discountValueLabel, formatValidity, statusLabel } from './voucherPresentation';

const baseVoucher = {
  id: 'voucher-1',
  code: 'SPARK10',
  discount_type: 'percentage' as const,
  discount_value: 10,
  valid_from: '2026-02-01T00:00:00.000Z',
  valid_until: '2026-02-10T00:00:00.000Z',
  quota: 10,
  used_count: 0,
  min_purchase: null,
  max_discount: null,
  applicable_categories: null,
  is_active: true,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
};

describe('voucherPresentation', () => {
  it('resolves active and expired status', () => {
    vi.setSystemTime(new Date('2026-02-05T00:00:00.000Z'));
    expect(statusLabel(baseVoucher)).toBe('active');
    expect(statusLabel({ ...baseVoucher, valid_until: '2026-01-01T00:00:00.000Z' })).toBe('expired');
    expect(statusLabel({ ...baseVoucher, is_active: false })).toBe('inactive');
  });

  it('formats value and validity text', () => {
    expect(discountValueLabel(baseVoucher)).toBe('10%');
    expect(formatValidity(baseVoucher)).toContain('2026');
  });
});
