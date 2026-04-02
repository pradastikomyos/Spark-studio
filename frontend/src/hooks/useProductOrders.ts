import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

const ADMIN_PRODUCT_ORDERS_STALE_TIME_MS = 30 * 1000;

export type OrderItemSummary = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_variants?: {
    name?: string;
    products?: {
      name?: string;
      categories?: {
        name?: string;
      } | null;
    } | null;
  } | null;
};

export type OrderSummaryRow = {
  id: number;
  order_number: string;
  total: number;
  pickup_code: string | null;
  pickup_status: string | null;
  paid_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  profiles?: { name?: string; email?: string } | null;
  order_product_items?: OrderItemSummary[];
};

export function useProductOrders() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.productOrders(),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const [ordersResult, pendingResult] = await Promise.all([
          supabase
            .from('order_products')
            .select('id, order_number, total, pickup_code, pickup_status, paid_at, updated_at, created_at, profiles(name, email), order_product_items(id, quantity, price, subtotal, product_variants(name, products(name, categories(name))))')
            .abortSignal(timeoutSignal)
            .eq('payment_status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(100),
          supabase
            .from('order_products')
            .select('id', { count: 'exact', head: true })
            .abortSignal(timeoutSignal)
            .eq('payment_status', 'paid')
            .in('pickup_status', ['pending_pickup', 'pending_review']),
        ]);

        if (ordersResult.error) {
          const err = new Error(ordersResult.error.message || 'Gagal memuat daftar pesanan') as APIError;
          err.status = 500;
          err.info = ordersResult.error;
          throw err;
        }

        return {
          orders: (ordersResult.data || []) as OrderSummaryRow[],
          pendingCount: pendingResult.count ?? 0,
        };
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: ADMIN_PRODUCT_ORDERS_STALE_TIME_MS,
  });

  useEffect(() => {
    let invalidateTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimeoutId) return;
      invalidateTimeoutId = setTimeout(() => {
        invalidateTimeoutId = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.productOrders() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.productOrderDetails() });
      }, 700);
    };

    const channel = supabase
      .channel('admin_product_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_products' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_product_items' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, scheduleInvalidate)
      .subscribe();

    return () => {
      if (invalidateTimeoutId) {
        clearTimeout(invalidateTimeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
