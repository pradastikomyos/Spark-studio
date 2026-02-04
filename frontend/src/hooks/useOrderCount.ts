import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useOrderCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, initialized } = useAuth();

  const fetchOrderCount = useCallback(async () => {
    const userId = user?.id ?? null;
    
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      // Count ACTIVE orders: orders that need user attention
      // This includes PENDING (unpaid) + AKTIF (paid, waiting pickup)
      // Matches the 3-tab system in MyProductOrdersPage
      const { data: orders, error } = await supabase
        .from('order_products')
        .select('id, payment_status, pickup_status, status')
        .eq('user_id', userId);

      if (error) {
        setCount(0);
        return;
      }

      // Count: PENDING orders (unpaid) + AKTIF orders (paid, waiting pickup)
      let pendingCount = 0;
      let activeCount = 0;

      (orders || []).forEach((order) => {
        const paymentStatus = (order.payment_status ?? '').toLowerCase();
        const pickupStatus = (order.pickup_status ?? '').toLowerCase();
        const status = (order.status ?? '').toLowerCase();

        // Skip expired/cancelled orders
        if (status === 'cancelled' || status === 'expired' || status === 'completed') {
          return;
        }
        if (pickupStatus === 'completed' || pickupStatus === 'expired' || pickupStatus === 'cancelled') {
          return;
        }
        if (paymentStatus === 'failed' || paymentStatus === 'refunded') {
          return;
        }

        // PENDING: Unpaid orders
        if (paymentStatus === 'unpaid' || paymentStatus === 'pending') {
          pendingCount++;
          return;
        }

        // AKTIF: Paid orders waiting for pickup
        if (paymentStatus === 'paid') {
          activeCount++;
        }
      });

      // Total badge = pending + active (both need user attention)
      setCount(pendingCount + activeCount);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!initialized) return;

    fetchOrderCount();

    const userId = user?.id ?? null;
    if (!userId) return;

    const subscription = supabase
      .channel('order_products_badge_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_products', filter: `user_id=eq.${userId}` },
        () => {
          fetchOrderCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized, user?.id, fetchOrderCount]);

  return { count, loading, refetch: fetchOrderCount };
};

