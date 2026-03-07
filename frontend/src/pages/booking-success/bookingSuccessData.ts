import { supabase } from '../../lib/supabase';
import { createQuerySignal } from '../../lib/fetchers';
import { withTimeout } from '../../utils/queryHelpers';
import type { OrderData, OrderItem, OrderRow, OrderState, PurchasedTicket, PurchasedTicketRow } from './bookingSuccessTypes';

export const mapPurchasedTicket = (row: PurchasedTicketRow): PurchasedTicket => {
  const ticketMeta = Array.isArray(row.tickets) ? row.tickets[0] : row.tickets;
  return {
    id: row.id,
    ticket_code: row.ticket_code,
    valid_date: row.valid_date,
    time_slot: row.time_slot,
    queue_number: row.queue_number ?? null,
    queue_overflow: Boolean(row.queue_overflow),
    status: row.status,
    ticket: {
      name: ticketMeta?.name || 'Ticket',
      type: ticketMeta?.type || 'entrance',
    },
  };
};

export async function runBookingSuccessQueryWithTimeout<T>(
  fn: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 10000
) {
  const { signal, cleanup, didTimeout } = createQuerySignal(undefined, timeoutMs);
  try {
    return await withTimeout(Promise.resolve(fn(signal)), timeoutMs, 'Request timeout');
  } catch (error) {
    if (didTimeout() || (error instanceof Error && error.message.toLowerCase().includes('timeout'))) {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    cleanup();
  }
}

async function fetchPurchasedTicketByCode(ticketCode: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase
      .from('purchased_tickets')
      .select(`
        id,
        ticket_code,
        valid_date,
        time_slot,
        queue_number,
        queue_overflow,
        status,
        order_item_id,
        tickets:ticket_id (
          name,
          type
        )
      `)
      .eq('ticket_code', ticketCode)
      .abortSignal(signal)
      .single()
  );

  if (error || !data) {
    throw error ?? new Error('Ticket not found');
  }

  return mapPurchasedTicket(data as PurchasedTicketRow);
}

async function fetchOrderByNumber(orderNumber: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase.from('orders').select('*').eq('order_number', orderNumber).abortSignal(signal).single()
  );

  if (error || !data) {
    throw error ?? new Error('Order not found');
  }

  return data as OrderRow;
}

async function fetchOrderItems(orderId: number) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase.from('order_items').select('*').eq('order_id', orderId).abortSignal(signal)
  );

  if (error) {
    throw error;
  }

  return (data as OrderItem[] | null) || [];
}

async function fetchPurchasedTicketsByOrderItemIds(orderItemIds: number[]) {
  if (orderItemIds.length === 0) return [];

  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase
      .from('purchased_tickets')
      .select(`
        id,
        ticket_code,
        valid_date,
        time_slot,
        queue_number,
        queue_overflow,
        status,
        tickets:ticket_id (
          name,
          type
        )
      `)
      .in('order_item_id', orderItemIds)
      .abortSignal(signal)
  );

  if (error) {
    throw error;
  }

  return ((data as PurchasedTicketRow[] | null) || []).map(mapPurchasedTicket);
}

export async function fetchPurchasedTicketsForOrderNumber(orderNumber: string) {
  const order = await fetchOrderByNumber(orderNumber);
  const orderItems = await fetchOrderItems(order.id);
  return fetchPurchasedTicketsByOrderItemIds(orderItems.map((item) => item.id));
}

export async function fetchBookingSuccessData(params: { orderNumber: string; ticketCode?: string }) {
  const { orderNumber, ticketCode } = params;

  if (ticketCode && !orderNumber) {
    const ticket = await fetchPurchasedTicketByCode(ticketCode);
    return {
      orderData: { status: 'paid' } as OrderState,
      tickets: [ticket],
    };
  }

  if (!orderNumber) {
    return {
      orderData: null as OrderState | null,
      tickets: [] as PurchasedTicket[],
    };
  }

  const order = await fetchOrderByNumber(orderNumber);
  const orderItems = await fetchOrderItems(order.id);
  const orderData: OrderData = {
    ...order,
    order_items: orderItems,
  };

  if (order.status !== 'paid' || orderItems.length === 0) {
    return {
      orderData,
      tickets: [] as PurchasedTicket[],
    };
  }

  return {
    orderData,
    tickets: await fetchPurchasedTicketsByOrderItemIds(orderItems.map((item) => item.id)),
  };
}

export async function fetchBookingOrderStatusSnapshot(orderNumber: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase.from('orders').select('status, expires_at').eq('order_number', orderNumber).abortSignal(signal).single()
  );

  if (error) {
    throw error;
  }

  return data as Pick<OrderRow, 'status' | 'expires_at'> | null;
}
