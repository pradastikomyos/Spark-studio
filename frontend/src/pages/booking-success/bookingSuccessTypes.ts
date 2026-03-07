export interface BookingSuccessLocationState {
  orderNumber?: string;
  orderId?: number;
  ticketName?: string;
  total?: number;
  date?: string;
  time?: string;
  customerName?: string;
  paymentResult?: unknown;
  isPending?: boolean;
  ticketCode?: string;
}

export interface PurchasedTicket {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  queue_overflow: boolean;
  status: string;
  ticket: {
    name: string;
    type: string;
  };
}

export interface PurchasedTicketRow {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number?: number | null;
  queue_overflow?: boolean | null;
  status: string;
  order_item_id?: number | null;
  tickets?: {
    name: string;
    type: string;
  } | { name: string; type: string }[] | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  quantity?: number | null;
}

export interface OrderRow {
  id: number;
  order_number: string;
  status: string;
  expires_at?: string | null;
}

export type OrderData = OrderRow & { order_items: OrderItem[] };
export type OrderState = OrderData | OrderRow | { status?: string | null; expires_at?: string | null };
