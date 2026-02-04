import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useOrderCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;

    const userId = user?.id ?? null;

    const fetchOrderCount = async () => {
      if (!userId) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        const nowIso = new Date().toISOString();
        const { count: orderCount, error } = await supabase
          .from('order_products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('payment_status', 'unpaid')
          .eq('status', 'awaiting_payment')
          .gt('payment_expired_at', nowIso);

        if (error) {
          setCount(0);
        } else {
          setCount(orderCount || 0);
        }
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderCount();

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
  }, [initialized, user?.id]);

  return { count, loading };
};

