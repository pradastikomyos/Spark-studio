import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type OrderSummaryRow = {
  id: number;
  order_number: string;
  total: number;
  pickup_code: string | null;
  pickup_status: string | null;
  paid_at: string | null;
  profiles?: { name?: string; email?: string } | null;
};

export function useProductOrders() {
  return useQuery({
    queryKey: queryKeys.productOrders(),
    queryFn: async ({ signal }) => {
      const [ordersResult, pendingResult] = await Promise.all([
        supabase
          .from('order_products')
          .select('id, order_number, total, pickup_code, pickup_status, paid_at, profiles(name, email)')
          .abortSignal(signal)
          .eq('payment_status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(100),
        supabase
          .from('order_products')
          .select('id', { count: 'exact', head: true })
          .abortSignal(signal)
          .eq('payment_status', 'paid')
          .eq('pickup_status', 'pending_pickup'),
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
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
}
