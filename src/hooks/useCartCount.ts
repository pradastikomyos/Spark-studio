import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, initialized } = useAuth();

  useEffect(() => {
    // Wait for auth to be initialized
    if (!initialized) {
      return;
    }

    const fetchCartCount = async () => {
      if (!user?.id) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        // Count reservations with status 'pending' (items in cart)
        const { count: cartCount, error: cartError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (cartError) {
          setCount(0);
        } else {
          setCount(cartCount || 0);
        }
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCartCount();

    // Subscribe to changes in reservations
    const subscription = supabase
      .channel('reservations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchCartCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, initialized]);

  return { count, loading };
};
