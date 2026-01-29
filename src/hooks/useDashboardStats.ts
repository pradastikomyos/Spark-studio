import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';

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
  return useSWR<DashboardStats>(
    'dashboard-stats',
    async () => {
      const [
        totalPurchased,
        totalUsed,
        totalRedeemed,
        totalOrders,
        pendingOrders,
        paidOrders,
        processingOrders,
      ] = await Promise.all([
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }).eq('status', 'used'),
        supabase.from('purchased_tickets').select('*', { count: 'exact', head: true }).not('redeemed_merchandise_at', 'is', null),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('order_products').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
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
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );
}
