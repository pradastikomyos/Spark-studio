import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { ProductOrderListItem } from '../product-orders/types';
import { MyOrderCard } from './MyOrderCard';

type MyOrdersListProps = {
  orders: ProductOrderListItem[];
  expandedOrder: number | null;
  syncingOrderId: number | null;
  getStatusBadge: (order: ProductOrderListItem) => {
    label: string;
    tone: 'yellow' | 'amber' | 'green' | 'gray' | 'red' | 'blue';
  };
  getPickupInstruction: (order: ProductOrderListItem) => string;
  shouldShowPickupExpiry: (order: ProductOrderListItem) => boolean;
  isPickupReady: (order: ProductOrderListItem) => boolean;
  onToggleExpand: (orderId: number) => void;
  onSyncStatus: (order: ProductOrderListItem) => void;
  onCancelOrder: (order: ProductOrderListItem) => void;
  t: TFunction;
};

export function MyOrdersList({
  orders,
  expandedOrder,
  syncingOrderId,
  getStatusBadge,
  getPickupInstruction,
  shouldShowPickupExpiry,
  isPickupReady,
  onToggleExpand,
  onSyncStatus,
  onCancelOrder,
  t,
}: MyOrdersListProps) {
  const navigate = useNavigate();

  return (
    <>
      {orders.map((order) => (
        <MyOrderCard
          key={order.id}
          order={order}
          isExpanded={expandedOrder === order.id}
          isSyncing={syncingOrderId === order.id}
          onToggleExpand={() => onToggleExpand(order.id)}
          onPayNow={() => navigate(`/order/product/pending/${order.order_number}`)}
          onCancel={() => void onCancelOrder(order)}
          onSyncStatus={() => void onSyncStatus(order)}
          onViewDetails={() => navigate(`/order/product/success/${order.order_number}`)}
          statusBadge={getStatusBadge(order)}
          pickupInstruction={getPickupInstruction(order)}
          showPickupExpiry={shouldShowPickupExpiry(order)}
          showPickupQr={isPickupReady(order)}
          t={t}
        />
      ))}
    </>
  );
}
