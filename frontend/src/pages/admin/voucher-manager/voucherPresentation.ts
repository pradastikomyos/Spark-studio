import { formatCurrency } from '../../../utils/formatters';
import type { VoucherRow } from './voucherManagerTypes';

export const statusLabel = (voucher: VoucherRow) => {
  const now = Date.now();
  if (!voucher.is_active) return 'inactive';
  if (new Date(voucher.valid_until).getTime() < now) return 'expired';
  if (new Date(voucher.valid_from).getTime() > now) return 'inactive';
  return 'active';
};

export const discountValueLabel = (voucher: VoucherRow) => {
  if (voucher.discount_type === 'percentage') {
    return `${voucher.discount_value}%`;
  }
  return formatCurrency(voucher.discount_value);
};

export const formatValidity = (voucher: VoucherRow) => {
  const from = new Date(voucher.valid_from).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const until = new Date(voucher.valid_until).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${from} - ${until}`;
};
