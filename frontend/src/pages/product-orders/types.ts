export type ProductOrderStatusGroup = 'pending' | 'active' | 'history';

export interface ProductOrderItem {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

export interface ProductOrderBase {
  id: number;
  order_number: string;
  channel?: string | null;
  payment_status: string;
  status: string;
  pickup_code: string | null;
  pickup_status: string | null;
  pickup_expires_at: string | null;
  paid_at: string | null;
  total: number;
  created_at: string | null;
  voucher_code?: string | null;
  discount_amount?: number | null;
}

export interface ProductOrderDetail extends ProductOrderBase {
  payment_url?: string | null;
  payment_data?: unknown | null;
}

export interface ProductOrderListItem extends ProductOrderBase {
  itemCount: number;
  items: ProductOrderItem[];
}

export interface ProductOrderPaymentAction {
  name?: string;
  method?: string;
  url?: string;
}

export interface ProductOrderPaymentInfo {
  paymentType: string | null;
  expiryAt: Date | null;
  primaryCode: string | null;
  primaryCodeLabel: string | null;
  qrString: string | null;
  billerCode: string | null;
  store: string | null;
  actions: ProductOrderPaymentAction[];
}
