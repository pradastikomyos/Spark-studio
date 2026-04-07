import { describe, expect, it, vi } from 'vitest';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import {
  getCompletedOrders,
  getDisplayOrders,
  getEmptyStateCopy,
  getPendingOrders,
  getPickupStatusClass,
  getPickupStatusLabel,
  getTodaysOrders,
} from './productOrdersHelpers';

function createOrder(overrides: Partial<OrderSummaryRow>): OrderSummaryRow {
  return {
    id: 1,
    order_number: 'ORD-1',
    total: 10000,
    pickup_code: 'PRX-1',
    pickup_status: 'pending_pickup',
    paid_at: '2026-03-07T10:00:00.000Z',
    updated_at: '2026-03-07T11:00:00.000Z',
    created_at: '2026-03-07T09:00:00.000Z',
    profiles: null,
    order_product_items: [],
    ...overrides,
  };
}

describe('productOrdersHelpers', () => {
  it('sorts pending orders by paid or created time descending', () => {
    const orders = [
      createOrder({ id: 1, paid_at: '2026-03-07T08:00:00.000Z', payment_status: 'paid' }),
      createOrder({ id: 3, pickup_status: 'pending_review', paid_at: '2026-03-07T09:00:00.000Z', payment_status: 'paid' }),
      createOrder({ id: 2, paid_at: '2026-03-07T10:00:00.000Z', payment_status: 'paid' }),
    ];

    expect(getPendingOrders(orders).map((order) => order.id)).toEqual([2, 3, 1]);
  });

  it('filters todays orders against current day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));

    const orders = [
      createOrder({ id: 1, paid_at: '2026-03-07T08:00:00.000Z' }),
      createOrder({ id: 2, paid_at: '2026-03-06T10:00:00.000Z' }),
    ];

    expect(getTodaysOrders(orders).map((order) => order.id)).toEqual([1]);

    vi.useRealTimers();
  });

  it('returns display orders for the active tab and empty-state copy', () => {
    const pending = [createOrder({ id: 1 })];
    const pendingPayment = [createOrder({ id: 4 })];
    const today = [createOrder({ id: 2 })];
    const completed = [createOrder({ id: 3, pickup_status: 'completed' })];

    expect(getDisplayOrders('pending_payment', pending, pendingPayment, today, completed)).toEqual(pendingPayment);
    expect(getDisplayOrders('pending_pickup', pending, pendingPayment, today, completed)).toEqual(pending);
    expect(getDisplayOrders('today', pending, pendingPayment, today, completed)).toEqual(today);
    expect(getCompletedOrders(completed).map((order) => order.id)).toEqual([3]);
    expect(getEmptyStateCopy('completed').message).toContain('selesai');
    expect(getPickupStatusLabel('pending_pickup')).toBe('Pending');
    expect(getPickupStatusLabel('pending_review')).toBe('Review');
    expect(getPickupStatusClass('pending_review')).toContain('bg-orange-100');
  });
});
