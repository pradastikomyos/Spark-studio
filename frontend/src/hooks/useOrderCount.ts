import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
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

    const { signal: timeoutSignal, cleanup } = createQuerySignal(undefined, 10000);
    try {
      // Count ACTIVE orders server-side: no row data downloaded, only counts.
      // Matches the 3-tab system in MyProductOrdersPage.

      // PENDING: unpaid orders that aren't cancelled/expired
      const { count: pendingCount, error: pendingError } = await supabase
        .from('order_products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('payment_status', ['unpaid', 'pending'])
        .not('status', 'in', '("cancelled","expired","completed")')
        .not('pickup_status', 'in', '("completed","expired","cancelled")')
        .abortSignal(timeoutSignal);

      if (pendingError) {
        setCount(0);
        return;
      }

      // AKTIF: paid orders waiting for pickup
      const { count: activeCount, error: activeError } = await supabase
        .from('order_products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .not('status', 'in', '("cancelled","expired","completed")')
        .not('pickup_status', 'in', '("completed","expired","cancelled")')
        .abortSignal(timeoutSignal);

      if (activeError) {
        setCount(0);
        return;
      }

      // Total badge = pending + active (both need user attention)
      setCount((pendingCount ?? 0) + (activeCount ?? 0));
    } catch {
      setCount(0);
    } finally {
      cleanup();
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

