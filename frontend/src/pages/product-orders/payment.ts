import { formatCurrency } from '../../utils/formatters';
import type { ProductOrderDetail, ProductOrderPaymentInfo } from './types';

type RawPaymentData = {
  payment_type?: string;
  expiry_time?: string;
  transaction_time?: string;
  gross_amount?: string | number;
  va_numbers?: { bank?: string; va_number?: string }[];
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  payment_code?: string;
  store?: string;
  qr_string?: string;
  actions?: { name?: string; method?: string; url?: string }[];
};

export function getProductOrderPaymentInfo(
  order: Pick<ProductOrderDetail, 'payment_data'> | null | undefined
): ProductOrderPaymentInfo {
  const raw = (order?.payment_data as RawPaymentData | null | undefined) ?? null;
  const expiryAt = raw?.expiry_time ? new Date(raw.expiry_time) : null;
  const primaryVa = Array.isArray(raw?.va_numbers) && raw.va_numbers.length > 0 ? raw.va_numbers[0] : null;

  return {
    paymentType: raw?.payment_type ? String(raw.payment_type) : null,
    expiryAt: expiryAt && !Number.isNaN(expiryAt.getTime()) ? expiryAt : null,
    primaryCode:
      primaryVa?.va_number || raw?.permata_va_number || raw?.bill_key || raw?.payment_code || null,
    primaryCodeLabel: primaryVa?.va_number
      ? `${String(primaryVa.bank || 'VA').toUpperCase()} Virtual Account`
      : raw?.permata_va_number
        ? 'Permata Virtual Account'
        : raw?.bill_key
          ? 'Bill Key'
          : raw?.payment_code
            ? 'Payment Code'
            : null,
    qrString: raw?.qr_string || null,
    billerCode: raw?.biller_code || null,
    store: raw?.store || null,
    actions: raw?.actions || [],
  };
}

export function buildInstructionSteps(paymentInfo: ProductOrderPaymentInfo, total: number) {
  if (!paymentInfo.paymentType) return [] as string[];

  if (paymentInfo.paymentType === 'bank_transfer') {
    return [
      'Log in to your mobile banking or ATM and select "Transfer / Virtual Account".',
      'Enter the Virtual Account number displayed above.',
      `Ensure the total amount matches exactly ${formatCurrency(Number(total || 0))}.`,
    ];
  }

  if (paymentInfo.paymentType === 'cstore') {
    return [
      'Go to the selected store and tell the cashier you want to make a payment.',
      'Provide the payment code displayed above.',
      `Pay the exact amount ${formatCurrency(Number(total || 0))}.`,
    ];
  }

  if (paymentInfo.paymentType === 'qris') {
    return [
      'Open your preferred e-wallet or mobile banking app.',
      'Scan the QR code shown above.',
      `Confirm the payment amount ${formatCurrency(Number(total || 0))} and complete the payment.`,
    ];
  }

  return [
    'Complete the payment using your selected method.',
    'Return to this page and tap "Check Status" to refresh.',
    'If the status remains pending, please wait a moment and try again.',
  ];
}

export function getRemainingMs(expiresAt: Date | string | null | undefined, now: number) {
  if (!expiresAt) return null;
  const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, parsed.getTime() - now);
}

export function getCountdownParts(remainingMs: number | null) {
  if (remainingMs === null) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

export function formatCountdown(remainingMs: number | null) {
  const parts = getCountdownParts(remainingMs);
  if (!parts) return null;

  return [parts.hours, parts.minutes, parts.seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function getPaymentMethodLabel(order: Pick<ProductOrderDetail, 'channel' | 'payment_data'> | null | undefined) {
  const channel = String(order?.channel || '').toLowerCase();
  if (channel === 'cashier') return 'Bayar di Kasir';

  const paymentInfo = getProductOrderPaymentInfo(order);
  const raw = order?.payment_data as RawPaymentData | null | undefined;
  const paymentType = paymentInfo.paymentType;

  if (!paymentType) return 'Midtrans';

  if (paymentType === 'bank_transfer') {
    const va = Array.isArray(raw?.va_numbers) && raw.va_numbers.length > 0 ? raw.va_numbers[0] : null;
    if (va?.bank) return `${String(va.bank).toUpperCase()} Virtual Account`;
    if (raw?.permata_va_number) return 'Permata Virtual Account';
    return 'Bank Transfer';
  }

  if (paymentType === 'cstore') {
    if (raw?.store) return String(raw.store).toUpperCase();
    return 'Convenience Store';
  }

  if (paymentType === 'qris') return 'QRIS';
  if (paymentType === 'gopay') return 'GoPay';
  if (paymentType === 'shopeepay') return 'ShopeePay';
  if (paymentType === 'akulaku') return 'Akulaku';

  return paymentType.replace(/_/g, ' ').toUpperCase();
}
