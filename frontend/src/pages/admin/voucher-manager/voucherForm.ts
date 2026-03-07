import type { TFunction } from 'i18next';
import type { VoucherFormState } from './voucherManagerTypes';

export const emptyForm = (): VoucherFormState => ({
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  valid_from: '',
  valid_until: '',
  quota: '',
  min_purchase: '',
  max_discount: '',
  applicable_categories: [],
  is_active: true,
});

export const toInputDateTime = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export const validateVoucherForm = (formState: VoucherFormState, t: TFunction) => {
  const errors: string[] = [];
  if (!formState.code.trim()) errors.push(t('admin.vouchers.form.errors.code'));
  if (!formState.discount_value || Number(formState.discount_value) <= 0) {
    errors.push(t('admin.vouchers.form.errors.discountValue'));
  }
  if (!formState.valid_from || !formState.valid_until) {
    errors.push(t('admin.vouchers.form.errors.validity'));
  } else if (new Date(formState.valid_until) <= new Date(formState.valid_from)) {
    errors.push(t('admin.vouchers.form.errors.dateRange'));
  }
  if (!formState.quota || Number(formState.quota) <= 0) {
    errors.push(t('admin.vouchers.form.errors.quota'));
  }
  if (formState.min_purchase && Number(formState.min_purchase) < 0) {
    errors.push(t('admin.vouchers.form.errors.minPurchase'));
  }
  if (formState.max_discount && Number(formState.max_discount) < 0) {
    errors.push(t('admin.vouchers.form.errors.maxDiscount'));
  }
  return errors;
};

export const toVoucherPayload = (formState: VoucherFormState) => ({
  code: formState.code.trim().toUpperCase(),
  discount_type: formState.discount_type,
  discount_value: Number(formState.discount_value),
  valid_from: new Date(formState.valid_from).toISOString(),
  valid_until: new Date(formState.valid_until).toISOString(),
  quota: Math.floor(Number(formState.quota)),
  min_purchase: formState.min_purchase ? Number(formState.min_purchase) : null,
  max_discount: formState.max_discount ? Number(formState.max_discount) : null,
  applicable_categories: formState.applicable_categories.length > 0 ? formState.applicable_categories : null,
  is_active: formState.is_active,
});
