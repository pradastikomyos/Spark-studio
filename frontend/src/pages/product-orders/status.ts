import type { ProductOrderBase, ProductOrderStatusGroup } from './types';

const normalize = (value: string | null | undefined) => String(value || '').toLowerCase();

export function isPendingPayment(order: Pick<ProductOrderBase, 'payment_status' | 'status'>) {
  const paymentStatus = normalize(order.payment_status);
  const orderStatus = normalize(order.status);

  if (orderStatus === 'cancelled' || orderStatus === 'expired') {
    return false;
  }

  return paymentStatus === 'unpaid' || paymentStatus === 'pending';
}

export function isActivePickup(
  order: Pick<ProductOrderBase, 'payment_status' | 'pickup_status' | 'status'>
) {
  const paymentStatus = normalize(order.payment_status);
  const pickupStatus = normalize(order.pickup_status);
  const orderStatus = normalize(order.status);

  if (paymentStatus !== 'paid') {
    return false;
  }

  if (pickupStatus === 'completed' || pickupStatus === 'expired' || pickupStatus === 'cancelled') {
    return false;
  }

  return orderStatus !== 'cancelled' && orderStatus !== 'expired' && orderStatus !== 'completed';
}

export function isHistoryOrder(
  order: Pick<ProductOrderBase, 'payment_status' | 'pickup_status' | 'status'>
) {
  const paymentStatus = normalize(order.payment_status);
  const pickupStatus = normalize(order.pickup_status);
  const orderStatus = normalize(order.status);

  return (
    pickupStatus === 'completed' ||
    pickupStatus === 'expired' ||
    pickupStatus === 'cancelled' ||
    orderStatus === 'cancelled' ||
    orderStatus === 'expired' ||
    orderStatus === 'completed' ||
    paymentStatus === 'failed' ||
    paymentStatus === 'refunded'
  );
}

export function classifyProductOrder(
  order: Pick<ProductOrderBase, 'payment_status' | 'pickup_status' | 'status'>
): ProductOrderStatusGroup {
  if (isPendingPayment(order)) return 'pending';
  if (isActivePickup(order)) return 'active';
  return 'history';
}

export function shouldAutoSyncProductOrder(order: Pick<ProductOrderBase, 'payment_status' | 'status'>) {
  const paymentStatus = normalize(order.payment_status);
  const orderStatus = normalize(order.status);

  return (
    paymentStatus !== 'paid' &&
    paymentStatus !== 'failed' &&
    paymentStatus !== 'refunded' &&
    orderStatus !== 'cancelled' &&
    orderStatus !== 'expired'
  );
}

export function shouldRedirectPendingToSuccess(order: Pick<ProductOrderBase, 'payment_status'>) {
  return normalize(order.payment_status) === 'paid';
}

export function shouldRedirectSuccessToPending(
  order: Pick<ProductOrderBase, 'payment_status' | 'channel'>
) {
  return normalize(order.channel) !== 'cashier' && normalize(order.payment_status) !== 'paid';
}

export function isPickupReady(order: Pick<ProductOrderBase, 'pickup_code' | 'payment_status' | 'channel'>) {
  return Boolean(
    order.pickup_code && (normalize(order.payment_status) === 'paid' || normalize(order.channel) === 'cashier')
  );
}
