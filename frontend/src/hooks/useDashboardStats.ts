import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type DashboardStats = {
  totalPurchasedTickets: number;
  totalEntered: number;
  totalNoShow: number;
  totalGiftsExchanged: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  processingOrders: number;
};

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async ({ signal }) => {
      const [
        totalPurchased,
        totalUsed,
        totalRedeemed,
        totalOrders,
        pendingOrders,
        paidOrders,
        processingOrders,
      ] = await Promise.all([
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }).abortSignal(signal),
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('status', 'used'),
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }).abortSignal(signal).not('redeemed_merchandise_at', 'is', null),
        supabase.from('orders').select('*', { count: 'exact', head: true }).abortSignal(signal),
        supabase.from('orders').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('status', 'paid'),
        supabase.from('order_products').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('status', 'processing'),
      ]);

      if (
        totalPurchased.error ||
        totalUsed.error ||
        totalRedeemed.error ||
        totalOrders.error ||
        pendingOrders.error ||
        paidOrders.error ||
        processingOrders.error
      ) {
        const err = new Error('Failed to load dashboard stats') as APIError;
        err.status = 500;
        err.info = {
          totalPurchased: totalPurchased.error,
          totalUsed: totalUsed.error,
          totalRedeemed: totalRedeemed.error,
          totalOrders: totalOrders.error,
          pendingOrders: pendingOrders.error,
          paidOrders: paidOrders.error,
          processingOrders: processingOrders.error,
        };
        throw err;
      }

      return {
        totalPurchasedTickets: totalPurchased.count || 0,
        totalEntered: totalUsed.count || 0,
        totalNoShow: (totalPurchased.count || 0) - (totalUsed.count || 0),
        totalGiftsExchanged: totalRedeemed.count || 0,
        totalOrders: totalOrders.count || 0,
        pendingOrders: pendingOrders.count || 0,
        paidOrders: paidOrders.count || 0,
        processingOrders: processingOrders.count || 0,
      };
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
}
