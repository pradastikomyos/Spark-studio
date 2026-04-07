import { ADMIN_MENU_SECTIONS } from '../../../constants/adminMenu';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import type { ProductOrdersTab } from './productOrdersTypes';

const EMPTY_STATE_COPY: Record<ProductOrdersTab, { icon: string; message: string }> = {
  pending_payment: { icon: 'hourglass_empty', message: 'Belum ada pesanan menunggu pembayaran.' },
  pending_pickup: { icon: 'inventory_2', message: 'Tidak ada pesanan menunggu pickup.' },
  today: { icon: 'today', message: 'Belum ada pesanan paid hari ini.' },
  completed: { icon: 'check_circle', message: 'Belum ada pesanan selesai.' },
};

export function getPendingOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => order.pickup_status === 'pending_pickup' || order.pickup_status === 'pending_review')
    .sort((left, right) => {
      const leftTime = left.paid_at || left.created_at || '';
      const rightTime = right.paid_at || right.created_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getPendingPaymentOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.channel === 'cashier')
    .filter((order) => order.status === 'awaiting_payment')
    .filter((order) => order.payment_status === 'unpaid' || order.payment_status === 'pending')
    .filter((order) => order.pickup_status === 'pending_pickup' || order.pickup_status === 'pending_review')
    .sort((left, right) => {
      const leftTime = left.created_at || left.paid_at || '';
      const rightTime = right.created_at || right.paid_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getTodaysOrders(orders: OrderSummaryRow[]) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => {
      const dateStr = order.paid_at || order.created_at;
      return dateStr ? String(dateStr).slice(0, 10) === todayKey : false;
    })
    .sort((left, right) => {
      const leftTime = left.paid_at || left.created_at || '';
      const rightTime = right.paid_at || right.created_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getCompletedOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => order.pickup_status === 'completed')
    .sort((left, right) => (right.updated_at ?? '').localeCompare(left.updated_at ?? ''));
}

export function getDisplayOrders(
  tab: ProductOrdersTab,
  pendingOrders: OrderSummaryRow[],
  pendingPaymentOrders: OrderSummaryRow[],
  todaysOrders: OrderSummaryRow[],
  completedOrders: OrderSummaryRow[]
) {
  if (tab === 'pending_payment') return pendingPaymentOrders;
  if (tab === 'pending_pickup') return pendingOrders;
  if (tab === 'today') return todaysOrders;
  return completedOrders;
}

export function getPickupStatusClass(pickupStatus: string | null) {
  if (pickupStatus === 'pending_pickup') return 'bg-yellow-100 text-yellow-700';
  if (pickupStatus === 'pending_review') return 'bg-orange-100 text-orange-700';
  if (pickupStatus === 'completed') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

export function getPickupStatusLabel(pickupStatus: string | null) {
  if (pickupStatus === 'pending_pickup') return 'Pending';
  if (pickupStatus === 'pending_review') return 'Review';
  if (pickupStatus === 'completed') return 'Selesai';
  return pickupStatus ?? 'pending';
}

export function getOrderTimingLabel(order: OrderSummaryRow) {
  if (order.pickup_status === 'completed' && order.updated_at) {
    return {
      prefix: 'Terverifikasi:',
      value: new Date(order.updated_at).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  const dateValue = order.paid_at || order.created_at;
  if (!dateValue) return null;

  return {
    prefix: order.paid_at ? 'Dibayar:' : 'Order:',
    value: new Date(dateValue).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function getEmptyStateCopy(tab: ProductOrdersTab) {
  return EMPTY_STATE_COPY[tab];
}

export function buildProductOrdersMenuSections(pendingCount: number) {
  return ADMIN_MENU_SECTIONS.map((section) => {
    if (section.id !== 'store') return section;
    return {
      ...section,
      items: section.items.map((item) => {
        if (item.id !== 'product-orders') return item;
        return { ...item, badge: pendingCount };
      }),
    };
  });
}
