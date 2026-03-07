import { describe, expect, it } from 'vitest';
import { emptyForm, toInputDateTime, toVoucherPayload, validateVoucherForm } from './voucherForm';

describe('voucherForm helpers', () => {
  const t = (key: string) => key;

  it('returns default form state', () => {
    expect(emptyForm()).toMatchObject({
      code: '',
      discount_type: 'percentage',
      applicable_categories: [],
      is_active: true,
    });
  });

  it('validates required fields', () => {
    const errors = validateVoucherForm(emptyForm(), t as never);
    expect(errors).toContain('admin.vouchers.form.errors.code');
    expect(errors).toContain('admin.vouchers.form.errors.discountValue');
    expect(errors).toContain('admin.vouchers.form.errors.validity');
  });

  it('converts form state to payload', () => {
    const payload = toVoucherPayload({
      code: ' spark10 ',
      discount_type: 'percentage',
      discount_value: '10',
      valid_from: '2026-02-01T10:00',
      valid_until: '2026-02-02T10:00',
      quota: '5',
      min_purchase: '10000',
      max_discount: '25000',
      applicable_categories: [1, 2],
      is_active: true,
    });

    expect(payload.code).toBe('SPARK10');
    expect(payload.discount_value).toBe(10);
    expect(payload.quota).toBe(5);
    expect(payload.applicable_categories).toEqual([1, 2]);
  });

  it('formats input datetime from ISO strings', () => {
    expect(toInputDateTime('2026-02-01T10:30:00.000Z')).toContain('2026-02-01');
  });
});
