import type { Session } from '@supabase/supabase-js';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';

export type ProductOrdersTab = 'pending_payment' | 'pending_pickup' | 'today' | 'completed';

export type OrderItemRow = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  variantName: string;
  productName: string;
};

export type ProductOrderDetails = {
  order: OrderSummaryRow & {
    channel?: string | null;
    payment_status: string;
    status: string;
    pickup_expires_at: string | null;
  };
  items: OrderItemRow[];
};

export type UseProductOrdersControllerParams = {
  orders: OrderSummaryRow[];
  pendingPickupCount: number;
  pendingPaymentCount: number;
  ordersError: string | null;
  session: Session | null;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
};
